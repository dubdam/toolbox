import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { getJob } from '$lib/server/jobs';

export const GET: RequestHandler = ({ params }) => {
	const id = z.string().uuid().safeParse(params.id);
	if (!id.success) error(400, 'id inválido');
	const job = getJob(id.data);
	if (!job || job.tool !== 'cut') error(404, 'no está');

	const encoder = new TextEncoder();
	let timer: ReturnType<typeof setInterval> | undefined;

	const stream = new ReadableStream({
		start(controller) {
			const send = () => {
				const current = getJob(id.data);
				if (!current) {
					controller.close();
					return;
				}
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(current)}\n\n`));
				if (current.status === 'done' || current.status === 'error') {
					if (timer) clearInterval(timer);
					controller.close();
				}
			};
			send();
			timer = setInterval(send, 400);
		},
		cancel() {
			if (timer) clearInterval(timer);
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache',
			connection: 'keep-alive'
		}
	});
};
