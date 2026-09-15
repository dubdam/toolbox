import { describe, expect, test } from 'bun:test';
import { allowedDownloadUrl, parseYtdlpLine, ytdlpFormat } from './download-url';

describe('allowedDownloadUrl', () => {
	test('accepts youtube and x', () => {
		expect(allowedDownloadUrl('https://www.youtube.com/watch?v=dQw4w9wgGcQ')?.hostname).toBe(
			'www.youtube.com'
		);
		expect(allowedDownloadUrl('https://youtu.be/dQw4w9wgGcQ')).not.toBeNull();
		expect(allowedDownloadUrl('https://x.com/user/status/1')).not.toBeNull();
		expect(allowedDownloadUrl('https://twitter.com/user/status/1')).not.toBeNull();
	});

	test('rejects other hosts and schemes', () => {
		expect(allowedDownloadUrl('https://vimeo.com/1')).toBeNull();
		expect(allowedDownloadUrl('file:///etc/passwd')).toBeNull();
		expect(allowedDownloadUrl('not a url')).toBeNull();
	});
});

describe('ytdlpFormat', () => {
	test('best and height caps', () => {
		expect(ytdlpFormat('video', 'best')).toBe('bv*+ba/b');
		expect(ytdlpFormat('video', '720')).toContain('height<=720');
		expect(ytdlpFormat('audio', '1080')).toBeNull();
	});
});

describe('parseYtdlpLine', () => {
	test('reads percent', () => {
		expect(parseYtdlpLine('[download]  12.3% of  10.00MiB at  1.00MiB/s')).toEqual({
			progress: 12.3,
			message: '[download]  12.3% of  10.00MiB at  1.00MiB/s'
		});
	});

	test('reads errors', () => {
		expect(parseYtdlpLine('ERROR: [twitter] 1: No video')).toEqual({
			error: 'ERROR: [twitter] 1: No video'
		});
	});
});
