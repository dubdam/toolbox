import { describe, expect, test } from 'bun:test';
import { cleanText, cleanUrl } from './urls';

describe('cleanUrl', () => {
	test('strips utm and fbclid', () => {
		const r = cleanUrl('https://example.com/a?utm_source=x&fbclid=abc&keep=1');
		expect(r.output).toBe('https://example.com/a?keep=1');
		expect(r.removed.map((p) => p.name).sort()).toEqual(['fbclid', 'utm_source']);
		expect(r.changed).toBe(true);
	});

	test('strips youtube share id, keeps v', () => {
		const r = cleanUrl('https://www.youtube.com/watch?v=dQw4w9wgGcQ&si=TRACK&feature=share');
		expect(r.output).toBe('https://www.youtube.com/watch?v=dQw4w9wgGcQ');
	});

	test('strips x.com share params', () => {
		const r = cleanUrl('https://x.com/user/status/1?s=20&t=abc&ref_src=twsrc');
		expect(r.output).toBe('https://x.com/user/status/1');
	});

	test('does not strip s= on other hosts', () => {
		const r = cleanUrl('https://example.com/search?s=hello');
		expect(r.output).toBe('https://example.com/search?s=hello');
		expect(r.changed).toBe(false);
	});

	test('unwraps google /url?q=', () => {
		const inner = 'https://example.com/post?utm_medium=cpc';
		const r = cleanUrl(`https://www.google.com/url?q=${encodeURIComponent(inner)}&sa=U`);
		expect(r.unwrapped).toBe(true);
		expect(r.output).toBe('https://example.com/post');
	});

	test('unwraps facebook l.php', () => {
		const inner = 'https://example.com/x?fbclid=1';
		const r = cleanUrl(`https://l.facebook.com/l.php?u=${encodeURIComponent(inner)}`);
		expect(r.unwrapped).toBe(true);
		expect(r.output).toBe('https://example.com/x');
	});

	test('already clean stays the same', () => {
		const r = cleanUrl('https://example.com/path?id=3');
		expect(r.output).toBe('https://example.com/path?id=3');
		expect(r.changed).toBe(false);
		expect(r.removed).toHaveLength(0);
	});

	test('accepts URL without scheme', () => {
		const r = cleanUrl('example.com/a?utm_campaign=z');
		expect(r.output).toBe('https://example.com/a');
	});

	test('invalid input', () => {
		const r = cleanUrl('not a url');
		expect(r.error).toBe('no es una URL');
		expect(r.output).toBe('not a url');
	});

	test('empty', () => {
		const r = cleanUrl('  ');
		expect(r.output).toBe('');
		expect(r.error).toBeNull();
	});

	test('strips utm query and Echobox hash', () => {
		const r = cleanUrl(
			'https://www.infobae.com/deportes/nota/?utm_medium=Social&utm_source=Twitter#Echobox=1788976798'
		);
		expect(r.output).toBe('https://www.infobae.com/deportes/nota/');
		expect(r.removed.map((p) => p.name.toLowerCase()).sort()).toEqual([
			'echobox',
			'utm_medium',
			'utm_source'
		]);
		expect(r.output).not.toContain('utm_medium');
		expect(r.output).not.toContain('Echobox');
	});
});

describe('inspector', () => {
	test('lists query params and marks tracking', () => {
		const r = cleanUrl('https://example.com/a?keep=1&utm_source=x');
		expect(r.params.map((p) => p.name).sort()).toEqual(['keep', 'utm_source']);
		expect(r.params.find((p) => p.name === 'utm_source')?.tracking).toBe(true);
		expect(r.params.find((p) => p.name === 'keep')?.tracking).toBe(false);
		expect(r.host?.ascii).toBe('example.com');
	});

	test('decodes punycode and flags mixed scripts', () => {
		const r = cleanUrl('https://xn--bcher-kva.example/a');
		expect(r.host?.unicode).toBe('bücher.example');
		expect(r.host?.punycode).toBe(true);
		expect(r.host?.mixedScript).toBe(false);
	});

	test('unwraps google AMP viewer', () => {
		const r = cleanUrl('https://www.google.com/amp/s/www.example.com/article');
		expect(r.amp).toBe(true);
		expect(r.output).toBe('https://www.example.com/article');
	});

	test('strips /amp suffix', () => {
		const r = cleanUrl('https://www.example.com/article/amp');
		expect(r.amp).toBe(true);
		expect(r.output).toBe('https://www.example.com/article');
	});

	test('canonicalizes m.youtube.com', () => {
		const r = cleanUrl('https://m.youtube.com/watch?v=dQw4w9wgGcQ&si=TRACK');
		expect(r.mobile).toBe(true);
		expect(r.output).toBe('https://youtube.com/watch?v=dQw4w9wgGcQ');
	});

	test('canonicalizes lang.m.wikipedia.org', () => {
		const r = cleanUrl('https://es.m.wikipedia.org/wiki/Bitcoin');
		expect(r.mobile).toBe(true);
		expect(r.output).toBe('https://es.wikipedia.org/wiki/Bitcoin');
	});
});

describe('cleanText', () => {
	test('cleans each non-empty line', () => {
		const r = cleanText('https://a.com/?utm_source=1\n\nhttps://x.com/u/status/2?s=20\n');
		expect(r).toHaveLength(2);
		expect(r[0].output).toBe('https://a.com');
		expect(r[1].output).toBe('https://x.com/u/status/2');
	});

	test('splits concatenated URLs and does not leave utm in the hash', () => {
		const one =
			'https://www.infobae.com/deportes/nota/?utm_medium=Social&utm_source=Twitter#Echobox=1788976798';
		const r = cleanText(one + one);
		expect(r).toHaveLength(2);
		for (const item of r) {
			expect(item.output).toBe('https://www.infobae.com/deportes/nota/');
			expect(item.output).not.toContain('utm_medium');
			expect(item.output).not.toContain('Echobox');
		}
	});
});
