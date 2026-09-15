import { error } from '@sveltejs/kit';
import { basename } from 'node:path';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { resolveJobFile } from '$lib/server/download';

export const GET: RequestHandler = ({ params }) => {
	const jobId = z.string().uuid().safeParse(params.jobId);
	if (!jobId.success) error(400, 'job inválido');
	const target = resolveJobFile(jobId.data);
	if (!target) error(404, 'no está');
	const body = readFileSync(target);
	const name = basename(target);
	return new Response(body, {
		headers: {
			'content-type': 'application/octet-stream',
			'content-disposition': `attachment; filename="${name.replace(/"/g, '')}"`
		}
	});
};
