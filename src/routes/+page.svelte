<script lang="ts">
	import { tools } from '$lib/tools';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';

	let { data } = $props();

	function missingFor(binaries: string[]): string[] {
		return binaries.filter((name) => !data.binaries.find((b) => b.name === name)?.path);
	}
</script>

<div class="mb-8 space-y-1">
	<h1 class="text-2xl font-medium tracking-tight">Ferretería local</h1>
	<p class="text-muted-foreground text-sm">
		El archivo no sale de la máquina, salvo transcripción (OpenAI). Entrá, usá la tool, andate.
	</p>
</div>

<div class="grid gap-4 sm:grid-cols-2">
	{#each tools as tool (tool.slug)}
		{@const missing = missingFor(tool.binaries)}
		<Card.Root>
			<Card.Header>
				<Card.Title>{tool.name}</Card.Title>
				<Card.Description>{tool.blurb}</Card.Description>
			</Card.Header>
			<Card.Footer class="flex flex-wrap items-center gap-2">
				{#if tool.needsNet}
					<Badge variant="outline">sale a internet</Badge>
				{:else}
					<Badge variant="secondary">offline</Badge>
				{/if}
				{#if missing.length}
					<Badge variant="destructive">falta {missing.join(', ')}</Badge>
				{/if}
				<a href={tool.href} class={cn(buttonVariants({ size: 'sm' }), 'ml-auto')}>Abrir</a>
			</Card.Footer>
		</Card.Root>
	{/each}
</div>
