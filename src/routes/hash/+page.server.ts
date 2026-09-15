import { fail } from '@sveltejs/kit';
import { hashBytes, hashStream, hashText, matchPublished } from '$lib/server/hash';
import type { HashAlgo } from '$lib/hash-parse';

export type HashView = {
	name: string;
	kind: 'file' | 'text';
	bytes: number;
	md5: string;
	sha1: string;
	sha256: string;
	sha512: string;
	blake3: string;
	match: { ok: boolean; algo: HashAlgo | null } | null;
};

export const actions = {
	hash: async ({ request }) => {
		const data = await request.formData();
		const files = data.getAll('files');
		const text = String(data.get('text') ?? '');
		const expected = String(data.get('expected') ?? '');
		const published = expected.trim() ? expected : '';
		const results: HashView[] = [];

		for (const file of files) {
			if (!(file instanceof File) || file.size === 0) continue;
			const digest = await (typeof file.stream === 'function'
				? hashStream(file.stream())
				: hashBytes(new Uint8Array(await file.arrayBuffer())));
			results.push({
				name: file.name,
				kind: 'file',
				...digest,
				match: published ? matchPublished(digest, published) : null
			});
		}

		if (text.length > 0) {
			const digest = await hashText(text);
			results.push({
				name: 'texto',
				kind: 'text',
				...digest,
				match: published ? matchPublished(digest, published) : null
			});
		}

		if (results.length === 0) {
			return fail(400, { message: 'soltá un archivo o pegá un texto' });
		}

		return { results, expected: published };
	}
};
