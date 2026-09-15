import { cleanUrl } from './urls';
import { fixFlankingEmphasis } from './md-unescape';

export type ClipMode = 'plain' | 'markdown';
export type ClipSource = 'word' | 'gdocs' | 'notion' | 'html' | 'text';

export interface ClipResult {
	output: string;
	mode: ClipMode;
	hadHtml: boolean;
	source: ClipSource;
	invisibleChars: number;
	urlsCleaned: number;
	urlsUnwrapped: number;
}

const INVISIBLE =
	/[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\u2800\u3164\uFEFF\uFFA0\uFFF9-\uFFFB]/g;

const WEIRD_SPACE = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;

const CURLY_SINGLE = /[\u2018\u2019\u201A\u201B]/g;
const CURLY_DOUBLE = /[\u201C\u201D\u201E\u201F]/g;

export function countInvisible(text: string): number {
	return text.match(INVISIBLE)?.length ?? 0;
}

export function stripInvisible(text: string): string {
	return text
		.replace(INVISIBLE, '')
		.replace(WEIRD_SPACE, ' ')
		.replace(CURLY_SINGLE, "'")
		.replace(CURLY_DOUBLE, '"');
}

export function detectHtmlSource(html: string): ClipSource {
	if (/class\s*=\s*"?Mso|xmlns:o=|urn:schemas-microsoft/i.test(html)) return 'word';
	if (/docs-internal-guid/i.test(html)) return 'gdocs';
	if (/notion\.|data-block-id/i.test(html)) return 'notion';
	return 'html';
}

function decodeEntities(s: string): string {
	return s
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;|&apos;/gi, "'")
		.replace(/&#x([0-9a-f]+);/gi, (_, h) => {
			const n = parseInt(h, 16);
			return n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
		})
		.replace(/&#(\d+);/g, (_, d) => {
			const n = Number(d);
			return n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
		});
}

function preprocessHtml(html: string): string {
	let s = html;
	s = s.replace(/<head[\s\S]*?<\/head>/gi, '');
	s = s.replace(/<!--[\s\S]*?-->/g, '');
	s = s.replace(/<!\[if[\s\S]*?<!\[endif\]>/gi, '');
	s = s.replace(/<!\[endif\]>/gi, '');
	s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
	s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
	s = s.replace(/<xml[\s\S]*?<\/xml>/gi, '');
	const body = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
	if (body?.[1]) s = body[1];
	return s;
}

function parseAttrs(inner: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	const re = /([:@\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(inner))) {
		attrs[m[1]!.toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
	}
	return attrs;
}

type Frame = {
	tag: string;
	attrs: Record<string, string>;
	buf: string;
	rows?: string[][];
	cells?: string[];
	item?: number;
};

const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'wbr']);

function parseTag(raw: string): { close: boolean; name: string; attrs: Record<string, string> } | null {
	const s = raw.slice(1, -1).trim();
	if (!s || s.startsWith('!') || s.startsWith('?')) return null;
	const close = s.startsWith('/');
	const body = close ? s.slice(1).trim() : s;
	const self = body.endsWith('/');
	const inner = self ? body.slice(0, -1).trim() : body;
	const m = inner.match(/^([a-zA-Z][\w:-]*)/);
	if (!m) return null;
	const name = m[1]!.toLowerCase();
	const attrs = parseAttrs(inner.slice(m[1]!.length));
	return { close, name, attrs };
}

function cleanHref(href: string): string {
	const r = cleanUrl(href);
	return r.error ? href : r.output;
}

function formatTable(rows: string[][]): string {
	if (!rows.length) return '';
	const width = Math.max(...rows.map((r) => r.length), 1);
	const norm = rows.map((r) =>
		Array.from({ length: width }, (_, i) => (r[i] ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim())
	);
	const header = norm[0]!;
	const sep = header.map(() => '---');
	const lines = [
		`| ${header.join(' | ')} |`,
		`| ${sep.join(' | ')} |`,
		...norm.slice(1).map((r) => `| ${r.join(' | ')} |`)
	];
	return `\n\n${lines.join('\n')}\n\n`;
}

function emitTag(frame: Frame, parent: Frame, mode: ClipMode): void {
	const t = frame.tag.split(':').pop() ?? frame.tag;
	const inner = frame.buf.replace(/[ \t]+\n/g, '\n').trim();
	const append = (s: string) => {
		parent.buf += s;
	};

	if (t === 'br') {
		append('\n');
		return;
	}
	if (t === 'hr') {
		append(mode === 'markdown' ? '\n\n---\n\n' : '\n\n');
		return;
	}
	if (t === 'img') {
		const alt = frame.attrs.alt?.trim() ?? '';
		if (mode === 'markdown' && alt) append(` ![${alt}](${cleanHref(frame.attrs.src ?? '')}) `);
		else if (alt) append(` ${alt} `);
		return;
	}
	if (t === 'h1' || t === 'h2' || t === 'h3' || t === 'h4' || t === 'h5' || t === 'h6') {
		const n = Number(t[1]);
		append(mode === 'markdown' ? `\n\n${'#'.repeat(n)} ${inner}\n\n` : `\n\n${inner}\n\n`);
		return;
	}
	if (t === 'tbody' || t === 'thead' || t === 'tfoot') {
		parent.rows = [...(parent.rows ?? []), ...(frame.rows ?? [])];
		append(frame.buf);
		return;
	}
	if (t === 'tr') {
		parent.rows ??= [];
		parent.rows.push(frame.cells ?? [inner]);
		return;
	}
	if (t === 'p' || t === 'div' || t === 'section' || t === 'article') {
		append(t === 'p' ? `\n\n${inner}\n\n` : `\n${inner}\n`);
		return;
	}
	if (t === 'td' || t === 'th') {
		parent.cells ??= [];
		parent.cells.push(inner);
		return;
	}
	if (t === 'table') {
		append(mode === 'markdown' ? formatTable(frame.rows ?? []) : `\n${inner}\n`);
		return;
	}
	if (t === 'li') {
		append(`\n- ${inner}`);
		return;
	}
	if (t === 'ul' || t === 'ol') {
		append(`${frame.buf}\n`);
		return;
	}
	if (t === 'blockquote') {
		const q = inner
			.split('\n')
			.map((l) => (mode === 'markdown' ? `> ${l}` : l))
			.join('\n');
		append(`\n\n${q}\n\n`);
		return;
	}
	if (t === 'pre') {
		append(mode === 'markdown' ? `\n\n\`\`\`\n${inner}\n\`\`\`\n\n` : `\n\n${inner}\n\n`);
		return;
	}
	if (t === 'code' && parent.tag !== 'pre') {
		append(mode === 'markdown' ? `\`${inner}\`` : inner);
		return;
	}
	if (t === 'a') {
		const href = frame.attrs.href ?? '';
		if (!href || /^(javascript|data|vbscript):/i.test(href)) {
			append(inner);
			return;
		}
		const url = cleanHref(href);
		if (mode === 'markdown') append(inner && inner !== url ? `[${inner}](${url})` : url);
		else append(inner && inner !== url ? `${inner} (${url})` : url);
		return;
	}
	if (t === 'strong' || t === 'b') {
		append(mode === 'markdown' && inner ? `**${inner}**` : inner);
		return;
	}
	if (t === 'em' || t === 'i') {
		append(mode === 'markdown' && inner ? `*${inner}*` : inner);
		return;
	}
	if (t === 'del' || t === 's' || t === 'strike') {
		append(mode === 'markdown' && inner ? `~~${inner}~~` : inner);
		return;
	}
	append(frame.buf);
}

function convertHtml(html: string, mode: ClipMode): string {
	const src = preprocessHtml(html);
	const parts = src.split(/(<[^>]+>)/);
	const root: Frame = { tag: 'root', attrs: {}, buf: '' };
	const stack: Frame[] = [root];

	for (const part of parts) {
		if (!part) continue;
		if (part.startsWith('<')) {
			const tag = parseTag(part);
			if (!tag) continue;
			const name = tag.name;
			const top = stack[stack.length - 1]!;
			if (tag.close) {
				const idx = stack.findLastIndex((f) => f.tag === name);
				if (idx <= 0) continue;
				while (stack.length - 1 > idx) {
					const orphan = stack.pop()!;
					stack[stack.length - 1]!.buf += orphan.buf;
				}
				const frame = stack.pop()!;
				emitTag(frame, stack[stack.length - 1]!, mode);
				continue;
			}
			if (VOID.has(name.split(':').pop() ?? name) || part.endsWith('/>')) {
				emitTag({ tag: name, attrs: tag.attrs, buf: '' }, top, mode);
				continue;
			}
			stack.push({ tag: name, attrs: tag.attrs, buf: '' });
			continue;
		}
		stack[stack.length - 1]!.buf += decodeEntities(part);
	}

	while (stack.length > 1) {
		const frame = stack.pop()!;
		emitTag(frame, stack[stack.length - 1]!, mode);
	}
	return root.buf;
}

const MD_LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
const BARE_URL = /https?:\/\/[^\s<>)"']+/g;

export function rewriteUrlsInText(text: string): { text: string; cleaned: number; unwrapped: number } {
	let cleaned = 0;
	let unwrapped = 0;
	const seen = new Set<string>();

	let out = text.replace(MD_LINK, (full, label: string, url: string) => {
		const r = cleanUrl(url);
		if (r.error || !r.changed) return full;
		cleaned += 1;
		if (r.unwrapped || r.amp || r.mobile) unwrapped += 1;
		seen.add(url);
		return `[${label}](${r.output})`;
	});

	out = out.replace(BARE_URL, (url) => {
		if (seen.has(url)) return url;
		let core = url;
		let trail = '';
		while (/[.,;:!?]$/.test(core)) {
			trail = core.slice(-1) + trail;
			core = core.slice(0, -1);
		}
		const r = cleanUrl(core);
		if (r.error || !r.changed) return url;
		cleaned += 1;
		if (r.unwrapped || r.amp || r.mobile) unwrapped += 1;
		return r.output + trail;
	});

	return { text: out, cleaned, unwrapped };
}

function tidy(text: string): string {
	return text
		.replace(/[ \t]+/g, ' ')
		.replace(/ *\n */g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

function looksLikeHtml(s: string): boolean {
	return /<[a-z][\s\S]*>/i.test(s);
}

export function cleanClipboard(
	input: { text: string; html?: string | null },
	mode: ClipMode
): ClipResult {
	const text = input.text ?? '';
	const html = input.html?.trim() ? input.html : null;
	const hadHtml = Boolean(html && looksLikeHtml(html));
	const source: ClipSource = hadHtml ? detectHtmlSource(html!) : 'text';
	const invisibleChars = countInvisible(`${text}\n${html ?? ''}`);

	let body = hadHtml ? convertHtml(html!, mode) : text;
	body = stripInvisible(body);
	const urls = rewriteUrlsInText(body);
	body = tidy(urls.text);
	if (mode === 'markdown') body = fixFlankingEmphasis(body);

	return {
		output: body,
		mode,
		hadHtml,
		source,
		invisibleChars,
		urlsCleaned: urls.cleaned,
		urlsUnwrapped: urls.unwrapped
	};
}
