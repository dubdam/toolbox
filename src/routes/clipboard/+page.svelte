<script lang="ts">
	import { toolBySlug } from '$lib/tools';
	import { cleanClipboard, type ClipMode } from '$lib/clipboard';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CopyIcon from '@lucide/svelte/icons/copy';

	const tool = toolBySlug('clipboard')!;

	let dirty = $state('');
	let lastHtml = $state<string | null>(null);
	let mode = $state<ClipMode>('markdown');
	let copied = $state(false);
	let fromPaste = false;

	const result = $derived(cleanClipboard({ text: dirty, html: lastHtml }, mode));

	const sourceLabel: Record<string, string> = {
		word: 'Word',
		gdocs: 'Google Docs',
		notion: 'Notion',
		html: 'HTML',
		text: 'texto'
	};

	function onPaste(event: ClipboardEvent) {
		const html = event.clipboardData?.getData('text/html') ?? '';
		const text = event.clipboardData?.getData('text/plain') ?? '';
		if (html.trim() && /<[a-z][\s\S]*>/i.test(html)) {
			event.preventDefault();
			fromPaste = true;
			lastHtml = html;
			dirty = text;
		} else {
			lastHtml = null;
		}
	}

	function onInput() {
		if (fromPaste) {
			fromPaste = false;
			return;
		}
		lastHtml = null;
	}

	async function copyClean() {
		if (!result.output) return;
		await navigator.clipboard.writeText(result.output);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 1500);
	}
</script>

<svelte:head><title>{tool.name} — toolbox</title></svelte:head>

<div class="mb-6 space-y-1">
	<h1 class="text-2xl font-medium tracking-tight">{tool.name}</h1>
	<p class="text-muted-foreground text-sm">{tool.blurb}</p>
	<div class="flex flex-wrap gap-2 pt-2">
		<Badge variant="secondary">offline</Badge>
		<Badge variant="outline">no sale a internet</Badge>
	</div>
</div>

<div class="mb-4 flex flex-wrap gap-4 text-sm">
	<label class="flex items-center gap-2">
		<input type="radio" bind:group={mode} value="markdown" />
		Markdown
	</label>
	<label class="flex items-center gap-2">
		<input type="radio" bind:group={mode} value="plain" />
		Plaintext
	</label>
</div>

<div class="grid gap-6 md:grid-cols-2">
	<div class="space-y-2">
		<Label for="dirty">Pegá acá (Word, Notion, Docs, web…)</Label>
		<Textarea
			id="dirty"
			bind:value={dirty}
			rows={14}
			class="font-mono text-sm"
			placeholder="Ctrl+V"
			onpaste={onPaste}
			oninput={onInput}
		/>
	</div>
	<div class="space-y-2">
		<div class="flex items-center justify-between gap-2">
			<Label for="clean">Limpio</Label>
			<Button size="sm" variant="outline" disabled={!result.output} onclick={copyClean}>
				{#if copied}
					<CheckIcon />
					Copiado
				{:else}
					<CopyIcon />
					Copiar
				{/if}
			</Button>
		</div>
		<Textarea id="clean" value={result.output} rows={14} readonly class="font-mono text-sm" />
	</div>
</div>

{#if dirty || lastHtml}
	<div class="mt-6 flex flex-wrap gap-2">
		{#if result.hadHtml}
			<Badge variant="secondary">origen: {sourceLabel[result.source]}</Badge>
		{/if}
		{#if result.invisibleChars}
			<Badge variant="outline">{result.invisibleChars} invisibles</Badge>
		{/if}
		{#if result.urlsCleaned}
			<Badge variant="outline">{result.urlsCleaned} URL{result.urlsCleaned === 1 ? '' : 's'} limpias</Badge>
		{/if}
		{#if result.urlsUnwrapped}
			<Badge variant="outline">{result.urlsUnwrapped} unwrap</Badge>
		{/if}
		{#if !result.hadHtml && !result.invisibleChars && !result.urlsCleaned}
			<p class="text-muted-foreground text-sm">Nada que limpiar.</p>
		{/if}
	</div>
{/if}
