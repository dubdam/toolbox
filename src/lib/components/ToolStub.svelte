<script lang="ts">
	import type { BinaryStatus, ToolDef } from '$lib/tools';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';

	let { tool, binaries }: { tool: ToolDef; binaries: BinaryStatus[] } = $props();

	const required = $derived(
		tool.binaries.map((name) => binaries.find((b) => b.name === name) ?? { name, path: null })
	);
	const missing = $derived(required.filter((b) => !b.path));
</script>

<div class="mb-6 space-y-1">
	<h1 class="text-2xl font-medium tracking-tight">{tool.name}</h1>
	<p class="text-muted-foreground text-sm">{tool.blurb}</p>
	<div class="flex flex-wrap gap-2 pt-2">
		{#if tool.needsNet}
			<Badge variant="outline">el server sale a internet</Badge>
		{:else}
			<Badge variant="secondary">offline</Badge>
		{/if}
		<Badge variant="outline">salida en storage/</Badge>
	</div>
</div>

{#if required.length}
	<div class="mb-6 space-y-2">
		<p class="text-sm font-medium">Binarios</p>
		<ul class="text-muted-foreground space-y-1 font-mono text-sm">
			{#each required as bin (bin.name)}
				<li>
					{bin.name}
					{#if bin.path}
						— {bin.path}
					{:else}
						— no está en PATH
					{/if}
				</li>
			{/each}
		</ul>
	</div>
{/if}

{#if missing.length}
	<Alert.Root variant="destructive" class="mb-6">
		<Alert.Title>Faltan binarios</Alert.Title>
		<Alert.Description>
			Instalá {missing.map((b) => b.name).join(', ')} y recargá. Las otras tools no dependen de
			esto.
		</Alert.Description>
	</Alert.Root>
{/if}

<Alert.Root>
	<Alert.Title>Todavía no hace el trabajo</Alert.Title>
	<Alert.Description>
		Scaffold. La tool está ruteada y los motores se detectan; la acción viene después.
	</Alert.Description>
</Alert.Root>
