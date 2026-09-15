import { describe, expect, test } from 'bun:test';
import { fixFlankingEmphasis, looksBrokenEmphasis, looksEscaped, unescapeMarkdown } from './md-unescape';

describe('unescapeMarkdown', () => {
	test('bullet + escaped heading', () => {
		expect(unescapeMarkdown('• \\## Acceso y primeros pasos\n\\- ¿Cómo ingreso?')).toBe(
			'## Acceso y primeros pasos\n- ¿Cómo ingreso?'
		);
	});

	test('strips a backslash before each hash', () => {
		expect(unescapeMarkdown('\\#\\# Acceso')).toBe('## Acceso');
	});

	test('strips several backslashes', () => {
		expect(unescapeMarkdown('\\\\## Acceso')).toBe('## Acceso');
	});

	test('converts unicode bullets to lists', () => {
		expect(unescapeMarkdown('• uno\n• dos')).toBe('- uno\n- dos');
	});

	test('leaves fenced code alone', () => {
		const src = '```\n\\## not a heading\n```';
		expect(unescapeMarkdown(src)).toBe(src);
	});

	test('does not touch already-valid markdown', () => {
		const src = '## Título\n\n- item\n';
		expect(unescapeMarkdown(src)).toBe(src);
	});
});

describe('looksEscaped', () => {
	test('detects backslash-hash', () => {
		expect(looksEscaped('• \\## Acceso\n\\- item')).toBe(true);
	});

	test('ignores normal markdown', () => {
		expect(looksEscaped('## Título\n\n- item\n')).toBe(false);
	});
});

describe('fixFlankingEmphasis', () => {
	test('inserts space after **13.** so CommonMark can bold it', () => {
		expect(fixFlankingEmphasis('**13.**Precio, facturación')).toBe('**13.** Precio, facturación');
		expect(looksBrokenEmphasis('**13.**Precio')).toBe(true);
		expect(looksBrokenEmphasis('**13.** Precio')).toBe(false);
	});

	test('leaves **foo**bar alone', () => {
		expect(fixFlankingEmphasis('**foo**bar')).toBe('**foo**bar');
	});

	test('skips fenced code', () => {
		const src = '```\n**13.**Precio\n```';
		expect(fixFlankingEmphasis(src)).toBe(src);
	});
});
