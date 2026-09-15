import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { containedIn } from './safe-name';
import {
	allowedDownloadUrl,
	parseYtdlpLine,
	ytdlpFormat,
	type VideoQuality
} from '$lib/download-url';
import { createJob, getJob, updateJob, type Job } from './jobs';
import { detectBinaries } from './binaries';
import { ensureStorage, toolDir } from './storage';

export type DownloadKind = 'video' | 'audio';

export class DownloadError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DownloadError';
	}
}

function findOutput(dir: string): string | null {
	let best: { path: string; size: number } | null = null;
	for (const name of readdirSync(dir)) {
		if (name.endsWith('.part') || name.endsWith('.ytdl') || name.endsWith('.temp')) continue;
		const path = join(dir, name);
		const st = statSync(path);
		if (!st.isFile()) continue;
		if (!best || st.size > best.size) best = { path, size: st.size };
	}
	return best?.path ?? null;
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

async function runDownload(
	jobId: string,
	url: string,
	kind: DownloadKind,
	quality: VideoQuality
): Promise<void> {
	const bins = detectBinaries();
	const ytdlp = bins.find((b) => b.name === 'yt-dlp')?.path;
	const ffmpeg = bins.find((b) => b.name === 'ffmpeg')?.path;
	if (!ytdlp) {
		updateJob(jobId, { status: 'error', message: 'no está yt-dlp en PATH' });
		return;
	}

	ensureStorage();
	const outDir = join(toolDir('downloads'), jobId);
	mkdirSync(outDir, { recursive: true });

	const args = [
		ytdlp,
		'--no-playlist',
		'--newline',
		'--restrict-filenames',
		'--no-mtime',
		'-o',
		join(outDir, '%(title).80s.%(ext)s')
	];
	if (ffmpeg) args.push('--ffmpeg-location', dirname(ffmpeg));
	if (kind === 'audio') {
		args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
	} else {
		const format = ytdlpFormat('video', quality);
		if (format) args.push('-f', format, '--merge-output-format', 'mp4');
	}
	args.push(url);

	updateJob(jobId, { status: 'running', message: 'empezando…', progress: 0 });

	const proc = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });
	const onLine = (line: string) => {
		const parsed = parseYtdlpLine(line);
		if (parsed.error) {
			updateJob(jobId, { status: 'running', message: parsed.error });
			return;
		}
		if (parsed.progress != null) {
			updateJob(jobId, { progress: parsed.progress, message: parsed.message ?? null });
			return;
		}
		if (parsed.message) updateJob(jobId, { message: parsed.message });
	};

	await Promise.all([consume(proc.stdout, onLine), consume(proc.stderr, onLine)]);
	const code = await proc.exited;
	const output = findOutput(outDir);
	if (code !== 0 || !output) {
		updateJob(jobId, {
			status: 'error',
			message: `yt-dlp salió ${code}` + (output ? '' : ', no hay archivo')
		});
		return;
	}
	updateJob(jobId, {
		status: 'done',
		progress: 100,
		message: 'listo',
		output_path: output
	});
}

export function resolveJobFile(jobId: string): string | null {
	const job = getJob(jobId);
	if (!job?.output_path || job.tool !== 'download') return null;
	const dir = resolve(join(toolDir('downloads'), jobId));
	const target = resolve(job.output_path);
	if (!containedIn(dir, target)) return null;
	if (!existsSync(target)) return null;
	return target;
}

export function startDownload(
	rawUrl: string,
	kind: DownloadKind,
	quality: VideoQuality = 'best'
): Job {
	const url = allowedDownloadUrl(rawUrl);
	if (!url) {
		throw new DownloadError('solo URLs de YouTube o X (https)');
	}
	const bins = detectBinaries();
	if (!bins.find((b) => b.name === 'yt-dlp')?.path) {
		throw new DownloadError('instalá yt-dlp y recargá');
	}
	if (kind === 'audio' && !bins.find((b) => b.name === 'ffmpeg')?.path) {
		throw new DownloadError('para audio hace falta ffmpeg');
	}
	const job = createJob('download');
	void runDownload(job.id, url.toString(), kind, quality).catch((err) => {
		updateJob(job.id, {
			status: 'error',
			message: err instanceof Error ? err.message : 'falló la descarga'
		});
	});
	return job;
}
