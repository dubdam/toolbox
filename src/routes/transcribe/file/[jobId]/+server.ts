import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { readTranscript, resolveTranscriptFile } from '$lib/server/transcribe';

export const GET: RequestHandler = ({ params, url }) => {
	const jobId = z.string().uuid().safeParse(params.jobId);
	if (!jobId.success) error(400, 'job inválido');
	if (url.searchParams.get('raw') === '1') {
		const text = readTranscript(jobId.data);
		if (text == null) error(404, 'no está');
		return new Response(text, {
			headers: { 'content-type': 'text/plain; charset=utf-8' }
		});
	}
	const target = resolveTranscriptFile(jobId.data);
	if (!target) error(404, 'no está');
	const text = readTranscript(jobId.data) ?? '';
	return new Response(text, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'content-disposition': 'attachment; filename="transcript.txt"'
		}
	});
};
