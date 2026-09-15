const WEIRD_BS = /[\u2216\uFF3C\u29F5]/g;
const NBSP = /[\u00A0\u202F]/g;

function mapUnfenced(src: string, fn: (line: string) => string): string {
	let inFence = false;
	return src
		.split(/\r?\n/)
		.map((line) => {
			if (/^\s*```/.test(line)) {
				inFence = !inFence;
				return line;
			}
			if (inFence) return line;
			return fn(line);
		})
		.join('\n');
}

function unescapeLine(line: string): string {
	let s = line.replace(NBSP, ' ').replace(WEIRD_BS, '\\');
	s = s.replace(/^(\s*)[•●◦‣▪]\s+(?=\\*#)/, '$1');
	s = s.replace(/\\+(#)/g, '$1');
	s = s.replace(/^(\s*)\\+([-*+])(\s+)/, '$1$2$3');
	s = s.replace(/^(\s*)(\d+)\\.(\s+)/, '$1$2.$3');
	s = s.replace(/^(\s*)[•●◦‣▪]\s+/, '$1- ');
	return s;
}

export function unescapeMarkdown(src: string): string {
	return mapUnfenced(src, unescapeLine);
}

export function looksEscaped(src: string): boolean {
	return src.split(/\r?\n/).some((line) => {
		if (/^\s*```/.test(line)) return false;
		return (
			/\\#/.test(line) ||
			/^\s*\\[-*+]/.test(line) ||
			/^\s*[•●◦‣▪]\s/.test(line) ||
			/^\s*\d+\\./.test(line)
		);
	});
}

const PUNCT_BEFORE_CLOSE = /[.,:;!?…»”"'`)\]](\*\*|__)$/;

function emphasisThenWord(): RegExp {
	return /(\*\*[^*\n]+?\*\*|__[^_\n]+?__)(?=[A-Za-zÀ-ÿ0-9])/g;
}

function fixEmphasisLine(line: string): string {
	return line.replace(emphasisThenWord(), (full, run: string) => {
		if (PUNCT_BEFORE_CLOSE.test(run)) return `${run} `;
		return full;
	});
}

export function fixFlankingEmphasis(src: string): string {
	return mapUnfenced(src, fixEmphasisLine);
}

export function looksBrokenEmphasis(src: string): boolean {
	return src.split(/\r?\n/).some((line) => {
		if (/^\s*```/.test(line)) return false;
		for (const match of line.matchAll(emphasisThenWord())) {
			if (PUNCT_BEFORE_CLOSE.test(match[1] ?? '')) return true;
		}
		return false;
	});
}
