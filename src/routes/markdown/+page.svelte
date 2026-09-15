<script lang="ts">
	import { enhance } from '$app/forms';
	import { toolBySlug } from '$lib/tools';
	import MdEditor from '$lib/components/MdEditor.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import { fixFlankingEmphasis, looksBrokenEmphasis, looksEscaped, unescapeMarkdown } from '$lib/md-unescape';
	import { cleanClipboard } from '$lib/clipboard';
	import type { ActionData } from './$types';

	const tool = toolBySlug('markdown')!;

	let { form }: { form: ActionData } = $props();
	let value = $state('');
	let filename = $state('nota.md');
	let dragging = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);
	let editorKey = $state(0);
	const escaped = $derived(looksEscaped(value));
	const brokenEmphasis = $derived(looksBrokenEmphasis(value));

	function unescape() {
		value = unescapeMarkdown(value);
		editorKey += 1;
	}

	function fixEmphasis() {
		value = fixFlankingEmphasis(value);
		editorKey += 1;
	}

	function loadText(content: string, name = 'nota.md') {
		filename = name;
		value = fixFlankingEmphasis(content);
		editorKey += 1;
	}

	async function loadFile(file: File) {
		loadText(await file.text(), file.name || 'nota.md');
	}

	function isTypingTarget(el: EventTarget | null): boolean {
		if (!(el instanceof HTMLElement)) return false;
		if (el instanceof HTMLTextAreaElement) return true;
		if (el instanceof HTMLInputElement) {
			return el.type !== 'file' && el.type !== 'button' && el.type !== 'submit';
		}
		if (el.isContentEditable) return true;
		return Boolean(el.closest('.bytemd-editor, .CodeMirror, [contenteditable="true"]'));
	}

	function applyClipboard(dt: DataTransfer): boolean {
		const file = dt.files[0];
		if (file) {
			void loadFile(file);
			return true;
		}
		const text = dt.getData('text/plain');
		if (text.trim()) {
			loadText(text);
			return true;
		}
		const html = dt.getData('text/html');
		if (html.trim() && /<[a-z][\s\S]*>/i.test(html)) {
			loadText(cleanClipboard({ text: '', html }, 'markdown').output);
			return true;
		}
		return false;
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		if (event.dataTransfer) applyClipboard(event.dataTransfer);
	}

	function onPaste(event: ClipboardEvent) {
		if (isTypingTarget(event.target)) return;
		const dt = event.clipboardData;
		if (!dt) return;
		if (applyClipboard(dt)) event.preventDefault();
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
<svelte:window onpaste={onPaste} />

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
	<p class="text-sm font-medium">Soltá un .md o Ctrl+V</p>
	<p class="text-muted-foreground mt-1 text-sm">archivo, markdown o HTML. Después se ve y se edita abajo.</p>
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

{#if brokenEmphasis}
	<Alert.Root class="mb-4">
		<Alert.Title>La negrita no toma</Alert.Title>
		<Alert.Description>
			CommonMark no cierra <code>**13.**Precio</code> (el <code>**</code> queda entre un punto y una letra).
			Con un espacio — <code>**13.** Precio</code> — sí se ve en negrita.
		</Alert.Description>
		<Button size="sm" class="mt-3" type="button" onclick={fixEmphasis}>Corregir negritas</Button>
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
