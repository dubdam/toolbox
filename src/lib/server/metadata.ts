import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import exifr from 'exifr';
import sharp from 'sharp';
import { flattenMeta, type MetaField } from '$lib/meta';
import { sniffImage } from './compress';
import { detectBinaries } from './binaries';
import { ensureStorage, toolDir } from './storage';

export class MetadataError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'MetadataError';
	}
}

export interface InspectResult {
	storedName: string;
	kind: 'image' | 'media' | 'other';
	fields: MetaField[];
	sensitiveCount: number;
	stripHow: 'exiftool' | 'sharp' | 'ffmpeg' | null;
}

function uniqueName(dir: string, name: string): string {
	const ext = extname(name) || '';
	const stem = (ext ? name.slice(0, -ext.length) : name) || 'file';
	let candidate = `${stem}${ext}`;
	let n = 2;
	while (existsSync(join(dir, candidate))) {
		candidate = `${stem}-${n}${ext}`;
		n += 1;
	}
	return candidate;
}

function sanitizeName(original: string): string {
	const base = basename(original).replace(/[^a-zA-Z0-9._-]+/g, '-') || 'file';
	return base.replace(/^\.+/, '') || 'file';
}

async function runCli(cmd: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
	const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' });
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited
	]);
	return { code, stdout, stderr };
}

function bins() {
	const list = detectBinaries();
	return {
		exiftool: list.find((b) => b.name === 'exiftool')?.path ?? null,
		ffmpeg: list.find((b) => b.name === 'ffmpeg')?.path ?? null,
		ffprobe: list.find((b) => b.name === 'ffprobe')?.path ?? null
	};
}

function stripHow(kind: InspectResult['kind']): InspectResult['stripHow'] {
	const b = bins();
	if (b.exiftool) return 'exiftool';
	if (kind === 'image') return 'sharp';
	if (kind === 'media' && b.ffmpeg) return 'ffmpeg';
	return null;
}

async function inspectExiftool(filePath: string): Promise<Record<string, unknown> | null> {
	const tool = bins().exiftool;
	if (!tool) return null;
	const { code, stdout } = await runCli([tool, '-json', '-n', '-charset', 'utf8', filePath]);
	if (code !== 0 || !stdout.trim()) return null;
	try {
		const parsed = JSON.parse(stdout) as unknown;
		if (!Array.isArray(parsed) || !parsed[0] || typeof parsed[0] !== 'object') return null;
		const row = { ...(parsed[0] as Record<string, unknown>) };
		delete row.SourceFile;
		delete row.ExifToolVersion;
		delete row.FileName;
		delete row.Directory;
		delete row.FilePermissions;
		return row;
	} catch {
		return null;
	}
}

async function inspectExifr(buf: Uint8Array): Promise<Record<string, unknown> | null> {
	try {
		const parsed = await exifr.parse(buf, {
			tiff: true,
			xmp: true,
			icc: false,
			iptc: true,
			gps: true,
			interop: true,
			translateKeys: true,
			reviveValues: true
		});
		if (!parsed || typeof parsed !== 'object') return null;
		return parsed as Record<string, unknown>;
	} catch {
		return null;
	}
}

async function inspectFfprobe(filePath: string): Promise<Record<string, unknown> | null> {
	const probe = bins().ffprobe;
	if (!probe) return null;
	const { code, stdout } = await runCli([
		probe,
		'-v',
		'error',
		'-print_format',
		'json',
		'-show_format',
		'-show_streams',
		filePath
	]);
	if (code !== 0 || !stdout.trim()) return null;
	try {
		const parsed = JSON.parse(stdout) as {
			format?: { tags?: Record<string, unknown>; duration?: string; bit_rate?: string };
			streams?: Array<{ codec_type?: string; width?: number; height?: number; tags?: Record<string, unknown> }>;
		};
		const out: Record<string, unknown> = {};
		if (parsed.format?.duration) out.duration = parsed.format.duration;
		if (parsed.format?.bit_rate) out.bit_rate = parsed.format.bit_rate;
		if (parsed.format?.tags) Object.assign(out, parsed.format.tags);
		for (const stream of parsed.streams ?? []) {
			if (stream.width && stream.height) out.resolution = `${stream.width}x${stream.height}`;
			if (stream.codec_type) out[`${stream.codec_type}Codec`] = stream.codec_type;
			if (stream.tags) Object.assign(out, stream.tags);
		}
		return Object.keys(out).length ? out : null;
	} catch {
		return null;
	}
}

function kindOf(buf: Uint8Array, filename: string): InspectResult['kind'] {
	if (sniffImage(buf)) return 'image';
	const ext = extname(filename).toLowerCase();
	if (['.mp4', '.mov', '.webm', '.mkv', '.mp3', '.m4a', '.wav', '.aac', '.ogg'].includes(ext)) {
		return 'media';
	}
	if (buf.length >= 12) {
		const iso = String.fromCharCode(...buf.slice(4, 8));
		if (iso === 'ftyp') return 'media';
		if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'media';
		if (buf[0] === 0xff && (buf[1] === 0xfb || buf[1] === 0xfa || buf[1] === 0xf3)) return 'media';
		if (String.fromCharCode(...buf.slice(0, 3)) === 'ID3') return 'media';
	}
	return 'other';
}

async function readFields(
	filePath: string,
	buf: Uint8Array,
	filename: string
): Promise<Omit<InspectResult, 'storedName'>> {
	const kind = kindOf(buf, filename);
	let raw: Record<string, unknown> | null = await inspectExiftool(filePath);
	if (!raw && kind === 'image') raw = await inspectExifr(buf);
	if (!raw && kind === 'media') raw = await inspectFfprobe(filePath);
	if (!raw && kind === 'image') {
		try {
			const meta = await sharp(buf, { failOn: 'none' }).metadata();
			raw = { format: meta.format, width: meta.width, height: meta.height };
		} catch {
			raw = null;
		}
	}
	const fields = flattenMeta(raw ?? {});
	return {
		kind,
		fields,
		sensitiveCount: fields.filter((f) => f.sensitive).length,
		stripHow: stripHow(kind)
	};
}

export async function inspectFile(buf: Uint8Array, originalName: string): Promise<InspectResult> {
	ensureStorage();
	const dir = toolDir('metadata');
	mkdirSync(dir, { recursive: true });
	const storedName = uniqueName(dir, sanitizeName(originalName));
	const storedPath = join(dir, storedName);
	writeFileSync(storedPath, buf);
	const rest = await readFields(storedPath, buf, originalName);
	return { storedName, ...rest };
}

export async function stripStored(storedName: string): Promise<InspectResult> {
	const dir = toolDir('metadata');
	const src = join(dir, storedName);
	if (!existsSync(src)) throw new MetadataError('no está el original en storage');

	const srcBuf = new Uint8Array(await Bun.file(src).bytes());
	const ext = extname(storedName) || '.bin';
	const stem = storedName.slice(0, storedName.length - ext.length) || 'file';
	const destName = uniqueName(dir, `${stem}-clean${ext}`);
	const dest = join(dir, destName);
	const kind = kindOf(srcBuf, storedName);
	const how = stripHow(kind);
	const b = bins();

	if (b.exiftool) {
		const { code, stderr } = await runCli([b.exiftool, '-all=', '-o', dest, src]);
		if (code !== 0 || !existsSync(dest)) {
			throw new MetadataError(stderr.trim() || 'exiftool no pudo sacar metadatos');
		}
	} else if (how === 'sharp') {
		const format = sniffImage(srcBuf);
		const image = sharp(srcBuf, { failOn: 'none' });
		const out =
			format === 'png'
				? await image.png().toBuffer()
				: await image.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
		writeFileSync(dest, out);
	} else if (how === 'ffmpeg' && b.ffmpeg) {
		const { code, stderr } = await runCli([
			b.ffmpeg,
			'-y',
			'-i',
			src,
			'-map_metadata',
			'-1',
			'-c',
			'copy',
			dest
		]);
		if (code !== 0 || !existsSync(dest)) {
			throw new MetadataError(stderr.trim().slice(-400) || 'ffmpeg no pudo sacar metadatos');
		}
	} else {
		throw new MetadataError('no hay forma de strippear este archivo (instalá exiftool)');
	}

	const cleaned = new Uint8Array(await Bun.file(dest).bytes());
	const rest = await readFields(dest, cleaned, destName);
	return { storedName: destName, ...rest };
}
