import { fail } from '@sveltejs/kit';
import { basename, join, resolve } from 'node:path';
import { z } from 'zod';
import { compressImage, CompressError, type CompressOk } from '$lib/server/compress';
import { revealInExplorer } from '$lib/server/reveal';
import { containedIn } from '$lib/server/safe-name';
import { toolDir } from '$lib/server/storage';

const nameSchema = z
	.string()
	.min(1)
	.max(200)
	.regex(/^[a-zA-Z0-9._-]+$/);

export type CompressView = Omit<CompressOk, 'outputPath'>;

export const actions = {
	compress: async ({ request }) => {
		const data = await request.formData();
		const files = data.getAll('images');
		if (files.length === 0) {
			return fail(400, { message: 'soltá o elegí un PNG o JPG' });
		}

		const results: CompressView[] = [];
		const errors: string[] = [];

		for (const file of files) {
			if (!(file instanceof File) || file.size === 0) continue;
			const buf = new Uint8Array(await file.arrayBuffer());
			try {
				const result = await compressImage(buf, file.name);
				results.push({
					originalName: result.originalName,
					outputName: result.outputName,
					originalBytes: result.originalBytes,
					outputBytes: result.outputBytes,
					width: result.width,
					height: result.height,
					format: result.format,
					keptOriginal: result.keptOriginal
				});
			} catch (err) {
				const msg = err instanceof CompressError ? err.message : 'no pude comprimir';
				errors.push(`${file.name}: ${msg}`);
			}
		}

		if (results.length === 0) {
			return fail(400, { message: errors[0] ?? 'soltá o elegí un PNG o JPG' });
		}

		return { results, errors };
	},

	reveal: async ({ request }) => {
		const data = await request.formData();
		const parsed = nameSchema.safeParse(data.get('name'));
		if (!parsed.success) return fail(400, { message: 'nombre inválido' });
		const dir = resolve(toolDir('compress'));
		const target = resolve(join(dir, basename(parsed.data)));
		if (!containedIn(dir, target)) return fail(400, { message: 'nombre inválido' });
		revealInExplorer(target);
		return {};
	}
};
