import type { BinaryName, BinaryStatus } from '$lib/tools';

export type { BinaryStatus };

const NAMES: BinaryName[] = ['yt-dlp', 'ffmpeg', 'ffprobe', 'exiftool'];

export function detectBinaries(): BinaryStatus[] {
	return NAMES.map((name) => ({
		name,
		path: Bun.which(name) ?? null
	}));
}
