import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { getJob } from './jobs';
import { parseFfmpegProgress, probePath, resolveCutFile, saveProbe, startCut } from './cut';

describe('parseFfmpegProgress', () => {
	test('reads out_time_us and end', () => {
		expect(parseFfmpegProgress('out_time_us=1500000')).toEqual({ us: 1_500_000 });
		expect(parseFfmpegProgress('progress=end')).toEqual({ done: true });
		expect(parseFfmpegProgress('frame=12')).toBeNull();
	});
});

describe('ffmpeg cut', () => {
	test(
		'probes and cuts a generated sine to mp3',
		async () => {
			const ffmpeg = Bun.which('ffmpeg');
			const ffprobe = Bun.which('ffprobe');
			if (!ffmpeg || !ffprobe) return;

			const dir = mkdtempSync(join(tmpdir(), 'toolbox-cut-'));
			const src = join(dir, 'sine.mp3');
			try {
				const proc = Bun.spawn(
					[
						ffmpeg,
						'-y',
						'-f',
						'lavfi',
						'-i',
						'sine=frequency=440:duration=5',
						'-c:a',
						'libmp3lame',
						'-q:a',
						'4',
						src
					],
					{ stdout: 'pipe', stderr: 'pipe' }
				);
				expect(await proc.exited).toBe(0);

				const buf = new Uint8Array(await Bun.file(src).arrayBuffer());
				const upload = await saveProbe(buf, 'sine.mp3');
				expect(upload.duration).toBeGreaterThan(4);
				expect(upload.hasAudio).toBe(true);

				const job = startCut(upload.uploadId, '1', '3', 'mp3');
				const t0 = Date.now();
				while (Date.now() - t0 < 20_000) {
					const current = getJob(job.id);
					if (current?.status === 'done' || current?.status === 'error') {
						expect(current.status).toBe('done');
						const out = resolveCutFile(job.id);
						expect(out).toBeTruthy();
						const meta = await probePath(out!);
						expect(meta.duration).toBeGreaterThan(1.4);
						expect(meta.duration).toBeLessThan(2.7);
						return;
					}
					await Bun.sleep(200);
				}
				throw new Error('cut job timed out');
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		},
		25_000
	);
});
