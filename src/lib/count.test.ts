import { describe, expect, test } from 'bun:test';
import { countText } from './count';

describe('countText', () => {
	test('empty', () => {
		expect(countText('')).toEqual({
			chars: 0,
			charsNoWs: 0,
			graphemes: 0,
			words: 0,
			sentences: 0,
			paragraphs: 0,
			lines: 0,
			bytes: 0,
			readingMinutes: 0
		});
	});

	test('spanish paragraph', () => {
		const t = 'Hola, mundo. ¿Cómo estás?';
		const s = countText(t);
		expect(s.words).toBe(4);
		expect(s.sentences).toBe(2);
		expect(s.paragraphs).toBe(1);
		expect(s.chars).toBe(t.length);
		expect(s.charsNoWs).toBe(t.replace(/\s+/g, '').length);
	});

	test('paragraphs are non-empty lines', () => {
		const s = countText('uno\n\ndos\ntres\n');
		expect(s.paragraphs).toBe(3);
		expect(s.lines).toBe(5);
	});

	test('año is one word and two bytes for ñ', () => {
		const s = countText('año');
		expect(s.words).toBe(1);
		expect(s.chars).toBe(3);
		expect(s.bytes).toBe(4);
		expect(s.graphemes).toBe(3);
	});

	test('hyphenated and apostrophe words', () => {
		expect(countText("e-mail d'Alessandro").words).toBe(2);
	});
});
