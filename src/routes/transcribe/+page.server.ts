import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { TRANSCRIBE_MODELS } from '$lib/transcribe-models';
import { startTranscribe, TranscribeError, resolveTranscriptFile } from '$lib/server/transcribe';
import { revealInExplorer } from '$lib/server/reveal';
import { openaiApiKey } from '$lib/server/env';

const modelSchema = z.enum(TRANSCRIBE_MODELS);

export const actions = {
	start: async ({ request }) => {
		if (!openaiApiKey()) {
			return fail(400, { startError: 'falta OPENAI_API_KEY en .env' });
		}
		const data = await request.formData();
		const file = data.get('file');
		const modelParsed = modelSchema.safeParse(data.get('model') ?? 'gpt-transcribe');
		if (!modelParsed.success) return fail(400, { startError: 'modelo inválido' });
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { startError: 'soltá un audio o video' });
		}
		try {
			const buf = new Uint8Array(await file.arrayBuffer());
			const job = startTranscribe(buf, file.name, modelParsed.data);
			return { jobId: job.id };
		} catch (err) {
			const startError = err instanceof TranscribeError ? err.message : 'no pude empezar';
			return fail(400, { startError });
		}
	},

	reveal: async ({ request }) => {
		const data = await request.formData();
		const jobId = z.string().uuid().safeParse(String(data.get('jobId') ?? ''));
		if (!jobId.success) return fail(400, { revealError: 'job inválido' });
		const target = resolveTranscriptFile(jobId.data);
		if (!target) return fail(400, { revealError: 'no encuentro el transcript' });
		revealInExplorer(target);
		return {};
	}
};
