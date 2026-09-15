<script lang="ts">
	import { enhance } from '$app/forms';
	import { toolBySlug } from '$lib/tools';
	import MdEditor from '$lib/components/MdEditor.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import { looksEscaped, unescapeMarkdown } from '$lib/md-unescape';
	import type { ActionData } from './$types';

	const tool = toolBySlug('markdown')!;

	let { form }: { form: ActionData } = $props();
	let value = $state('');
	let filename = $state('nota.md');
	let dragging = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);
	let editorKey = $state(0);
	const escaped = $derived(looksEscaped(value));

	function unescape() {
		value = unescapeMarkdown(value);
		editorKey += 1;
	}

	async function loadFile(file: File) {
		filename = file.name || 'nota.md';
		value = await file.text();
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) void loadFile(file);
	}

	function download() {
		const blob = new Blob([value], { type: 'text/markdown;charset=utf-8' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = filename.endsWith('.md') ? filename : `${filename}.md`;
		a.click();
		URL.revokeObjectURL(a.href);
	}
</script>

<svelte:head><title>{tool.name} — toolbox</title></svelte:head>

<div class="mb-6 space-y-1">
	<h1 class="text-2xl font-medium tracking-tight">{tool.name}</h1>
	<p class="text-muted-foreground text-sm">{tool.blurb}</p>
	<div class="flex flex-wrap gap-2 pt-2">
		<Badge variant="secondary">offline</Badge>
		<Badge variant="outline">ByteMD</Badge>
		<Badge variant="outline">no sale a internet</Badge>
	</div>
</div>

<label
	for="mdfile"
	ondragover={(e) => {
		e.preventDefault();
		dragging = true;
	}}
	ondragleave={() => (dragging = false)}
	ondrop={onDrop}
	class="border-input hover:bg-muted/40 mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center {dragging
		? 'bg-muted'
		: ''}"
>
	<p class="text-sm font-medium">Soltá un .md acá</p>
	<p class="text-muted-foreground mt-1 text-sm">o click para elegir. Después se edita abajo.</p>
	<input
		bind:this={inputEl}
		id="mdfile"
		type="file"
		accept=".md,.markdown,.txt,text/markdown,text/plain"
		class="sr-only"
		onchange={(e) => {
			const file = e.currentTarget.files?.[0];
			if (file) void loadFile(file);
		}}
	/>
</label>

{#if escaped}
	<Alert.Root class="mb-4">
		<Alert.Title>Parece markdown escapado</Alert.Title>
		<Alert.Description>
			El archivo tiene <code>\##</code>, <code>\-</code> o viñetas <code>•</code>. Por eso el preview no
			formatea. Desescapá y se convierten en headings y listas de verdad.
		</Alert.Description>
		<Button size="sm" class="mt-3" type="button" onclick={unescape}>Desescapar</Button>
	</Alert.Root>
{/if}

{#key editorKey}
	<MdEditor bind:value />
{/key}

<div class="mt-4 flex flex-wrap items-end gap-2">
	<div class="w-48">
		<Input bind:value={filename} aria-label="nombre de archivo" />
	</div>
	<form method="POST" action="?/save" use:enhance>
		<input type="hidden" name="name" value={filename} />
		<input type="hidden" name="content" value={value} />
		<Button size="sm" type="submit">Guardar en storage</Button>
	</form>
	<Button size="sm" variant="outline" type="button" onclick={download}>Bajar .md</Button>
	{#if form?.savedAs}
		<form method="POST" action="?/reveal">
			<input type="hidden" name="name" value={form.savedAs} />
			<Button size="sm" variant="outline" type="submit">
				<FolderIcon />
				Mostrar en el explorador
			</Button>
		</form>
	{/if}
</div>

{#if form?.savedAs}
	<p class="text-muted-foreground mt-3 text-sm">Guardado como {form.savedAs}</p>
{/if}
{#if form?.message}
	<Alert.Root variant="destructive" class="mt-4">
		<Alert.Title>No pude guardar</Alert.Title>
		<Alert.Description>{form.message}</Alert.Description>
	</Alert.Root>
{/if}
