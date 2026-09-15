<script lang="ts">
	import { toolBySlug } from '$lib/tools';
	import { cleanText, type CleanResult } from '$lib/urls';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CopyIcon from '@lucide/svelte/icons/copy';

	const tool = toolBySlug('urls')!;

	let dirty = $state('');
	let copied = $state(false);

	const results: CleanResult[] = $derived(cleanText(dirty));
	const cleanBlock = $derived(results.map((r) => r.output).join('\n'));
	const anyChange = $derived(results.some((r) => r.changed));
	const errors = $derived(results.filter((r) => r.error));
	const removed = $derived(results.flatMap((r) => r.removed));
	const unwrapped = $derived(results.filter((r) => r.unwrapped).length);

	async function copyClean() {
		if (!cleanBlock) return;
		await navigator.clipboard.writeText(cleanBlock);
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

<div class="grid gap-6 md:grid-cols-2">
	<div class="space-y-2">
		<Label for="dirty">Pegá una o más URLs</Label>
		<Textarea
			id="dirty"
			bind:value={dirty}
			rows={8}
			class="font-mono text-sm"
			placeholder="https://x.com/…?s=20&t=…"
		/>
	</div>
	<div class="space-y-2">
		<div class="flex items-center justify-between gap-2">
			<Label for="clean">Limpia</Label>
			<Button size="sm" variant="outline" disabled={!cleanBlock} onclick={copyClean}>
				{#if copied}
					<CheckIcon />
					Copiado
				{:else}
					<CopyIcon />
					Copiar
				{/if}
			</Button>
		</div>
		<Textarea id="clean" value={cleanBlock} rows={8} readonly class="font-mono text-sm" />
	</div>
</div>

{#if results.length}
	<div class="mt-6 space-y-3">
		{#if !anyChange && errors.length === 0}
			<p class="text-muted-foreground text-sm">Ya estaba limpia.</p>
		{/if}
		{#if unwrapped}
			<p class="text-sm">Se desarmó {unwrapped} redirector{unwrapped === 1 ? '' : 'es'} (Google/Facebook/etc.), sin pedir nada a la red.</p>
		{/if}
		{#if removed.length}
			<div class="flex flex-wrap gap-2">
				{#each removed as param, i (`${param.name}-${i}`)}
					<Badge variant="outline" class="font-mono">{param.name}</Badge>
				{/each}
			</div>
		{/if}
		{#if errors.length}
			<Alert.Root variant="destructive">
				<Alert.Title>No pude parsear {errors.length} línea{errors.length === 1 ? '' : 's'}</Alert.Title>
				<Alert.Description>
					{errors.map((e) => e.input).join(' · ')}
				</Alert.Description>
			</Alert.Root>
		{/if}
	</div>
{/if}
