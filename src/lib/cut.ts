export type CutKind = 'copy' | 'mp3';

export interface ProbeOk {
	uploadId: string;
	name: string;
	duration: number;
	size: number;
	format: string;
	hasVideo: boolean;
	hasAudio: boolean;
	width: number | null;
	height: number | null;
}
