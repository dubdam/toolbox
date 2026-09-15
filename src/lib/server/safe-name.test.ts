import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { containedIn } from './safe-name';

describe('containedIn', () => {
	test('allows filenames that start with dots', () => {
		const dir = join('storage', 'downloads', 'job');
		const file = join(dir, 'video_por_....mp4');
		expect(containedIn(dir, file)).toBe(true);
	});

	test('rejects parent escape', () => {
		const dir = join('storage', 'downloads', 'job');
		expect(containedIn(dir, join(dir, '..', 'other.txt'))).toBe(false);
	});
});
