export type ToolSlug =
	| 'download'
	| 'compress'
	| 'markdown'
	| 'transcribe'
	| 'metadata'
	| 'urls';

export type BinaryName = 'yt-dlp' | 'ffmpeg' | 'ffprobe' | 'whisper-cli' | 'exiftool';

export interface BinaryStatus {
	name: BinaryName;
	path: string | null;
}

export interface ToolDef {
	slug: ToolSlug;
	href: `/${ToolSlug}`;
	name: string;
	blurb: string;
	binaries: BinaryName[];
	needsNet: boolean;
}

export const tools: ToolDef[] = [
	{
		slug: 'download',
		href: '/download',
		name: 'Downloader',
		blurb: 'Pegá una URL de X o YouTube. Sale video o audio en disco.',
		binaries: ['yt-dlp', 'ffmpeg'],
		needsNet: true
	},
	{
		slug: 'compress',
		href: '/compress',
		name: 'Compresor',
		blurb: 'PNG/JPG, drop, preview de peso antes y después.',
		binaries: [],
		needsNet: false
	},
	{
		slug: 'markdown',
		href: '/markdown',
		name: 'Markdown',
		blurb: 'Abrí un .md, miralo y editalo. ByteMD, split fuente/preview.',
		binaries: [],
		needsNet: false
	},
	{
		slug: 'transcribe',
		href: '/transcribe',
		name: 'Transcripción',
		blurb: 'Audio o video a texto. Default gpt-transcribe; Whisper API opcional.',
		binaries: ['ffmpeg'],
		needsNet: true
	},
	{
		slug: 'metadata',
		href: '/metadata',
		name: 'Metadatos',
		blurb: 'Ver y sacar GPS, cámara, fechas de foto, video y audio.',
		binaries: ['exiftool', 'ffmpeg'],
		needsNet: false
	},
	{
		slug: 'urls',
		href: '/urls',
		name: 'Limpiar URLs',
		blurb: 'Saca utm, fbclid y el resto del tracking.',
		binaries: [],
		needsNet: false
	}
];

export function toolBySlug(slug: string): ToolDef | undefined {
	return tools.find((t) => t.slug === slug);
}
