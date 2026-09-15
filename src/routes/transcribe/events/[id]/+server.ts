import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { getJob } from '$lib/server/jobs';

export const GET: RequestHandler = ({ params }) => {
	const id = z.string().uuid().safeParse(params.id);
	if (!id.success) error(400, 'id inválido');
	if (!getJob(id.data)) error(404, 'no está');

	const encoder = new TextEncoder();
	let timer: ReturnType<typeof setInterval> | undefined;

	const stream = new ReadableStream({
		start(controller) {
			const send = () => {
				const job = getJob(id.data);
				if (!job) {
					controller.close();
					return;
				}
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(job)}\n\n`));
				if (job.status === 'done' || job.status === 'error') {
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
