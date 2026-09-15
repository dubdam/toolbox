import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const STORAGE_ROOT = 'storage';

export const TOOL_DIRS = ['downloads', 'compress', 'transcribe', 'metadata', 'markdown', 'cut'] as const;

export function ensureStorage(): void {
	mkdirSync(STORAGE_ROOT, { recursive: true });
	for (const dir of TOOL_DIRS) {
		mkdirSync(join(STORAGE_ROOT, dir), { recursive: true });
	}
}

export function toolDir(name: (typeof TOOL_DIRS)[number]): string {
	return join(STORAGE_ROOT, name);
}
