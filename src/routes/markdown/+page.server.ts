import { fail } from '@sveltejs/kit';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { z } from 'zod';
import { revealInExplorer } from '$lib/server/reveal';
import { containedIn } from '$lib/server/safe-name';
import { ensureStorage, toolDir } from '$lib/server/storage';

const nameSchema = z
	.string()
	.min(1)
	.max(200)
	.regex(/^[a-zA-Z0-9._-]+$/);

const contentSchema = z.string();

function uniqueName(dir: string, name: string): string {
	const givenExt = extname(name);
	const ext = givenExt || '.md';
	const stem = (givenExt ? name.slice(0, -givenExt.length) : name) || 'nota';
	let candidate = `${stem}${ext}`;
	if (!/\.(md|markdown)$/i.test(candidate)) candidate = `${candidate}.md`;
	let n = 2;
	while (existsSync(join(dir, candidate))) {
		candidate = `${stem}-${n}${ext}`;
		n += 1;
	}
	return candidate;
}

export const actions = {
	save: async ({ request }) => {
		const data = await request.formData();
		const contentParsed = contentSchema.safeParse(data.get('content'));
		if (!contentParsed.success) return fail(400, { message: 'contenido inválido' });
		const rawName = String(data.get('name') ?? 'nota.md');
		const safe = basename(rawName).replace(/[^a-zA-Z0-9._-]+/g, '-') || 'nota.md';
		ensureStorage();
		const dir = toolDir('markdown');
		mkdirSync(dir, { recursive: true });
		const outputName = uniqueName(dir, safe);
		writeFileSync(join(dir, outputName), contentParsed.data, 'utf8');
		return { savedAs: outputName };
	},

	reveal: async ({ request }) => {
		const data = await request.formData();
		const parsed = nameSchema.safeParse(data.get('name'));
		if (!parsed.success) return fail(400, { message: 'nombre inválido' });
		const dir = resolve(toolDir('markdown'));
		const target = resolve(join(dir, basename(parsed.data)));
		if (!containedIn(dir, target)) return fail(400, { message: 'nombre inválido' });
		revealInExplorer(target);
		return {};
	}
};
