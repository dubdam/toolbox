import { describe, expect, test } from 'bun:test';
import { flattenMeta, isSensitiveKey } from './meta';

describe('isSensitiveKey', () => {
	test('flags gps and serial', () => {
		expect(isSensitiveKey('GPSLatitude')).toBe(true);
		expect(isSensitiveKey('gps.latitude')).toBe(true);
		expect(isSensitiveKey('SerialNumber')).toBe(true);
		expect(isSensitiveKey('Make')).toBe(false);
	});
});

describe('flattenMeta', () => {
	test('flattens nested objects and marks gps', () => {
		const fields = flattenMeta({
			Make: 'Canon',
			gps: { latitude: -34.6, longitude: -58.4 }
		});
		const keys = fields.map((f) => f.key);
		expect(keys).toContain('Make');
		expect(keys.some((k) => k.toLowerCase().includes('lat'))).toBe(true);
		expect(fields.find((f) => f.key === 'Make')?.sensitive).toBe(false);
		expect(fields.some((f) => f.sensitive)).toBe(true);
	});
});
