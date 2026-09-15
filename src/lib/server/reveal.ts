import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

export function revealInExplorer(filePath: string): void {
	const abs = resolve(filePath);
	spawn('explorer', [`/select,${abs}`], { detached: true, stdio: 'ignore' }).unref();
}
