const BASE = 36;
const TMIN = 1;
const TMAX = 26;
const SKEW = 38;
const DAMP = 700;
const INITIAL_BIAS = 72;
const INITIAL_N = 128;
const MAX_INT = 2147483647;

function digit(code: number): number {
	if (code >= 48 && code <= 57) return code - 22;
	if (code >= 65 && code <= 90) return code - 65;
	if (code >= 97 && code <= 122) return code - 97;
	throw new Error('invalid punycode');
}

function adapt(delta: number, numPoints: number, firstTime: boolean): number {
	let d = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
	d += Math.floor(d / numPoints);
	let k = 0;
	while (d > ((BASE - TMIN) * TMAX) >> 1) {
		d = Math.floor(d / (BASE - TMIN));
		k += BASE;
	}
	return k + Math.floor(((BASE - TMIN + 1) * d) / (d + SKEW));
}

export function punycodeDecode(input: string): string {
	const output: number[] = [];
	let n = INITIAL_N;
	let i = 0;
	let bias = INITIAL_BIAS;
	let basic = input.lastIndexOf('-');
	if (basic < 0) basic = 0;

	for (let j = 0; j < basic; j++) {
		const c = input.charCodeAt(j);
		if (c >= 0x80) throw new Error('invalid punycode');
		output.push(c);
	}

	for (let index = basic > 0 ? basic + 1 : 0; index < input.length; ) {
		const oldi = i;
		for (let w = 1, k = BASE; ; k += BASE) {
			if (index >= input.length) throw new Error('invalid punycode');
			const d = digit(input.charCodeAt(index++));
			if (d >= BASE || d > Math.floor((MAX_INT - i) / w)) throw new Error('overflow');
			i += d * w;
			const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
			if (d < t) break;
			const baseMinusT = BASE - t;
			if (w > Math.floor(MAX_INT / baseMinusT)) throw new Error('overflow');
			w *= baseMinusT;
		}
		const out = output.length + 1;
		bias = adapt(i - oldi, out, oldi === 0);
		if (Math.floor(i / out) > MAX_INT - n) throw new Error('overflow');
		n += Math.floor(i / out);
		i %= out;
		output.splice(i++, 0, n);
	}
	return String.fromCodePoint(...output);
}

export function toUnicodeLabel(label: string): string {
	const lower = label.toLowerCase();
	if (!lower.startsWith('xn--')) return label;
	try {
		return punycodeDecode(lower.slice(4));
	} catch {
		return label;
	}
}

export function domainToUnicode(ascii: string): string {
	return ascii.split('.').map(toUnicodeLabel).join('.');
}

const SCRIPTS = [
	/\p{Script=Latin}/u,
	/\p{Script=Cyrillic}/u,
	/\p{Script=Greek}/u,
	/\p{Script=Han}/u,
	/\p{Script=Arabic}/u,
	/\p{Script=Hebrew}/u
];

export function isMixedScript(text: string): boolean {
	return SCRIPTS.filter((re) => re.test(text)).length > 1;
}
