export const TRANSCRIBE_MODELS = ['gpt-transcribe', 'whisper-1'] as const;
export type TranscribeModel = (typeof TRANSCRIBE_MODELS)[number];

export const TRANSCRIBE_MODEL_LABELS: Record<TranscribeModel, string> = {
	'gpt-transcribe': 'gpt-transcribe (recomendado)',
	'whisper-1': 'Whisper (whisper-1)'
};
