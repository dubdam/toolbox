<script lang="ts">
	import { enhance } from '$app/forms';
	import { toolBySlug } from '$lib/tools';
	import type { Job } from '$lib/job';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import type { ActionData } from './$types';

	const tool = toolBySlug('download')!;

	let { data, form }: { data: { binaries: { name: string; path: string | null }[] }; form: ActionData } =
		$props();

	let job = $state<Job | null>(null);
	let jobId = $state<string | null>(null);
	let kind = $state<'video' | 'audio'>('video');

	const ytdlp = $derived(data.binaries.find((b) => b.name === 'yt-dlp')?.path);
	const ffmpeg = $derived(data.binaries.find((b) => b.name === 'ffmpeg')?.path);
	const done = $derived(job?.status === 'done' && Boolean(job.output_path));

	$effect(() => {
		const id = jobId;
		if (!id || typeof EventSource === 'undefined') return;
		const es = new EventSource(`/download/events/${id}`);
		es.onmessage = (ev) => {
			job = JSON.parse(ev.data) as Job;
			if (job.status === 'done' || job.status === 'error') es.close();
		};
		return () => es.close();
	});
</script>

<svelte:head><title>{tool.name} — toolbox</title></svelte:head>

<div class="mb-6 space-y-1">
	<h1 class="text-2xl font-medium tracking-tight">{tool.name}</h1>
	<p class="text-muted-foreground text-sm">{tool.blurb}</p>
	<div class="flex flex-wrap gap-2 pt-2">
		<Badge variant="outline">el server sale a internet</Badge>
		<Badge variant="outline">yt-dlp + ffmpeg</Badge>
		<Badge variant="outline">sale en storage/downloads</Badge>
	</div>
</div>

{#if !ytdlp}
	<Alert.Root variant="destructive" class="mb-6">
		<Alert.Title>Falta yt-dlp</Alert.Title>
		<Alert.Description>Instalalo y recargá. ffmpeg: {ffmpeg ? 'ok' : 'también falta'}.</Alert.Description>
	</Alert.Root>
{/if}

<form
	method="POST"
	action="?/start"
	class="space-y-4"
	use:enhance={() => {
		return async ({ result, update }) => {
			await update();
			if (result.type === 'success') {
				const id = (result.data as { jobId?: string } | undefined)?.jobId;
				if (id) {
					jobId = id;
					job = null;
				}
			}
		};
	}}
>
	<div class="space-y-2">
		<Label for="url">URL de YouTube o X</Label>
		<Input
			id="url"
			name="url"
			type="url"
			required
			placeholder="https://x.com/…/status/… o https://youtube.com/watch?v=…"
			class="font-mono"
		/>
	</div>
	<div class="flex flex-wrap gap-4 text-sm">
		<label class="flex items-center gap-2">
			<input type="radio" name="kind" value="video" bind:group={kind} />
			Video
		</label>
		<label class="flex items-center gap-2">
			<input type="radio" name="kind" value="audio" bind:group={kind} disabled={!ffmpeg} />
			Audio (mp3)
		</label>
	</div>
	{#if kind === 'video'}
		<div class="space-y-2">
			<Label for="quality">Resolución máxima</Label>
			<select
				id="quality"
				name="quality"
				class="border-input bg-background h-8 rounded-lg border px-2 text-sm"
			>
				<option value="best">Mejor disponible</option>
				<option value="1080">1080p</option>
				<option value="720" selected>720p</option>
				<option value="480">480p</option>
				<option value="360">360p</option>
			</select>
			<p class="text-muted-foreground text-xs">
				Si no hay esa altura, yt-dlp baja la más cercana por debajo.
			</p>
		</div>
	{:else}
		<input type="hidden" name="quality" value="best" />
	{/if}
	<Button type="submit" disabled={!ytdlp || job?.status === 'running' || job?.status === 'queued'}>
		Bajar
	</Button>
</form>

{#if form?.startError}
	<Alert.Root variant="destructive" class="mt-6">
		<Alert.Title>No pude empezar</Alert.Title>
		<Alert.Description>{form.startError}</Alert.Description>
	</Alert.Root>
{/if}
{#if form?.revealError}
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
			<div class="flex flex-wrap gap-2">
				<Button size="sm" href="/download/file/{jobId}">Bajar archivo</Button>
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
