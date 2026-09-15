export interface TextStats {
	chars: number;
	charsNoWs: number;
	graphemes: number;
	words: number;
	sentences: number;
	paragraphs: number;
	lines: number;
	bytes: number;
	readingMinutes: number;
}

const WORD = /[\p{L}\p{N}]+(?:['’.\-][\p{L}\p{N}]+)*/gu;
const SENTENCE_SPLIT = /(?<=[.!?…])\s+|\n+/;

export function countGraphemes(text: string): number {
	if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
		return [...new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(text)].length;
	}
	return [...text].length;
}

export function countText(text: string): TextStats {
	if (!text) {
		return {
			chars: 0,
			charsNoWs: 0,
			graphemes: 0,
			words: 0,
			sentences: 0,
			paragraphs: 0,
			lines: 0,
			bytes: 0,
			readingMinutes: 0
		};
	}

	const lines = text.split(/\r\n|\n|\r/);
	const words = text.match(WORD)?.length ?? 0;
	const paragraphs = lines.filter((l) => l.trim().length > 0).length;
	const sentences = text
		.split(SENTENCE_SPLIT)
		.map((s) => s.trim())
		.filter((s) => /[\p{L}\p{N}]/u.test(s)).length;

	return {
		chars: text.length,
		charsNoWs: text.replace(/\s+/g, '').length,
		graphemes: countGraphemes(text),
		words,
		sentences,
		paragraphs,
		lines: lines.length,
		bytes: new TextEncoder().encode(text).length,
		readingMinutes: words / 200
	};
}

export function formatCount(n: number): string {
	return n.toLocaleString('es-AR');
}

export function formatReading(minutes: number): string {
	if (minutes <= 0) return '—';
	if (minutes < 1) return 'menos de 1 min';
	if (minutes < 10) return `≈ ${minutes.toFixed(1).replace('.', ',')} min`;
	return `≈ ${Math.round(minutes)} min`;
}
