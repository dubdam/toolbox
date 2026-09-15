<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { tools } from '$lib/tools';
	import { TOOLBOX_URL } from '$lib/origin';
	import { cn } from '$lib/utils.js';

	let { data, children } = $props();

	const required = $derived(new Set(tools.flatMap((t) => t.binaries)));
	const missing = $derived(data.binaries.filter((b) => required.has(b.name) && !b.path).length);
	const current = $derived(tools.find((t) => t.href === page.url.pathname));
	const isHub = $derived(page.url.pathname === '/');
</script>

<svelte:head>
	<title>{current ? `${current.name} — toolbox` : 'toolbox'}</title>
</svelte:head>

<div class="flex min-h-svh flex-col">
	<header class="border-rule border-b">
		<div class="mx-auto flex max-w-5xl items-baseline justify-between gap-4 px-4 py-3">
			<div class="flex min-w-0 items-baseline gap-3">
				<a href="/" class="font-display text-ink text-lg tracking-tight no-underline">
					toolbox
				</a>
				{#if current}
					<span class="text-ink-mute" aria-hidden="true">/</span>
					<span class="text-ink truncate text-sm">{current.name}</span>
				{/if}
			</div>
			<div class="font-mono flex shrink-0 items-baseline gap-3 text-[11px] tracking-wide">
				<a href={TOOLBOX_URL} class="text-ink-mute hidden no-underline sm:inline">{TOOLBOX_URL.replace('http://', '')}</a>
				{#if missing > 0}
					<span class="text-red-800">{missing} binarios</span>
				{:else}
					<span class="text-ink-mute">local</span>
				{/if}
			</div>
		</div>
		{#if !isHub}
			<nav class="mx-auto flex max-w-5xl flex-wrap gap-x-3 gap-y-1 px-4 pb-3 font-mono text-[11px] tracking-wide">
				{#each tools as tool (tool.slug)}
					<a
						href={tool.href}
						class={cn(
							'no-underline',
							page.url.pathname === tool.href
								? 'text-ink underline decoration-brass underline-offset-4'
								: 'text-ink-mute hover:text-ink'
						)}
					>
						{tool.name}
					</a>
				{/each}
			</nav>
		{/if}
	</header>
	<main class="mx-auto w-full max-w-5xl flex-1 px-4 {isHub ? 'py-5' : 'py-8'}">
		{@render children()}
	</main>
</div>
