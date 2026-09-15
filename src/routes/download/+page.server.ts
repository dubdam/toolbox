import { fail } from '@sveltejs/kit';
import { basename } from 'node:path';
import { z } from 'zod';
import { VIDEO_QUALITIES } from '$lib/download-url';
import { DownloadError, resolveJobFile, startDownload, type DownloadKind } from '$lib/server/download';
import { revealInExplorer } from '$lib/server/reveal';

const kindSchema = z.enum(['video', 'audio']);
const qualitySchema = z.enum(VIDEO_QUALITIES);

export const actions = {
	start: async ({ request }) => {
		const data = await request.formData();
		const url = String(data.get('url') ?? '');
		const kindParsed = kindSchema.safeParse(data.get('kind') ?? 'video');
		const qualityParsed = qualitySchema.safeParse(data.get('quality') ?? 'best');
		if (!kindParsed.success) return fail(400, { startError: 'elegí video o audio' });
		if (!qualityParsed.success) return fail(400, { startError: 'resolución inválida' });
		try {
			const job = startDownload(url, kindParsed.data as DownloadKind, qualityParsed.data);
			return { jobId: job.id };
		} catch (err) {
			const startError = err instanceof DownloadError ? err.message : 'no pude empezar';
			return fail(400, { startError });
		}
	},

	reveal: async ({ request }) => {
		const data = await request.formData();
		const jobId = z.string().uuid().safeParse(String(data.get('jobId') ?? ''));
		if (!jobId.success) return fail(400, { revealError: 'job inválido' });
		const target = resolveJobFile(jobId.data);
		if (!target) return fail(400, { revealError: 'no encuentro el archivo' });
		revealInExplorer(target);
		return { revealed: basename(target) };
	}
};
