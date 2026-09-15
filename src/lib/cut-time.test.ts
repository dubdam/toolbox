import { describe, expect, test } from 'bun:test';
import { formatClock, formatFfmpegTime, parseTime } from './cut-time';

describe('parseTime', () => {
	test('plain seconds', () => {
		expect(parseTime('0')).toBe(0);
		expect(parseTime('90')).toBe(90);
		expect(parseTime('13.5')).toBe(13.5);
	});

	test('mm:ss and hh:mm:ss', () => {
		expect(parseTime('13:42')).toBe(822);
		expect(parseTime('00:13:42')).toBe(822);
		expect(parseTime('1:13:42')).toBe(4422);
		expect(parseTime('90:00')).toBe(5400);
		expect(parseTime('00:13:42.5')).toBe(822.5);
	});

	test('rejects garbage', () => {
		expect(parseTime('')).toBeNull();
		expect(parseTime('  ')).toBeNull();
		expect(parseTime('1:2:3:4')).toBeNull();
		expect(parseTime('13:99')).toBeNull();
		expect(parseTime('1:60:00')).toBeNull();
		expect(parseTime('nope')).toBeNull();
	});
});

describe('format', () => {
	test('ffmpeg timestamp', () => {
		expect(formatFfmpegTime(822)).toBe('00:13:42.000');
		expect(formatFfmpegTime(822.5)).toBe('00:13:42.500');
	});

	test('clock', () => {
		expect(formatClock(822)).toBe('13:42');
		expect(formatClock(4422)).toBe('1:13:42');
		expect(formatClock(5)).toBe('0:05');
	});
});
