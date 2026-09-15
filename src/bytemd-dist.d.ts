declare module 'bytemd' {
	export class Editor {
		constructor(options: { target: Element; props: Record<string, unknown> });
		$set(props: Record<string, unknown>): void;
		$destroy(): void;
		$on(event: 'change', fn: (e: { detail: { value: string } }) => void): void;
	}
	export class Viewer {
		constructor(options: { target: Element; props: Record<string, unknown> });
		$set(props: Record<string, unknown>): void;
		$destroy(): void;
	}
	export function getProcessor(options?: Record<string, unknown>): unknown;
}
