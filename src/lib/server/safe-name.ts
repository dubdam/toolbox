import { basename, relative, resolve, sep } from 'node:path';

export function safeOutputName(raw: string): string | null {
	const name = basename(raw.trim());
	if (!name || name === '.' || name === '..') return null;
	if (name.includes('/') || name.includes('\\') || name.includes('\0')) return null;
	if (name.length > 240) return null;
	return name;
}

export function containedIn(dir: string, file: string): boolean {
	const root = resolve(dir);
	const target = resolve(file);
	const rel = relative(root, target);
	if (!rel || rel === '..') return false;
	return !rel.startsWith(`..${sep}`);
}
