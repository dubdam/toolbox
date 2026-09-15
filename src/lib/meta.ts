export interface MetaField {
	key: string;
	value: string;
	sensitive: boolean;
}

const SKIP = /^(thumbnail|makernote|usercomment|imagesource|padding)$/i;

export function isSensitiveKey(key: string): boolean {
	return /gps|latitud|longitud|altitude|location|serial|imei|deviceid|ownername/i.test(
		key.replace(/\s+/g, '')
	);
}

function stringify(value: unknown): string {
	if (value instanceof Date) return value.toISOString();
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

export function flattenMeta(input: unknown, prefix = ''): MetaField[] {
	if (input == null) return [];
	if (input instanceof Date || typeof input !== 'object') {
		if (!prefix) return [];
		return [{ key: prefix, value: stringify(input), sensitive: isSensitiveKey(prefix) }];
	}
	if (Array.isArray(input)) {
		if (input.length === 0) return [];
		if (input.every((x) => typeof x === 'number' || typeof x === 'string')) {
			return [
				{
					key: prefix || 'value',
					value: input.join(', '),
					sensitive: isSensitiveKey(prefix)
				}
			];
		}
		return input.flatMap((v, i) => flattenMeta(v, prefix ? `${prefix}[${i}]` : String(i)));
	}
	const out: MetaField[] = [];
	for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
		if (SKIP.test(k)) continue;
		const key = prefix ? `${prefix}.${k}` : k;
		out.push(...flattenMeta(v, key));
	}
	return out;
}
