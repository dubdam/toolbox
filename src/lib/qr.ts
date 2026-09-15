import { encode, renderSVG } from 'uqr';

export type QrEcc = 'L' | 'M' | 'Q' | 'H';

export const QR_ECC: Array<{
	id: QrEcc;
	name: string;
	recovery: string;
	when: string;
}> = [
	{
		id: 'L',
		name: 'Baja',
		recovery: '7%',
		when: 'el QR sale más simple. Solo si se ve nítido (una pantalla).'
	},
	{
		id: 'M',
		name: 'Media',
		recovery: '15%',
		when: 'la de siempre. Impresión normal, foto de cerca.'
	},
	{
		id: 'Q',
		name: 'Alta',
		recovery: '25%',
		when: 'imprimir chico, foto de lejos, o si se puede manchar.'
	},
	{
		id: 'H',
		name: 'Máxima',
		recovery: '30%',
		when: 'sticker, fotocopia, logo en el medio. El código se ve más cargado.'
	}
];

const DEFAULTS = { ecc: 'M' as QrEcc, border: 2 };

export function encodeQr(payload: string, ecc: QrEcc = 'M') {
	if (!payload) return null;
	return encode(payload, { ...DEFAULTS, ecc });
}

export function qrSvg(payload: string, ecc: QrEcc = 'M'): string {
	if (!payload) return '';
	return renderSVG(payload, { ...DEFAULTS, ecc, pixelSize: 8 });
}

export function matrixToRgba(
	data: boolean[][],
	scale = 8
): { pixels: Uint8ClampedArray; width: number; height: number } {
	const n = data.length;
	const w = n * scale;
	const pixels = new Uint8ClampedArray(w * w * 4);
	for (let y = 0; y < n; y++) {
		const row = data[y]!;
		for (let x = 0; x < n; x++) {
			const v = row[x] ? 0 : 255;
			for (let dy = 0; dy < scale; dy++) {
				for (let dx = 0; dx < scale; dx++) {
					const i = ((y * scale + dy) * w + (x * scale + dx)) * 4;
					pixels[i] = v;
					pixels[i + 1] = v;
					pixels[i + 2] = v;
					pixels[i + 3] = 255;
				}
			}
		}
	}
	return { pixels, width: w, height: w };
}
