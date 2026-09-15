import { detectBinaries } from '$lib/server/binaries';

export function load() {
	return { binaries: detectBinaries() };
}
