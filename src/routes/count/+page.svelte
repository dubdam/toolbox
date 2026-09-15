<script lang="ts">
	import { toolBySlug } from '$lib/tools';
	import { countText, formatCount, formatReading } from '$lib/count';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import * as Card from '$lib/components/ui/card/index.js';

	const tool = toolBySlug('count')!;

	let text = $state('');
	let dragging = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);
	let area = $state<HTMLTextAreaElement | null>(null);
	let selFrom = $state(0);
	let selTo = $state(0);

	const stats = $derived(countText(text));
	const selected = $derived(selFrom !== selTo ? text.slice(selFrom, selTo) : '');
	const selStats = $derived(selected ? countText(selected) : null);

	function rememberSel() {
		if (!area) return;
		selFrom = area.selectionStart;
		selTo = area.selectionEnd;
	}

	async function loadFile(file: File) {
		text = await file.text();
		selFrom = 0;
		selTo = 0;
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) void loadFile(file);
	}

	const rows: Array<{ key: string; label: string; hint: string; value: (s: typeof stats) => string }> =
		[
			{ key: 'words', label: 'Palabras', hint: '', value: (s) => formatCount(s.words) },
			{
				key: 'paragraphs',
				label: 'Párrafos',
				hint: 'líneas con texto',
				value: (s) => formatCount(s.paragraphs)
			},
			{
				key: 'chars',
				label: 'Caracteres',
				hint: 'con espacios',
				value: (s) => formatCount(s.chars)
			},
			{
				key: 'charsNoWs',
				label: 'Sin espacios',
				hint: '',
				value: (s) => formatCount(s.charsNoWs)
			},
			{
				key: 'graphemes',
				label: 'Grafemas',
				hint: 'lo que ves, emojis = 1',
				value: (s) => formatCount(s.graphemes)
			},
			{
				key: 'sentences',
				label: 'Oraciones',
				hint: '',
				value: (s) => formatCount(s.sentences)
			},
			{ key: 'lines', label: 'Líneas', hint: '', value: (s) => formatCount(s.lines) },
			{
				key: 'bytes',
				label: 'Bytes UTF-8',
				hint: 'ñ = 2',
				value: (s) => formatCount(s.bytes)
			},
			{
				key: 'read',
				label: 'Lectura',
				hint: '~200 pal/min',
				value: (s) => formatReading(s.readingMinutes)
			}
		];
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

<label
	for="countfile"
	ondragover={(e) => {
		e.preventDefault();
		dragging = true;
	}}
	ondragleave={() => (dragging = false)}
	ondrop={onDrop}
	class="border-input hover:bg-muted/40 mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-4 text-center text-sm {dragging
		? 'bg-muted'
		: ''}"
>
	<p class="font-medium">Soltá un .txt o .md</p>
	<p class="text-muted-foreground mt-1">o pegá / escribí abajo</p>
	<input
		bind:this={inputEl}
		id="countfile"
		type="file"
		accept=".txt,.md,.markdown,.csv,text/plain,text/markdown"
		class="sr-only"
		onchange={(e) => {
			const file = e.currentTarget.files?.[0];
			if (file) void loadFile(file);
		}}
	/>
</label>

<div class="grid gap-6 md:grid-cols-2">
	<div class="space-y-2">
		<Label for="body">Texto</Label>
		<Textarea
			id="body"
			bind:ref={area}
			bind:value={text}
			rows={18}
			class="font-mono text-sm"
			placeholder="Ctrl+V"
			onselect={rememberSel}
			onkeyup={rememberSel}
			onclick={rememberSel}
		/>
	</div>
	<div class="space-y-3">
		{#if selStats}
			<p class="text-muted-foreground text-xs">Selección · {formatCount(selStats.words)} palabras</p>
		{/if}
		<div class="grid grid-cols-2 gap-3">
			{#each rows as row (row.key)}
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Description>{row.label}</Card.Description>
						<Card.Title class="font-mono text-2xl tabular-nums">
							{row.value(selStats ?? stats)}
						</Card.Title>
					</Card.Header>
					{#if row.hint}
						<Card.Content class="text-muted-foreground pt-0 text-xs">{row.hint}</Card.Content>
					{/if}
				</Card.Root>
			{/each}
		</div>
		{#if selStats}
			<p class="text-muted-foreground text-xs">Los números son de la selección. Click afuera para el total.</p>
		{/if}
	</div>
</div>
