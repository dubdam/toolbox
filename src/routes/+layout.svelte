<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { tools } from '$lib/tools';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';

	let { data, children } = $props();

	const missing = $derived(data.binaries.filter((b) => !b.path).length);
</script>

<svelte:head>
	<title>toolbox</title>
</svelte:head>

<div class="flex min-h-svh flex-col">
	<header class="border-b">
		<div class="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
			<a href="/" class="font-medium tracking-tight">toolbox</a>
			<nav class="flex flex-wrap items-center gap-1">
				{#each tools as tool (tool.slug)}
					<a
						href={tool.href}
						class={cn(
							buttonVariants({
								variant: page.url.pathname === tool.href ? 'secondary' : 'ghost',
								size: 'sm'
							})
						)}
					>
						{tool.name}
					</a>
				{/each}
			</nav>
			<div class="ml-auto flex items-center gap-2">
				<Badge variant="outline">127.0.0.1:3460</Badge>
				{#if missing > 0}
					<Badge variant="destructive">{missing} binarios faltan</Badge>
				{:else}
					<Badge variant="secondary">binarios ok</Badge>
				{/if}
			</div>
		</div>
	</header>
	<main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
		{@render children()}
	</main>
</div>
