import { error } from '@sveltejs/kit';
import { basename, join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import type { RequestHandler } from './$types';
import { containedIn } from '$lib/server/safe-name';
import { toolDir } from '$lib/server/storage';

export const GET: RequestHandler = ({ params }) => {
	const name = basename(params.name ?? '');
	if (!name || name !== params.name) error(400, 'nombre inválido');
	const dir = resolve(toolDir('compress'));
	const target = resolve(join(dir, name));
	if (!containedIn(dir, target) || !existsSync(target)) error(404, 'no está');
	const body = readFileSync(target);
	const ext = name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
	return new Response(body, {
		headers: {
			'content-type': ext,
			'content-disposition': `attachment; filename="${name}"`
		}
	});
};
