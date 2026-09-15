const WEIRD_BS = /[\u2216\uFF3C\u29F5]/g;
const NBSP = /[\u00A0\u202F]/g;

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
	let inFence = false;
	return src
		.split(/\r?\n/)
		.map((line) => {
			if (/^\s*```/.test(line)) {
				inFence = !inFence;
				return line;
			}
			if (inFence) return line;
			return unescapeLine(line);
		})
		.join('\n');
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
