import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import sharp from 'sharp';
import { compressImage, sniffImage } from './compress';

describe('sniffImage', () => {
	test('detects jpeg and png magic, not extension', () => {
		expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe('jpeg');
		expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
			'png'
		);
		expect(sniffImage(new Uint8Array([0x00, 0x00, 0x00, 0x00]))).toBeNull();
	});
});

describe('compressImage', () => {
	test('writes a smaller png to the out dir', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'toolbox-compress-'));
		try {
			const input = await sharp({
				create: { width: 120, height: 80, channels: 3, background: { r: 180, g: 40, b: 40 } }
			})
				.png()
				.toBuffer();
			const result = await compressImage(input, 'photo.PNG', dir);
			expect(result.format).toBe('png');
			expect(result.outputName).toBe('photo-min.png');
			expect(result.outputBytes).toBeLessThanOrEqual(result.originalBytes);
			expect(readFileSync(join(dir, result.outputName)).length).toBe(result.outputBytes);
			expect(sniffImage(readFileSync(join(dir, result.outputName)))).toBe('png');
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	test('rejects non-images even with a .png name', async () => {
		await expect(compressImage(new Uint8Array([1, 2, 3, 4]), 'x.png')).rejects.toThrow(
			/PNG o JPG/
		);
	});
});
