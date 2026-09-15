import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import OpenAI, { toFile } from 'openai';
import { openaiApiKey } from './env';
import { createJob, getJob, updateJob, type Job } from './jobs';
import { detectBinaries } from './binaries';
import { containedIn } from './safe-name';
import { ensureStorage, toolDir } from './storage';
import type { TranscribeModel } from '$lib/transcribe-models';

const MAX_BYTES = 24 * 1024 * 1024;

export class TranscribeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TranscribeError';
	}
}

function ffmpegPath(): string | null {
	return detectBinaries().find((b) => b.name === 'ffmpeg')?.path ?? null;
}

function isVideoName(name: string): boolean {
	return ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v'].includes(extname(name).toLowerCase());
}

async function runCli(cmd: string[]): Promise<{ code: number; stderr: string }> {
	const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' });
	const [, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited
	]);
	return { code, stderr };
}

async function extractAudio(src: string, dest: string): Promise<void> {
	const ffmpeg = ffmpegPath();
	if (!ffmpeg) throw new TranscribeError('para video hace falta ffmpeg');
	const { code, stderr } = await runCli([
		ffmpeg,
		'-y',
		'-i',
		src,
		'-vn',
		'-ac',
		'1',
		'-ar',
		'16000',
		'-c:a',
		'libmp3lame',
		'-b:a',
		'64k',
		dest
	]);
	if (code !== 0 || !existsSync(dest)) {
		throw new TranscribeError(stderr.trim().slice(-400) || 'ffmpeg no pudo extraer audio');
	}
}

async function runTranscribe(jobId: string, storedName: string, model: TranscribeModel): Promise<void> {
	const key = openaiApiKey();
	if (!key) {
		updateJob(jobId, { status: 'error', message: 'falta OPENAI_API_KEY en .env' });
		return;
	}

	const dir = join(toolDir('transcribe'), jobId);
	const src = join(dir, storedName);
	if (!existsSync(src)) {
		updateJob(jobId, { status: 'error', message: 'no está el archivo subido' });
		return;
	}

	let audioPath = src;
	const size = (await Bun.file(src).stat()).size;
	if (isVideoName(storedName) || size > MAX_BYTES) {
		updateJob(jobId, { status: 'running', progress: 20, message: 'extrayendo audio…' });
		const mp3 = join(dir, 'audio.mp3');
		await extractAudio(src, mp3);
		audioPath = mp3;
	}

	const audioSize = (await Bun.file(audioPath).stat()).size;
	if (audioSize > MAX_BYTES) {
		updateJob(jobId, {
			status: 'error',
			message: `el audio pesa ${(audioSize / (1024 * 1024)).toFixed(1)} MB; el límite de OpenAI es 25 MB`
		});
		return;
	}

	updateJob(jobId, { status: 'running', progress: 55, message: `enviando a ${model}…` });

	const client = new OpenAI({ apiKey: key });
	const filename = audioPath.endsWith('.mp3') ? 'audio.mp3' : storedName;
	const file = await toFile(createReadStream(audioPath), filename);
	const res = await client.audio.transcriptions.create({
		file,
		model,
		response_format: 'json'
	});
	const text = res.text?.trim() ?? '';
	const outPath = join(dir, 'transcript.txt');
	writeFileSync(outPath, text, 'utf8');
	updateJob(jobId, {
		status: 'done',
		progress: 100,
		message: 'listo',
		output_path: outPath
	});
}

export function startTranscribe(
	buf: Uint8Array,
	originalName: string,
	model: TranscribeModel
): Job {
	if (!openaiApiKey()) {
		throw new TranscribeError('falta OPENAI_API_KEY en .env');
	}
	ensureStorage();
	const job = createJob('transcribe');
	const dir = join(toolDir('transcribe'), job.id);
	mkdirSync(dir, { recursive: true });
	const ext = extname(originalName) || '.bin';
	const storedName = `input${ext.toLowerCase()}`;
	writeFileSync(join(dir, storedName), buf);
	updateJob(job.id, { status: 'queued', message: 'en cola', progress: 5 });
	void runTranscribe(job.id, storedName, model).catch((err) => {
		updateJob(job.id, {
			status: 'error',
			message: err instanceof Error ? err.message : 'falló la transcripción'
		});
	});
	return job;
}

export function resolveTranscriptFile(jobId: string): string | null {
	const job = getJob(jobId);
	if (!job?.output_path || job.tool !== 'transcribe') return null;
	const dir = resolve(join(toolDir('transcribe'), jobId));
	const target = resolve(job.output_path);
	if (!containedIn(dir, target)) return null;
	if (!existsSync(target)) return null;
	return target;
}

export function readTranscript(jobId: string): string | null {
	const path = resolveTranscriptFile(jobId);
	if (!path) return null;
	return readFileSync(path, 'utf8');
}
