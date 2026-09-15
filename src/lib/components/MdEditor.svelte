<script lang="ts">
	import { onMount } from 'svelte';
	import 'bytemd/dist/index.css';
	import 'github-markdown-css/github-markdown-light.css';
	import 'highlight.js/styles/github.css';

	let {
		value = $bindable(''),
		placeholder = 'Soltá un .md o escribí acá'
	}: {
		value: string;
		placeholder?: string;
	} = $props();

	let host = $state<HTMLDivElement | undefined>(undefined);

	type ByteEditor = {
		$set: (props: { value?: string }) => void;
		$destroy: () => void;
		$on: (event: 'change', fn: (e: { detail: { value: string } }) => void) => void;
	};

	let editor = $state<ByteEditor | null>(null);
	let lastFromEditor = $state('');

	onMount(() => {
		let destroyed = false;
		(async () => {
			const [{ Editor }, gfm, highlight] = await Promise.all([
				import('bytemd'),
				import('@bytemd/plugin-gfm'),
				import('@bytemd/plugin-highlight')
			]);
			if (destroyed || !host) return;
			const instance = new Editor({
				target: host,
				props: {
					value,
					plugins: [gfm.default(), highlight.default()],
					mode: 'auto',
					placeholder
				}
			}) as ByteEditor;
			instance.$on('change', (e) => {
				lastFromEditor = e.detail.value;
				value = e.detail.value;
			});
			editor = instance;
		})();
		return () => {
			destroyed = true;
			editor?.$destroy();
			editor = null;
		};
	});

	$effect(() => {
		const next = value;
		const ed = editor;
		if (ed && next !== lastFromEditor) {
			lastFromEditor = next;
			ed.$set({ value: next });
		}
	});
</script>

<div class="bytemd-host" bind:this={host}></div>

<style>
	.bytemd-host {
		min-height: min(70vh, 720px);
	}
	.bytemd-host :global(.bytemd) {
		height: min(70vh, 720px);
	}
	.bytemd-host :global(.markdown-body) {
		color: var(--foreground);
		background: transparent;
	}
	.bytemd-host :global(.markdown-body ul) {
		list-style-type: disc;
		padding-left: 2em;
	}
	.bytemd-host :global(.markdown-body ol) {
		list-style-type: decimal;
		padding-left: 2em;
	}
	.bytemd-host :global(.markdown-body ul ul) {
		list-style-type: circle;
	}
	.bytemd-host :global(.markdown-body ul ul ul) {
		list-style-type: square;
	}
</style>
