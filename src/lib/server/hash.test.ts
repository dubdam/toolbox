import { describe, expect, test } from 'bun:test';
import { hashBytes, hashText, matchPublished } from './hash';

const ABC = new TextEncoder().encode('abc');

describe('hashBytes', () => {
	test('known vectors for abc', async () => {
		const d = await hashBytes(ABC);
		expect(d.bytes).toBe(3);
		expect(d.md5).toBe('900150983cd24fb0d6963f7d28e17f72');
		expect(d.sha1).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
		expect(d.sha256).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
		expect(d.sha512).toBe(
			'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f'
		);
		expect(d.blake3).toBe('6437b3ac38465133ffb63b75273a8db548c558465d79db03fd359c6cd5bd9d85');
	});

	test('hashText encodes UTF-8', async () => {
		const d = await hashText('abc');
		expect(d.sha256).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
		const ñ = await hashText('año');
		expect(ñ.bytes).toBe(4);
		expect(ñ.sha256).toBe(
			(await hashBytes(new Uint8Array([0x61, 0xc3, 0xb1, 0x6f]))).sha256
		);
	});
});

describe('matchPublished', () => {
	test('matches sha256 prefix and ambiguous 64-hex', async () => {
		const d = await hashBytes(ABC);
		expect(matchPublished(d, `sha256:${d.sha256}`)).toEqual({ ok: true, algo: 'sha256' });
		expect(matchPublished(d, d.sha256)).toEqual({ ok: true, algo: 'sha256' });
		expect(matchPublished(d, `blake3 ${d.blake3}`)).toEqual({ ok: true, algo: 'blake3' });
		expect(matchPublished(d, 'sha256:' + '0'.repeat(64))).toEqual({ ok: false, algo: 'sha256' });
		expect(matchPublished(d, 'nope')).toBeNull();
	});
});
