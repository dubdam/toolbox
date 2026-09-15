<script lang="ts">
	import { enhance } from '$app/forms';
	import { toolBySlug } from '$lib/tools';
	import { HASH_ALGOS, type HashAlgo } from '$lib/hash-parse';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ActionData } from './$types';

	const tool = toolBySlug('hash')!;
	const labels: Record<HashAlgo, string> = {
		md5: 'MD5',
		sha1: 'SHA-1',
		sha256: 'SHA-256',
		sha512: 'SHA-512',
		blake3: 'BLAKE3'
	};

	let { form }: { form: ActionData } = $props();
	let dragging = $state(false);
	let pending = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);
	let copied = $state<string | null>(null);
	let expected = $state('');
	let text = $state('');

	const results = $derived(form && 'results' in form ? form.results : undefined);
	const sameContent = $derived(
		results && results.length >= 2 && results.every((r) => r.sha256 === results[0]!.sha256)
	);
	const different = $derived(
		results && results.length >= 2 && results.some((r) => r.sha256 !== results[0]!.sha256)
	);

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

	async function copy(value: string, key: string) {
		await navigator.clipboard.writeText(value);
		copied = key;
		setTimeout(() => {
			if (copied === key) copied = null;
		}, 1200);
	}
</script>

<svelte:head><title>{tool.name} — toolbox</title></svelte:head>

<div class="mb-6 space-y-1">
	<h1 class="text-2xl font-medium tracking-tight">{tool.name}</h1>
	<p class="text-muted-foreground text-sm">{tool.blurb}</p>
	<div class="flex flex-wrap gap-2 pt-2">
		<Badge variant="secondary">offline</Badge>
		<Badge variant="outline">archivo o texto UTF-8</Badge>
	</div>
</div>

<form method="POST" action="?/hash" enctype="multipart/form-data" use:enhance={onEnhance} class="space-y-4">
	<label
		for="files"
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
		<p class="text-sm font-medium">Soltá uno o más archivos</p>
		<p class="text-muted-foreground mt-1 text-sm">Dos archivos = comparar. No sale de la máquina.</p>
		<input
			bind:this={inputEl}
			id="files"
			name="files"
			type="file"
			multiple
			class="sr-only"
			onchange={(e) => {
				const el = e.currentTarget;
				if (el.files?.length) el.form?.requestSubmit();
			}}
		/>
	</label>
	<div class="space-y-2">
		<Label for="text">O pegá un texto</Label>
		<Textarea
			id="text"
			name="text"
			rows={5}
			class="font-mono text-sm"
			placeholder="se hashea en UTF-8, tal cual lo pegás"
			bind:value={text}
		/>
		<p class="text-muted-foreground text-xs">
			Incluye saltos de línea y espacios. Vacío no se hashea: usá un archivo vacío si hace falta.
		</p>
	</div>
	<div class="space-y-2">
		<Label for="expected">Hash publicado (opcional)</Label>
		<Input
			id="expected"
			name="expected"
			class="font-mono"
			placeholder="sha256:… o el hex suelto"
			bind:value={expected}
		/>
		<p class="text-muted-foreground text-xs">
			Si lo llenás, soltá el archivo y se verifica. Acepta sha256sum, SHA256 (file) =, o hex.
		</p>
	</div>
	<Button type="submit" disabled={pending}>Hashear</Button>
	{#if pending}
		<p class="text-muted-foreground text-sm">Hasheando…</p>
	{/if}
</form>

{#if form && 'message' in form && form.message}
	<Alert.Root variant="destructive" class="mt-6">
		<Alert.Title>No pude</Alert.Title>
		<Alert.Description>{form.message}</Alert.Description>
	</Alert.Root>
{/if}

{#if sameContent}
	<Alert.Root class="mt-6">
		<Alert.Title>Mismo contenido</Alert.Title>
		<Alert.Description>Los {results!.length} tienen el mismo SHA-256.</Alert.Description>
	</Alert.Root>
{/if}
{#if different}
	<Alert.Root variant="destructive" class="mt-6">
		<Alert.Title>No coinciden</Alert.Title>
		<Alert.Description>Hay al menos un SHA-256 distinto.</Alert.Description>
	</Alert.Root>
{/if}

{#if results?.length}
	<div class="mt-8 grid gap-4">
		{#each results as item (item.name + item.sha256)}
			<Card.Root>
				<Card.Header>
					<Card.Title class="font-mono text-base">{item.name}</Card.Title>
					<Card.Description>
						{formatBytes(item.bytes)}{item.kind === 'text' ? ' · UTF-8' : ''}
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					{#if item.match}
						{#if item.match.ok}
							<Badge variant="secondary">coincide ({item.match.algo})</Badge>
						{:else}
							<Badge variant="destructive">no coincide con el hash publicado</Badge>
						{/if}
					{/if}
					{#each HASH_ALGOS as algo (algo)}
						<div class="flex flex-wrap items-start gap-2">
							<span class="text-muted-foreground w-20 shrink-0 pt-1 text-xs">{labels[algo]}</span>
							<code class="min-w-0 flex-1 break-all font-mono text-xs">{item[algo]}</code>
							<Button
								size="sm"
								variant="ghost"
								onclick={() => copy(item[algo], `${item.name}-${algo}`)}
							>
								{#if copied === `${item.name}-${algo}`}
									<CheckIcon />
								{:else}
									<CopyIcon />
								{/if}
							</Button>
						</div>
					{/each}
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
{/if}
