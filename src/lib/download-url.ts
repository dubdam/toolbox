const ALLOWED = new Set([
	'youtube.com',
	'm.youtube.com',
	'music.youtube.com',
	'youtu.be',
	'x.com',
	'twitter.com',
	'mobile.twitter.com'
]);

export function allowedDownloadUrl(raw: string): URL | null {
	let url: URL;
	try {
		url = new URL(raw.trim());
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
	const host = url.hostname.toLowerCase().replace(/^www\./, '');
	if (!ALLOWED.has(host)) return null;
	return url;
}

export const VIDEO_QUALITIES = ['best', '1080', '720', '480', '360'] as const;
export type VideoQuality = (typeof VIDEO_QUALITIES)[number];

export function ytdlpFormat(kind: 'video' | 'audio', quality: VideoQuality): string | null {
	if (kind === 'audio') return null;
	if (quality === 'best') return 'bv*+ba/b';
	const h = quality;
	return `bv*[height<=${h}]+ba/b[height<=${h}]/wv*+ba/w`;
}

export function parseYtdlpLine(line: string): {
	progress?: number;
	message?: string;
	error?: string;
} {
	const text = line.trim();
	if (!text) return {};
	if (/^error:/i.test(text) || text.includes('ERROR:')) return { error: text };
	const pct = text.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
	if (pct) return { progress: Number(pct[1]), message: text };
	if (
		text.includes('[Merger]') ||
		text.includes('[ExtractAudio]') ||
		text.includes('Destination:')
	) {
		return { message: text };
	}
	return {};
}
