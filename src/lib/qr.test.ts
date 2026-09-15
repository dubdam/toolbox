import { describe, expect, test } from 'bun:test';
import jsQR from 'jsqr';
import { encodeQr, matrixToRgba, qrSvg } from './qr';
import { wifiPayload } from './qr-payload';

describe('encodeQr', () => {
	test('roundtrip text through jsQR', () => {
		const qr = encodeQr('hola toolbox');
		expect(qr).not.toBeNull();
		const { pixels, width, height } = matrixToRgba(qr!.data, 6);
		const decoded = jsQR(pixels, width, height);
		expect(decoded?.data).toBe('hola toolbox');
	});

	test('roundtrip wifi payload', () => {
		const payload = wifiPayload({
			ssid: 'Casa',
			password: 'secreto',
			auth: 'WPA',
			hidden: false
		});
		const qr = encodeQr(payload);
		const { pixels, width, height } = matrixToRgba(qr!.data, 6);
		expect(jsQR(pixels, width, height)?.data).toBe(payload);
	});

	test('svg contains a path or rect', () => {
		const svg = qrSvg('abc');
		expect(svg.startsWith('<svg')).toBe(true);
		expect(svg).toContain('</svg>');
	});

	test('empty payload', () => {
		expect(encodeQr('')).toBeNull();
		expect(qrSvg('')).toBe('');
	});
});
