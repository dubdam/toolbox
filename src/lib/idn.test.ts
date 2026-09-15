import { describe, expect, test } from 'bun:test';
import { domainToUnicode as nodeUnicode } from 'node:url';
import { domainToUnicode, isMixedScript, punycodeDecode, toUnicodeLabel } from './idn';

describe('punycodeDecode', () => {
	test('bücher', () => {
		expect(punycodeDecode('bcher-kva')).toBe('bücher');
	});

	test('matches node:url for IDN labels', () => {
		for (const ascii of ['xn--bcher-kva', 'xn--fsq', 'xn--nxasmq6b', 'xn--mgbh0fb']) {
			expect(toUnicodeLabel(ascii)).toBe(nodeUnicode(ascii));
		}
	});

	test('leaves non-punycode labels alone', () => {
		expect(toUnicodeLabel('Example')).toBe('Example');
	});
});

describe('domainToUnicode', () => {
	test('decodes each xn-- label', () => {
		expect(domainToUnicode('xn--bcher-kva.example')).toBe('bücher.example');
		expect(domainToUnicode(nodeUnicode('xn--bcher-kva.example'))).toBe('bücher.example');
	});
});

describe('isMixedScript', () => {
	test('flags latin + cyrillic', () => {
		expect(isMixedScript('раypal')).toBe(true);
		expect(isMixedScript('bücher')).toBe(false);
		expect(isMixedScript('example')).toBe(false);
	});
});
