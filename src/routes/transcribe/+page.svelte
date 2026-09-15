<script lang="ts">
	import { enhance } from '$app/forms';
	import { toolBySlug } from '$lib/tools';
	import type { Job } from '$lib/job';
	import { TRANSCRIBE_MODELS, TRANSCRIBE_MODEL_LABELS } from '$lib/transcribe-models';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import type { ActionData } from './$types';

	const tool = toolBySlug('transcribe')!;

	let { data, form }: { data: { binaries: { name: string; path: string | null }[] }; form: ActionData } =
		$props();

	let job = $state<Job | null>(null);
	let jobId = $state<string | null>(null);
	let transcript = $state('');
	let dragging = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);

	const ffmpeg = $derived(data.binaries.find((b) => b.name === 'ffmpeg')?.path);
	const done = $derived(job?.status === 'done' && Boolean(job.output_path));

	$effect(() => {
		const id = jobId;
		if (!id || typeof EventSource === 'undefined') return;
		const es = new EventSource(`/transcribe/events/${id}`);
		es.onmessage = (ev) => {
			job = JSON.parse(ev.data) as Job;
			if (job.status === 'done' || job.status === 'error') es.close();
		};
		return () => es.close();
	});

	$effect(() => {
		const id = jobId;
		if (!id || !done) return;
		void fetch(`/transcribe/file/${id}?raw=1`)
			.then((r) => (r.ok ? r.text() : ''))
			.then((t) => {
				transcript = t;
			});
	});

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		const file = event.dataTransfer?.files?.[0];
		if (!file || !inputEl) return;
		const dt = new DataTransfer();
		dt.items.add(file);
		inputEl.files = dt.files;
	}
</script>

<svelte:head><title>{tool.name} — toolbox</title></svelte:head>

<div class="mb-6 space-y-1">
	<h1 class="text-2xl font-medium tracking-tight">{tool.name}</h1>
	<p class="text-muted-foreground text-sm">{tool.blurb}</p>
	<div class="flex flex-wrap gap-2 pt-2">
		<Badge variant="outline">el audio sale a OpenAI</Badge>
		<Badge variant="outline">el browser no</Badge>
		{#if ffmpeg}
			<Badge variant="secondary">ffmpeg ok</Badge>
		{:else}
			<Badge variant="destructive">sin ffmpeg (hace falta para video)</Badge>
		{/if}
	</div>
</div>

<form
	method="POST"
	action="?/start"
	enctype="multipart/form-data"
	class="space-y-4"
	use:enhance={() => {
		return async ({ result, update }) => {
			await update();
			if (result.type === 'success') {
				const id = (result.data as { jobId?: string } | undefined)?.jobId;
				if (id) {
					jobId = id;
					job = null;
					transcript = '';
				}
			}
		};
	}}
>
	<label
		for="file"
		ondragover={(e) => {
			e.preventDefault();
			dragging = true;
		}}
		ondragleave={() => (dragging = false)}
		ondrop={onDrop}
		class="border-input hover:bg-muted/40 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center {dragging
			? 'bg-muted'
			: ''}"
	>
		<p class="text-sm font-medium">Soltá un audio o video</p>
		<p class="text-muted-foreground mt-1 text-sm">mp3, m4a, wav, mp4… OpenAI admite hasta 25 MB de audio.</p>
		<input
			bind:this={inputEl}
			id="file"
			name="file"
			type="file"
			required
			accept="audio/*,video/mp4,video/webm,video/quicktime"
			class="sr-only"
		/>
	</label>

	<div class="space-y-2">
		<Label>Modelo</Label>
		<div class="flex flex-col gap-2 text-sm">
			{#each TRANSCRIBE_MODELS as m (m)}
				<label class="flex items-center gap-2">
					<input type="radio" name="model" value={m} checked={m === 'gpt-transcribe'} />
					{TRANSCRIBE_MODEL_LABELS[m]}
				</label>
			{/each}
		</div>
	</div>

	<Button type="submit" disabled={job?.status === 'running' || job?.status === 'queued'}>
		Transcribir
	</Button>
</form>

{#if form && 'startError' in form && form.startError}
	<Alert.Root variant="destructive" class="mt-6">
		<Alert.Title>No pude empezar</Alert.Title>
		<Alert.Description>{form.startError}</Alert.Description>
	</Alert.Root>
{/if}
{#if form && 'revealError' in form && form.revealError}
	<Alert.Root variant="destructive" class="mt-6">
		<Alert.Title>No pude abrir el explorador</Alert.Title>
		<Alert.Description>{form.revealError}</Alert.Description>
	</Alert.Root>
{/if}

{#if job}
	<div class="mt-8 space-y-3">
		<Progress value={job.progress} />
		<p class="text-muted-foreground font-mono text-sm">{job.message ?? job.status}</p>
		{#if job.status === 'error'}
			<Alert.Root variant="destructive">
				<Alert.Title>Falló</Alert.Title>
				<Alert.Description>{job.message}</Alert.Description>
			</Alert.Root>
		{/if}
		{#if done && jobId}
			<Textarea value={transcript} rows={12} readonly class="font-mono text-sm" />
			<div class="flex flex-wrap gap-2">
				<Button size="sm" href="/transcribe/file/{jobId}">Bajar .txt</Button>
				<form method="POST" action="?/reveal" use:enhance>
					<input type="hidden" name="jobId" value={jobId} />
					<Button size="sm" variant="outline" type="submit">
						<FolderIcon />
						Mostrar en el explorador
					</Button>
				</form>
			</div>
		{/if}
	</div>
{/if}
