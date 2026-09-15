<script lang="ts">
	import { enhance } from '$app/forms';
	import { toolBySlug } from '$lib/tools';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ActionData } from './$types';

	const tool = toolBySlug('compress')!;

	let { form }: { form: ActionData } = $props();
	let dragging = $state(false);
	let pending = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);

	const onEnhance: SubmitFunction = () => {
		pending = true;
		return async ({ update }) => {
			await update();
			pending = false;
		};
	};

	function formatBytes(n: number): string {
		if (n < 1024) return `${n} B`;
		if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
		return `${(n / (1024 * 1024)).toFixed(2)} MB`;
	}

	function savings(orig: number, out: number): string {
		if (orig <= 0 || out >= orig) return '0%';
		return `${Math.round((1 - out / orig) * 100)}%`;
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		const files = event.dataTransfer?.files;
		if (!files?.length || !inputEl) return;
		const dt = new DataTransfer();
		for (const file of files) dt.items.add(file);
		inputEl.files = dt.files;
		inputEl.form?.requestSubmit();
	}
</script>

<svelte:head><title>{tool.name} — toolbox</title></svelte:head>

<div class="mb-6 space-y-1">
	<h1 class="text-2xl font-medium tracking-tight">{tool.name}</h1>
	<p class="text-muted-foreground text-sm">{tool.blurb}</p>
	<div class="flex flex-wrap gap-2 pt-2">
		<Badge variant="secondary">offline</Badge>
		<Badge variant="outline">PNG / JPG</Badge>
		<Badge variant="outline">sale en storage/compress</Badge>
	</div>
</div>

<form
	method="POST"
	action="?/compress"
	enctype="multipart/form-data"
	use:enhance={onEnhance}
	class="space-y-4"
>
	<label
		for="images"
		ondragover={(e) => {
			e.preventDefault();
			dragging = true;
		}}
		ondragleave={() => (dragging = false)}
		ondrop={onDrop}
		class="border-input hover:bg-muted/40 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center {dragging
			? 'bg-muted'
			: ''}"
	>
		<p class="text-sm font-medium">Soltá PNG o JPG acá</p>
		<p class="text-muted-foreground mt-1 text-sm">o hacé click para elegir. No sale de la máquina.</p>
		<input
			bind:this={inputEl}
			id="images"
			name="images"
			type="file"
			accept="image/png,image/jpeg,.png,.jpg,.jpeg"
			multiple
			class="sr-only"
			onchange={(e) => {
				const el = e.currentTarget;
				if (el.files?.length) el.form?.requestSubmit();
			}}
		/>
	</label>
	{#if pending}
		<p class="text-muted-foreground text-sm">Comprimiendo…</p>
	{/if}
</form>

{#if form?.message}
	<Alert.Root variant="destructive" class="mt-6">
		<Alert.Title>No pude</Alert.Title>
		<Alert.Description>{form.message}</Alert.Description>
	</Alert.Root>
{/if}

{#if form?.errors?.length}
	<Alert.Root variant="destructive" class="mt-6">
		<Alert.Title>Algunas no pasaron</Alert.Title>
		<Alert.Description>{form.errors.join(' · ')}</Alert.Description>
	</Alert.Root>
{/if}

{#if form?.results?.length}
	<div class="mt-8 grid gap-4">
		{#each form.results as item (item.outputName)}
			<Card.Root>
				<Card.Header>
					<Card.Title class="font-mono text-base">{item.outputName}</Card.Title>
					<Card.Description>
						{item.width}×{item.height}
						{#if item.keptOriginal}
							· no mejoró, dejé el original
						{/if}
					</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-wrap gap-3 text-sm">
					<span>antes {formatBytes(item.originalBytes)}</span>
					<span>después {formatBytes(item.outputBytes)}</span>
					<Badge variant={item.keptOriginal ? 'outline' : 'secondary'}>
						-{savings(item.originalBytes, item.outputBytes)}
					</Badge>
				</Card.Content>
				<Card.Footer class="flex flex-wrap gap-2">
					<Button size="sm" href="/compress/file/{item.outputName}">Bajar</Button>
					<form method="POST" action="?/reveal">
						<input type="hidden" name="name" value={item.outputName} />
						<Button size="sm" variant="outline" type="submit">
							<FolderIcon />
							Mostrar en el explorador
						</Button>
					</form>
				</Card.Footer>
			</Card.Root>
		{/each}
	</div>
{/if}
