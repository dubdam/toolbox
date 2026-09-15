import { error } from '@sveltejs/kit';
import { join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import type { RequestHandler } from './$types';
import { containedIn, safeOutputName } from '$lib/server/safe-name';
import { toolDir } from '$lib/server/storage';

export const GET: RequestHandler = ({ params }) => {
	const name = safeOutputName(params.name ?? '');
	if (!name) error(400, 'nombre inválido');
	const dir = resolve(toolDir('metadata'));
	const target = resolve(join(dir, name));
	if (!containedIn(dir, target) || !existsSync(target)) error(404, 'no está');
	const body = readFileSync(target);
	return new Response(body, {
		headers: {
			'content-type': 'application/octet-stream',
			'content-disposition': `attachment; filename="${name.replace(/"/g, '')}"`
		}
	});
};
