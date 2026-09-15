<script lang="ts">
	import { tools, toolGroups } from '$lib/tools';

	let { data } = $props();

	function missingFor(binaries: string[]): string[] {
		return binaries.filter((name) => !data.binaries.find((b) => b.name === name)?.path);
	}

	const grouped = $derived(
		toolGroups.map((g) => ({
			...g,
			items: tools.filter((t) => t.group === g.id)
		}))
	);
</script>

<p class="text-ink-mute mb-6 text-sm">
	El archivo no sale — salvo transcripción (OpenAI).
</p>

<div class="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4">
	{#each grouped as group (group.id)}
		<section>
			<h2 class="font-mono text-ink-mute mb-2 border-b border-rule pb-1 text-[11px] tracking-wide uppercase">
				{group.label}
			</h2>
			<ul>
				{#each group.items as tool (tool.slug)}
					{@const missing = missingFor(tool.binaries)}
					<li>
						<a href={tool.href} class="hover:bg-wash -mx-2 block rounded px-2 py-1.5 no-underline">
							<span class="text-ink flex items-baseline gap-2 text-sm font-medium">
								{tool.name}
								{#if tool.needsNet}
									<span class="font-mono text-ink-mute text-[10px] font-normal tracking-wide uppercase">sale</span>
								{/if}
								{#if missing.length}
									<span class="font-mono text-[10px] font-normal text-red-800">{missing.join(', ')}</span>
								{/if}
							</span>
							<span class="text-ink-mute mt-0.5 block text-xs leading-snug">{tool.blurb}</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>
