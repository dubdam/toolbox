import { describe, expect, test } from 'bun:test';
import { looksEscaped, unescapeMarkdown } from './md-unescape';

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
