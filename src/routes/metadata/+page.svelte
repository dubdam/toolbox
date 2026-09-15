<script lang="ts">
	import { enhance } from '$app/forms';
	import { toolBySlug } from '$lib/tools';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ActionData } from './$types';

	const tool = toolBySlug('metadata')!;

	let { data, form }: { data: { binaries: { name: string; path: string | null }[] }; form: ActionData } =
		$props();

	let dragging = $state(false);
	let pending = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);

	const exiftool = $derived(data.binaries.find((b) => b.name === 'exiftool')?.path);
	const ffmpeg = $derived(data.binaries.find((b) => b.name === 'ffmpeg')?.path);
	const result = $derived(form?.result);
	const sensitive = $derived(result?.fields.filter((f) => f.sensitive) ?? []);
	const rest = $derived(result?.fields.filter((f) => !f.sensitive) ?? []);

	const onEnhance: SubmitFunction = () => {
		pending = true;
		return async ({ update }) => {
			await update();
			pending = false;
		};
	};

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		const file = event.dataTransfer?.files?.[0];
		if (!file || !inputEl) return;
		const dt = new DataTransfer();
		dt.items.add(file);
		inputEl.files = dt.files;
		inputEl.form?.requestSubmit();
	}

	function howLabel(how: string | null): string {
		if (how === 'exiftool') return 'exiftool (sin re-encodear)';
		if (how === 'sharp') return 'sharp (re-encodea la foto)';
		if (how === 'ffmpeg') return 'ffmpeg (-map_metadata -1, copy)';
		return 'no hay motor de strip';
	}
</script>

<svelte:head><title>{tool.name} — toolbox</title></svelte:head>

<div class="mb-6 space-y-1">
	<h1 class="text-2xl font-medium tracking-tight">{tool.name}</h1>
	<p class="text-muted-foreground text-sm">{tool.blurb}</p>
	<div class="flex flex-wrap gap-2 pt-2">
		<Badge variant="secondary">offline</Badge>
		<Badge variant="outline">foto / video / audio</Badge>
		{#if exiftool}
			<Badge variant="secondary">exiftool ok</Badge>
		{:else}
			<Badge variant="outline">sin exiftool · fotos con exifr/sharp</Badge>
		{/if}
		{#if ffmpeg}
			<Badge variant="outline">ffmpeg ok</Badge>
		{/if}
	</div>
</div>

<form
	method="POST"
	action="?/inspect"
	enctype="multipart/form-data"
	use:enhance={onEnhance}
	class="space-y-4"
>
	<label
		for="file"
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
		<p class="text-sm font-medium">Soltá una foto, video o audio</p>
		<p class="text-muted-foreground mt-1 text-sm">GPS, cámara, fechas. No sale de la máquina.</p>
		<input
			bind:this={inputEl}
			id="file"
			name="file"
			type="file"
			accept="image/jpeg,image/png,image/webp,video/*,audio/*"
			class="sr-only"
			onchange={(e) => {
				const el = e.currentTarget;
				if (el.files?.length) el.form?.requestSubmit();
			}}
		/>
	</label>
	{#if pending}
		<p class="text-muted-foreground text-sm">Leyendo…</p>
	{/if}
</form>

{#if form?.message}
	<Alert.Root variant="destructive" class="mt-6">
		<Alert.Title>No pude</Alert.Title>
		<Alert.Description>{form.message}</Alert.Description>
	</Alert.Root>
{/if}

{#if result}
	<div class="mt-8 space-y-4">
		<div class="flex flex-wrap items-center gap-2">
			<p class="font-mono text-sm">{result.storedName}</p>
			{#if result.sensitiveCount}
				<Badge variant="destructive">{result.sensitiveCount} sensibles (GPS/serial)</Badge>
			{:else}
				<Badge variant="secondary">sin GPS/serial a la vista</Badge>
			{/if}
			{#if form?.stripped}
				<Badge variant="secondary">strip hecho</Badge>
			{/if}
		</div>

		{#if result.stripHow}
			<form method="POST" action="?/strip" use:enhance={onEnhance}>
				<input type="hidden" name="name" value={result.storedName} />
				<Button type="submit" size="sm">Sacar metadatos ({howLabel(result.stripHow)})</Button>
			</form>
		{:else}
			<p class="text-muted-foreground text-sm">
				Para strippear este tipo de archivo instalá exiftool.
			</p>
		{/if}

		<div class="flex flex-wrap gap-2">
			<Button size="sm" variant="outline" href="/metadata/file/{encodeURIComponent(result.storedName)}">
				Bajar
			</Button>
			<form method="POST" action="?/reveal" use:enhance>
				<input type="hidden" name="name" value={result.storedName} />
				<Button size="sm" variant="outline" type="submit">
					<FolderIcon />
					Mostrar en el explorador
				</Button>
			</form>
		</div>

		{#if !result.fields.length}
			<p class="text-muted-foreground text-sm">No encontré tags. El archivo puede no tener metadatos.</p>
		{:else}
			<div class="overflow-x-auto rounded-lg border text-sm">
				<table class="w-full">
					<tbody>
						{#each [...sensitive, ...rest] as field (`${field.key}-${field.value.slice(0, 24)}`)}
							<tr class="border-b last:border-0 {field.sensitive ? 'bg-destructive/10' : ''}">
								<td class="text-muted-foreground w-1/3 px-3 py-2 align-top font-mono text-xs"
									>{field.key}</td
								>
								<td class="px-3 py-2 break-all font-mono text-xs">{field.value}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
{/if}
