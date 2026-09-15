import { describe, expect, test } from 'bun:test';
import { parsePublishedHash } from './hash-parse';

const SHA256_EMPTY = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const MD5_EMPTY = 'd41d8cd98f00b204e9800998ecf8427e';

describe('parsePublishedHash', () => {
	test('bare sha256 hex', () => {
		const r = parsePublishedHash(SHA256_EMPTY);
		expect(r?.hex).toBe(SHA256_EMPTY);
		expect(r?.algo).toBeNull();
		expect(r?.candidates).toEqual(['sha256', 'blake3']);
	});

	test('sha256sum line', () => {
		const r = parsePublishedHash(`${SHA256_EMPTY}  file.bin`);
		expect(r?.hex).toBe(SHA256_EMPTY);
	});

	test('prefixed', () => {
		expect(parsePublishedHash(`sha256:${SHA256_EMPTY}`)?.algo).toBe('sha256');
		expect(parsePublishedHash(`SHA256 (file.bin) = ${SHA256_EMPTY}`)?.algo).toBe('sha256');
		expect(parsePublishedHash(`MD5: ${MD5_EMPTY}`)?.algo).toBe('md5');
		expect(parsePublishedHash(`blake3 ${SHA256_EMPTY}`)?.algo).toBe('blake3');
	});

	test('uppercase and colons', () => {
		const colon = SHA256_EMPTY.match(/.{2}/g)!.join(':').toUpperCase();
		expect(parsePublishedHash(colon)?.hex).toBe(SHA256_EMPTY);
	});

	test('rejects garbage', () => {
		expect(parsePublishedHash('')).toBeNull();
		expect(parsePublishedHash('zzz')).toBeNull();
		expect(parsePublishedHash('abc')).toBeNull();
	});
});
