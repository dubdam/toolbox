import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, extname, join, resolve } from 'node:path';
import { formatFfmpegTime, parseTime } from '$lib/cut-time';
import type { CutKind, ProbeOk } from '$lib/cut';
import { createJob, getJob, updateJob, type Job } from './jobs';
import { detectBinaries } from './binaries';
import { containedIn } from './safe-name';
import { ensureStorage, toolDir } from './storage';

export type { CutKind, ProbeOk };

export class CutError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CutError';
	}
}

const MEDIA_EXT = new Set([
	'.mp4',
	'.mkv',
	'.webm',
	'.mov',
	'.m4v',
	'.avi',
	'.mp3',
	'.wav',
	'.m4a',
	'.aac',
	'.ogg',
	'.flac',
	'.opus',
	'.wma'
]);

function ffmpegPath(): string | null {
	return detectBinaries().find((b) => b.name === 'ffmpeg')?.path ?? null;
}

function ffprobePath(): string | null {
	return detectBinaries().find((b) => b.name === 'ffprobe')?.path ?? null;
}

function safeBasename(name: string): string {
	const base = basename(name)
		.replace(/[^a-zA-Z0-9._-]+/g, '-')
		.replace(/^\.+/, '');
	return base || 'media';
}

export function isMediaName(name: string): boolean {
	return MEDIA_EXT.has(extname(name).toLowerCase());
}

export function parseFfmpegProgress(line: string): { us: number } | { done: true } | null {
	const t = line.trim();
	if (t === 'progress=end') return { done: true };
	if (t.startsWith('out_time_us=')) {
		const n = Number(t.slice('out_time_us='.length));
		if (Number.isFinite(n) && n >= 0) return { us: n };
	}
	if (t.startsWith('out_time_ms=')) {
		const n = Number(t.slice('out_time_ms='.length));
		if (Number.isFinite(n) && n >= 0) return { us: n };
	}
	return null;
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

interface ProbeJson {
	format?: { duration?: string; format_name?: string; size?: string };
	streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
}

export async function probePath(path: string): Promise<Omit<ProbeOk, 'uploadId' | 'name'>> {
	const probe = ffprobePath();
	if (!probe) throw new CutError('instalá ffprobe (viene con ffmpeg) y recargá');
	const { code, stdout, stderr } = await runCli([
		probe,
		'-v',
		'error',
		'-print_format',
		'json',
		'-show_format',
		'-show_streams',
		path
	]);
	if (code !== 0) throw new CutError(stderr.trim().slice(-400) || 'ffprobe falló');
	let json: ProbeJson;
	try {
		json = JSON.parse(stdout) as ProbeJson;
	} catch {
		throw new CutError('ffprobe no devolvió JSON');
	}
	const duration = Number(json.format?.duration ?? 0);
	if (!Number.isFinite(duration) || duration <= 0) throw new CutError('no pude leer la duración');
	const streams = json.streams ?? [];
	const video = streams.find((s) => s.codec_type === 'video');
	const audio = streams.find((s) => s.codec_type === 'audio');
	const size = Number(json.format?.size ?? 0) || statSync(path).size;
	return {
		duration,
		size,
		format: (json.format?.format_name ?? '').split(',')[0] || extname(path).slice(1).replace('.', ''),
		hasVideo: Boolean(video),
		hasAudio: Boolean(audio),
		width: video?.width ?? null,
		height: video?.height ?? null
	};
}

export async function saveProbe(buf: Uint8Array, originalName: string): Promise<ProbeOk> {
	if (!ffmpegPath()) throw new CutError('instalá ffmpeg y recargá');
	if (!ffprobePath()) throw new CutError('instalá ffprobe (viene con ffmpeg) y recargá');
	if (!isMediaName(originalName)) throw new CutError('soltá un audio o video');

	const uploadId = randomUUID();
	ensureStorage();
	const dir = join(toolDir('cut'), 'inbox', uploadId);
	mkdirSync(dir, { recursive: true });
	const name = safeBasename(originalName);
	const dest = join(dir, name);
	writeFileSync(dest, buf);
	const meta = await probePath(dest);
	return { uploadId, name, ...meta };
}

export function inboxFile(uploadId: string): string | null {
	const root = resolve(join(toolDir('cut'), 'inbox'));
	const dir = resolve(join(root, uploadId));
	if (!containedIn(root, dir) || !existsSync(dir)) return null;
	const files = readdirSync(dir).filter((n) => statSync(join(dir, n)).isFile());
	if (files.length !== 1) return null;
	const target = resolve(join(dir, files[0]!));
	if (!containedIn(dir, target)) return null;
	return target;
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
	return join(dir, candidate);
}

async function consume(
	stream: ReadableStream<Uint8Array> | null,
	onLine: (line: string) => void
): Promise<void> {
	if (!stream) return;
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buf = '';
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		buf += decoder.decode(value, { stream: true });
		const parts = buf.split(/\r?\n/);
		buf = parts.pop() ?? '';
		for (const line of parts) onLine(line);
	}
	if (buf) onLine(buf);
}

async function runCut(
	jobId: string,
	src: string,
	start: number,
	end: number | null,
	kind: CutKind
): Promise<void> {
	const ffmpeg = ffmpegPath();
	if (!ffmpeg) {
		updateJob(jobId, { status: 'error', message: 'no está ffmpeg en PATH' });
		return;
	}

	let duration = 0;
	try {
		duration = (await probePath(src)).duration;
	} catch (err) {
		updateJob(jobId, {
			status: 'error',
			message: err instanceof Error ? err.message : 'ffprobe falló'
		});
		return;
	}

	if (start >= duration) {
		updateJob(jobId, { status: 'error', message: 'el inicio está más allá del final' });
		return;
	}
	const to = end == null ? duration : Math.min(end, duration);
	if (to <= start) {
		updateJob(jobId, { status: 'error', message: 'el fin tiene que ser después del inicio' });
		return;
	}

	const clip = to - start;
	ensureStorage();
	const dir = join(toolDir('cut'), jobId);
	mkdirSync(dir, { recursive: true });
	const stem = safeBasename(basename(src)).replace(/\.[^.]+$/, '') || 'cut';
	const stamp = `${formatFfmpegTime(start).slice(0, 8)}-${formatFfmpegTime(to).slice(0, 8)}`.replace(
		/:/g,
		''
	);
	const ext = kind === 'mp3' ? '.mp3' : extname(src) || '.mp4';
	const dest = uniquePath(dir, `${stem}-${stamp}${ext}`);

	const args = [ffmpeg, '-hide_banner', '-nostdin', '-y'];
	if (start > 0) args.push('-ss', formatFfmpegTime(start));
	args.push('-t', formatFfmpegTime(clip), '-i', src);
	if (kind === 'mp3') {
		args.push('-vn', '-c:a', 'libmp3lame', '-q:a', '2');
	} else {
		args.push('-c', 'copy', '-avoid_negative_ts', 'make_zero');
	}
	args.push('-progress', 'pipe:1', '-nostats', dest);

	updateJob(jobId, { status: 'running', message: 'recortando…', progress: 0 });

	const proc = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });
	let lastErr = '';
	await Promise.all([
		consume(proc.stdout, (line) => {
			const parsed = parseFfmpegProgress(line);
			if (!parsed) return;
			if ('done' in parsed) {
				updateJob(jobId, { progress: 99 });
				return;
			}
			const pct = clip > 0 ? Math.min(99, Math.round((parsed.us / 1_000_000 / clip) * 100)) : 0;
			updateJob(jobId, { progress: pct, message: `recortando… ${pct}%` });
		}),
		consume(proc.stderr, (line) => {
			if (line.trim()) lastErr = line;
		})
	]);
	const code = await proc.exited;
	if (code !== 0 || !existsSync(dest)) {
		updateJob(jobId, {
			status: 'error',
			message: lastErr.trim().slice(-400) || `ffmpeg salió ${code}`
		});
		return;
	}
	updateJob(jobId, { status: 'done', progress: 100, message: 'listo', output_path: dest });
}

export function startCut(uploadId: string, startRaw: string, endRaw: string, kind: CutKind): Job {
	const src = inboxFile(uploadId);
	if (!src) throw new CutError('no está el archivo subido, volvé a soltarlo');
	if (!ffmpegPath()) throw new CutError('instalá ffmpeg y recargá');

	const start = startRaw.trim() ? parseTime(startRaw) : 0;
	const end = endRaw.trim() ? parseTime(endRaw) : null;
	if (startRaw.trim() && start == null) throw new CutError('inicio inválido (probá 00:13:42)');
	if (endRaw.trim() && end == null) throw new CutError('fin inválido (probá 00:17:08)');
	if (start == null) throw new CutError('inicio inválido');
	if (end != null && end <= start) throw new CutError('el fin tiene que ser después del inicio');

	const job = createJob('cut');
	void runCut(job.id, src, start, end, kind).catch((err) => {
		updateJob(job.id, {
			status: 'error',
			message: err instanceof Error ? err.message : 'falló el recorte'
		});
	});
	return job;
}

export function resolveCutFile(jobId: string): string | null {
	const job = getJob(jobId);
	if (!job?.output_path || job.tool !== 'cut') return null;
	const dir = resolve(join(toolDir('cut'), jobId));
	const target = resolve(job.output_path);
	if (!containedIn(dir, target) || !existsSync(target)) return null;
	return target;
}
