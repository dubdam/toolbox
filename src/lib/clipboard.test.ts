import { describe, expect, test } from 'bun:test';
import { cleanClipboard, countInvisible, detectHtmlSource, stripInvisible } from './clipboard';

describe('stripInvisible', () => {
	test('drops zwsp, bom and curly quotes', () => {
		expect(stripInvisible('a\u200b\u200bb')).toBe('ab');
		expect(stripInvisible('\uFEFFhola')).toBe('hola');
		expect(stripInvisible('“hola”')).toBe('"hola"');
		expect(countInvisible('a\u200bb\uFEFF')).toBe(2);
	});
});

describe('detectHtmlSource', () => {
	test('word / gdocs / notion', () => {
		expect(detectHtmlSource('<p class=MsoNormal>x</p>')).toBe('word');
		expect(detectHtmlSource('<b id="docs-internal-guid-abc">x</b>')).toBe('gdocs');
		expect(detectHtmlSource('<div data-block-id="1">x</div>')).toBe('notion');
	});
});

describe('cleanClipboard', () => {
	test('plain text strips tracking urls', () => {
		const r = cleanClipboard(
			{ text: 'mira https://example.com/a?utm_source=x fin' },
			'plain'
		);
		expect(r.output).toContain('https://example.com/a');
		expect(r.output).not.toContain('utm_source');
		expect(r.urlsCleaned).toBe(1);
		expect(r.hadHtml).toBe(false);
	});

	test('bold number before title gets a space so CommonMark can parse it', () => {
		const html = `<p><b>13.</b>Precio, facturación</p>`;
		const r = cleanClipboard({ text: '', html }, 'markdown');
		expect(r.output).toContain('**13.** Precio');
		expect(r.output).not.toContain('**13.**Precio');
	});

	test('word html to markdown', () => {
		const html = `<html><body><p class=MsoNormal>Hola <b>mundo</b></p><p class=MsoNormal><a href="https://x.com/u?s=20">link</a></p></body></html>`;
		const r = cleanClipboard({ text: 'Hola mundo', html }, 'markdown');
		expect(r.source).toBe('word');
		expect(r.hadHtml).toBe(true);
		expect(r.output).toContain('**mundo**');
		expect(r.output).toContain('[link](https://x.com/u)');
		expect(r.output).not.toContain('s=20');
	});

	test('html to plaintext', () => {
		const html = `<p>uno</p><p>dos <a href="https://example.com/?fbclid=1">sitio</a></p>`;
		const r = cleanClipboard({ text: 'uno dos', html }, 'plain');
		expect(r.output).toContain('uno');
		expect(r.output).toContain('dos');
		expect(r.output).toContain('https://example.com');
		expect(r.output).not.toContain('fbclid');
		expect(r.output).not.toContain('**');
	});

	test('lists and headings', () => {
		const html = `<h1>Título</h1><ul><li>uno</li><li>dos</li></ul>`;
		const r = cleanClipboard({ text: '', html }, 'markdown');
		expect(r.output).toContain('# Título');
		expect(r.output).toContain('- uno');
		expect(r.output).toContain('- dos');
	});

	test('simple table', () => {
		const html = `<table><tr><th>a</th><th>b</th></tr><tr><td>1</td><td>2</td></tr></table>`;
		const r = cleanClipboard({ text: '', html }, 'markdown');
		expect(r.output).toContain('| a | b |');
		expect(r.output).toContain('| 1 | 2 |');
	});

	test('markdown links with utm', () => {
		const r = cleanClipboard(
			{ text: 'ver [nota](https://example.com/a?utm_campaign=z) hoy' },
			'markdown'
		);
		expect(r.output).toBe('ver [nota](https://example.com/a) hoy');
	});
});
