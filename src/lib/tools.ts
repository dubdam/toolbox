export type ToolSlug =
	| 'download'
	| 'cut'
	| 'compress'
	| 'markdown'
	| 'transcribe'
	| 'metadata'
	| 'clipboard'
	| 'urls'
	| 'hash'
	| 'qr'
	| 'count';

export type BinaryName = 'yt-dlp' | 'ffmpeg' | 'ffprobe' | 'exiftool';

export interface BinaryStatus {
	name: BinaryName;
	path: string | null;
}

export type ToolGroup = 'media' | 'texto' | 'archivo' | 'generar';

export const toolGroups: { id: ToolGroup; label: string; deck: string }[] = [
	{ id: 'media', label: 'Bajar y cortar', deck: 'Video, audio, transcribir.' },
	{ id: 'texto', label: 'Texto', deck: 'Pegar, limpiar, contar, mirar markdown.' },
	{ id: 'archivo', label: 'Archivos', deck: 'Peso, metadatos, integridad.' },
	{ id: 'generar', label: 'Generar', deck: 'QR y lo que no entra en un archivo.' }
];

export interface ToolDef {
	slug: ToolSlug;
	href: `/${ToolSlug}`;
	name: string;
	blurb: string;
	group: ToolGroup;
	binaries: BinaryName[];
	needsNet: boolean;
}

export const tools: ToolDef[] = [
	{
		slug: 'download',
		href: '/download',
		name: 'Downloader',
		blurb: 'Pegá una URL de X o YouTube. Sale video o audio en disco.',
		group: 'media',
		binaries: ['yt-dlp', 'ffmpeg'],
		needsNet: true
	},
	{
		slug: 'cut',
		href: '/cut',
		name: 'Recortar',
		blurb: 'Un fragmento de audio o video. 00:13:42–00:17:08 → MP3.',
		group: 'media',
		binaries: ['ffmpeg', 'ffprobe'],
		needsNet: false
	},
	{
		slug: 'compress',
		href: '/compress',
		name: 'Compresor',
		blurb: 'PNG/JPG, drop, preview de peso antes y después.',
		group: 'archivo',
		binaries: [],
		needsNet: false
	},
	{
		slug: 'markdown',
		href: '/markdown',
		name: 'Markdown',
		blurb: 'Abrí un .md o pegá con Ctrl+V. ByteMD, split fuente/preview.',
		group: 'texto',
		binaries: [],
		needsNet: false
	},
	{
		slug: 'transcribe',
		href: '/transcribe',
		name: 'Transcripción',
		blurb: 'Audio o video a texto. Default gpt-transcribe; Whisper API opcional.',
		group: 'media',
		binaries: ['ffmpeg'],
		needsNet: true
	},
	{
		slug: 'metadata',
		href: '/metadata',
		name: 'Metadatos',
		blurb: 'Ver y sacar GPS, cámara, fechas de foto, video y audio.',
		group: 'archivo',
		binaries: ['ffmpeg'],
		needsNet: false
	},
	{
		slug: 'clipboard',
		href: '/clipboard',
		name: 'Portapapeles',
		blurb: 'Pegá HTML sucio. Sale plaintext o Markdown, sin tracking ni invisibles.',
		group: 'texto',
		binaries: [],
		needsNet: false
	},
	{
		slug: 'count',
		href: '/count',
		name: 'Contar',
		blurb: 'Palabras, párrafos, caracteres. Pegá texto o soltá un .txt.',
		group: 'texto',
		binaries: [],
		needsNet: false
	},
	{
		slug: 'urls',
		href: '/urls',
		name: 'Limpiar URLs',
		blurb: 'Saca tracking, lista params, punycode y AMP. Sin salir a internet.',
		group: 'texto',
		binaries: [],
		needsNet: false
	},
	{
		slug: 'hash',
		href: '/hash',
		name: 'Hash',
		blurb: 'SHA-256, SHA-512, BLAKE3. Archivo o texto. Comparar o verificar un hash publicado.',
		group: 'archivo',
		binaries: [],
		needsNet: false
	},
	{
		slug: 'qr',
		href: '/qr',
		name: 'QR',
		blurb: 'Crear y leer QR en local. URL, Wi-Fi, contacto, Bitcoin, Lightning, Nostr…',
		group: 'generar',
		binaries: [],
		needsNet: false
	}
];

export function toolBySlug(slug: string): ToolDef | undefined {
	return tools.find((t) => t.slug === slug);
}
