import { fail } from '@sveltejs/kit';
import { basename } from 'node:path';
import { z } from 'zod';
import type { CutKind } from '$lib/cut';
import { CutError, resolveCutFile, saveProbe, startCut } from '$lib/server/cut';
import { revealInExplorer } from '$lib/server/reveal';

const kindSchema = z.enum(['copy', 'mp3']);

export const actions = {
	probe: async ({ request }) => {
		const data = await request.formData();
		const file = data.get('file');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { probeError: 'soltá un audio o video' });
		}
		try {
			const buf = new Uint8Array(await file.arrayBuffer());
			const upload = await saveProbe(buf, file.name);
			return { upload };
		} catch (err) {
			const probeError = err instanceof CutError ? err.message : 'no pude inspeccionar';
			return fail(400, { probeError });
		}
	},

	start: async ({ request }) => {
		const data = await request.formData();
		const uploadId = z.string().uuid().safeParse(String(data.get('uploadId') ?? ''));
		const kindParsed = kindSchema.safeParse(data.get('kind') ?? 'copy');
		if (!uploadId.success) return fail(400, { startError: 'volvé a soltar el archivo' });
		if (!kindParsed.success) return fail(400, { startError: 'elegí copia o MP3' });
		try {
			const job = startCut(
				uploadId.data,
				String(data.get('start') ?? ''),
				String(data.get('end') ?? ''),
				kindParsed.data as CutKind
			);
			return { jobId: job.id };
		} catch (err) {
			const startError = err instanceof CutError ? err.message : 'no pude empezar';
			return fail(400, { startError });
		}
	},

	reveal: async ({ request }) => {
		const data = await request.formData();
		const jobId = z.string().uuid().safeParse(String(data.get('jobId') ?? ''));
		if (!jobId.success) return fail(400, { revealError: 'job inválido' });
		const target = resolveCutFile(jobId.data);
		if (!target) return fail(400, { revealError: 'no encuentro el archivo' });
		revealInExplorer(target);
		return { revealed: basename(target) };
	}
};
