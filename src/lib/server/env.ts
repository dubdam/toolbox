import { env } from '$env/dynamic/private';

export function openaiApiKey(): string | null {
	const key = env.OPENAI_API_KEY?.trim();
	return key ? key : null;
}
