export const HASH_ALGOS = ['md5', 'sha1', 'sha256', 'sha512', 'blake3'] as const;
export type HashAlgo = (typeof HASH_ALGOS)[number];

const ALGO_ALIAS: Record<string, HashAlgo> = {
	md5: 'md5',
	sha1: 'sha1',
	'sha-1': 'sha1',
	sha256: 'sha256',
	'sha-256': 'sha256',
	sha512: 'sha512',
	'sha-512': 'sha512',
	blake3: 'blake3',
	b3: 'blake3'
};

const LEN_ALGOS: Record<number, HashAlgo[]> = {
	32: ['md5'],
	40: ['sha1'],
	64: ['sha256', 'blake3'],
	128: ['sha512']
};

export interface ParsedHash {
	hex: string;
	algo: HashAlgo | null;
	candidates: HashAlgo[];
}

function normalizeHex(raw: string): string | null {
	const hex = raw.replace(/[\s:]/g, '').toLowerCase();
	if (!/^[0-9a-f]+$/.test(hex) || hex.length % 2 !== 0) return null;
	if (!LEN_ALGOS[hex.length]) return null;
	return hex;
}

export function parsePublishedHash(raw: string): ParsedHash | null {
	const text = raw.trim().replace(/^\uFEFF/, '');
	if (!text) return null;

	const tagged = text.match(
		/^\s*(md5|sha-?1|sha-?256|sha-?512|blake3|b3)\s*(?:[:|=]\s*|\s+)(?:\()?(?:[^)]*\)\s*=\s*)?([0-9a-fA-F][0-9a-fA-F:\s]+)/i
	);
	if (tagged) {
		const algo = ALGO_ALIAS[tagged[1]!.toLowerCase()] ?? null;
		const hex = normalizeHex(tagged[2]!);
		if (hex && algo && LEN_ALGOS[hex.length]?.includes(algo)) {
			return { hex, algo, candidates: [algo] };
		}
		if (hex) {
			return { hex, algo: LEN_ALGOS[hex.length]!.length === 1 ? LEN_ALGOS[hex.length]![0]! : null, candidates: LEN_ALGOS[hex.length]! };
		}
	}

	const bsd = text.match(
		/^\s*(MD5|SHA-?1|SHA-?256|SHA-?512|BLAKE3)\s+\([^)]+\)\s*=\s*([0-9a-fA-F][0-9a-fA-F:\s]+)/i
	);
	if (bsd) {
		const algo = ALGO_ALIAS[bsd[1]!.toLowerCase()] ?? null;
		const hex = normalizeHex(bsd[2]!);
		if (hex && algo && LEN_ALGOS[hex.length]?.includes(algo)) {
			return { hex, algo, candidates: [algo] };
		}
	}

	const core = text.split(/\s+/)[0] ?? '';
	const hex = normalizeHex(core);
	if (!hex) return null;
	const candidates = LEN_ALGOS[hex.length]!;
	return {
		hex,
		algo: candidates.length === 1 ? candidates[0]! : null,
		candidates
	};
}
