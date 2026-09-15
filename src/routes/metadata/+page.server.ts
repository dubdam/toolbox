import { fail } from '@sveltejs/kit';
import { join, resolve } from 'node:path';
import { inspectFile, MetadataError, stripStored, type InspectResult } from '$lib/server/metadata';
import { revealInExplorer } from '$lib/server/reveal';
import { containedIn, safeOutputName } from '$lib/server/safe-name';
import { toolDir } from '$lib/server/storage';

export type InspectView = InspectResult;

export const actions = {
	inspect: async ({ request }) => {
		const data = await request.formData();
		const file = data.get('file');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { message: 'soltá una foto, video o audio' });
		}
		const buf = new Uint8Array(await file.arrayBuffer());
		try {
			const result = await inspectFile(buf, file.name);
			return { result };
		} catch (err) {
			const message = err instanceof MetadataError ? err.message : 'no pude leer metadatos';
			return fail(400, { message });
		}
	},

	strip: async ({ request }) => {
		const data = await request.formData();
		const name = safeOutputName(String(data.get('name') ?? ''));
		if (!name) return fail(400, { message: 'nombre inválido' });
		try {
			const result = await stripStored(name);
			return { result, stripped: true };
		} catch (err) {
			const message = err instanceof MetadataError ? err.message : 'no pude sacar metadatos';
			return fail(400, { message });
		}
	},

	reveal: async ({ request }) => {
		const data = await request.formData();
		const name = safeOutputName(String(data.get('name') ?? ''));
		if (!name) return fail(400, { message: 'nombre inválido' });
		const dir = resolve(toolDir('metadata'));
		const target = resolve(join(dir, name));
		if (!containedIn(dir, target)) return fail(400, { message: 'nombre inválido' });
		revealInExplorer(target);
		return {};
	}
};
