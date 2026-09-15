import { blake3 } from '@noble/hashes/blake3.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { parsePublishedHash, type HashAlgo } from '$lib/hash-parse';

export interface HashDigest {
	md5: string;
	sha1: string;
	sha256: string;
	sha512: string;
	blake3: string;
	bytes: number;
}

function createHashers() {
	return {
		md5: new Bun.CryptoHasher('md5'),
		sha1: new Bun.CryptoHasher('sha1'),
		sha256: new Bun.CryptoHasher('sha256'),
		sha512: new Bun.CryptoHasher('sha512'),
		b3: blake3.create({}),
		bytes: 0
	};
}

function updateHashers(h: ReturnType<typeof createHashers>, data: Uint8Array): void {
	const chunk = data.slice();
	h.md5.update(chunk);
	h.sha1.update(chunk);
	h.sha256.update(chunk);
	h.sha512.update(chunk);
	h.b3.update(chunk);
	h.bytes += chunk.byteLength;
}

function finishHashers(h: ReturnType<typeof createHashers>): HashDigest {
	return {
		md5: h.md5.digest('hex'),
		sha1: h.sha1.digest('hex'),
		sha256: h.sha256.digest('hex'),
		sha512: h.sha512.digest('hex'),
		blake3: bytesToHex(h.b3.digest()),
		bytes: h.bytes
	};
}

export async function hashStream(stream: ReadableStream<Uint8Array>): Promise<HashDigest> {
	const h = createHashers();
	const reader = stream.getReader();
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		if (!value?.byteLength) continue;
		updateHashers(h, value);
	}
	return finishHashers(h);
}

export async function hashBytes(data: Uint8Array): Promise<HashDigest> {
	const h = createHashers();
	updateHashers(h, data);
	return finishHashers(h);
}

export async function hashText(text: string): Promise<HashDigest> {
	return hashBytes(new TextEncoder().encode(text));
}

export function matchPublished(
	digest: HashDigest,
	published: string
): { ok: boolean; algo: HashAlgo | null } | null {
	const parsed = parsePublishedHash(published);
	if (!parsed) return null;
	const algos = parsed.algo ? [parsed.algo] : parsed.candidates;
	for (const algo of algos) {
		if (digest[algo] === parsed.hex) return { ok: true, algo };
	}
	return { ok: false, algo: parsed.algo };
}
