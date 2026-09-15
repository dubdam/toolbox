import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';
import { ensureStorage, toolDir } from './storage';

export type ImageFormat = 'jpeg' | 'png';

export interface CompressOk {
	originalName: string;
	outputName: string;
	outputPath: string;
	originalBytes: number;
	outputBytes: number;
	width: number;
	height: number;
	format: ImageFormat;
	keptOriginal: boolean;
}

export class CompressError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CompressError';
	}
}

export function sniffImage(buf: Uint8Array): ImageFormat | null {
	if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
	if (
		buf.length >= 8 &&
		buf[0] === 0x89 &&
		buf[1] === 0x50 &&
		buf[2] === 0x4e &&
		buf[3] === 0x47 &&
		buf[4] === 0x0d &&
		buf[5] === 0x0a &&
		buf[6] === 0x1a &&
		buf[7] === 0x0a
	) {
		return 'png';
	}
	return null;
}

export function safeBasename(name: string): string {
	const base = basename(name).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^\.+/, '');
	return base || 'image';
}

function outputName(originalName: string, format: ImageFormat): string {
	const safe = safeBasename(originalName);
	const stem = safe.replace(/\.[^.]+$/, '') || 'image';
	const ext = format === 'jpeg' ? '.jpg' : '.png';
	return `${stem}-min${ext}`;
}

function uniquePath(dir: string, name: string): string {
	const ext = extname(name);
	const stem = name.slice(0, name.length - ext.length);
	let candidate = name;
	let n = 2;
	while (existsSync(join(dir, candidate))) {
		candidate = `${stem}-${n}${ext}`;
		n += 1;
	}
	return candidate;
}

export async function compressImage(
	input: Uint8Array,
	originalName: string,
	outDir = toolDir('compress')
): Promise<CompressOk> {
	const format = sniffImage(input);
	if (!format) {
		throw new CompressError('solo PNG o JPG (se mira el archivo, no la extensión)');
	}

	ensureStorage();
	mkdirSync(outDir, { recursive: true });

	const image = sharp(input, { failOn: 'none' });
	const meta = await image.metadata();
	const pipeline =
		format === 'jpeg'
			? image.jpeg({ quality: 80, mozjpeg: true })
			: image.png({ compressionLevel: 9, effort: 10, palette: true, quality: 80 });

	const compressed = await pipeline.toBuffer({ resolveWithObject: true });
	const keptOriginal = compressed.data.length >= input.length;
	const outBuf = keptOriginal ? Buffer.from(input) : compressed.data;
	const name = uniquePath(outDir, outputName(originalName, format));
	const outputPath = join(outDir, name);
	writeFileSync(outputPath, outBuf);

	return {
		originalName,
		outputName: name,
		outputPath,
		originalBytes: input.length,
		outputBytes: outBuf.length,
		width: compressed.info.width || meta.width || 0,
		height: compressed.info.height || meta.height || 0,
		format,
		keptOriginal
	};
}
