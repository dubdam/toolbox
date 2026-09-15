<script lang="ts">
	import { enhance } from '$app/forms';
	import { toolBySlug } from '$lib/tools';
	import { formatClock, parseTime } from '$lib/cut-time';
	import type { Job } from '$lib/job';
	import type { ProbeOk } from '$lib/cut';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import type { ActionData } from './$types';

	const tool = toolBySlug('cut')!;

	let { data, form }: { data: { binaries: { name: string; path: string | null }[] }; form: ActionData } =
		$props();

	let upload = $state<ProbeOk | null>(null);
	let job = $state<Job | null>(null);
	let jobId = $state<string | null>(null);
	let startRaw = $state('');
	let endRaw = $state('');
	let dragging = $state(false);
	let probing = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);

	const ffmpeg = $derived(data.binaries.find((b) => b.name === 'ffmpeg')?.path);
	const ffprobe = $derived(data.binaries.find((b) => b.name === 'ffprobe')?.path);
	const done = $derived(job?.status === 'done' && Boolean(job.output_path));
	const startSec = $derived(startRaw.trim() ? parseTime(startRaw) : 0);
	const endSec = $derived(endRaw.trim() ? parseTime(endRaw) : null);

	$effect(() => {
		const id = jobId;
		if (!id || typeof EventSource === 'undefined') return;
		const es = new EventSource(`/cut/events/${id}`);
		es.onmessage = (ev) => {
			job = JSON.parse(ev.data) as Job;
			if (job.status === 'done' || job.status === 'error') es.close();
		};
		return () => es.close();
	});

	function formatBytes(n: number): string {
		if (n < 1024) return `${n} B`;
		if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
		return `${(n / (1024 * 1024)).toFixed(2)} MB`;
	}

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
</script>

<svelte:head><title>{tool.name} — toolbox</title></svelte:head>

<div class="mb-6 space-y-1">
	<h1 class="text-2xl font-medium tracking-tight">{tool.name}</h1>
	<p class="text-muted-foreground text-sm">{tool.blurb}</p>
	<div class="flex flex-wrap gap-2 pt-2">
		<Badge variant="secondary">offline</Badge>
		<Badge variant="outline">ffmpeg</Badge>
		<Badge variant="outline">sale en storage/cut</Badge>
	</div>
</div>

{#if !ffmpeg || !ffprobe}
	<Alert.Root variant="destructive" class="mb-6">
		<Alert.Title>Falta {[!ffmpeg && 'ffmpeg', !ffprobe && 'ffprobe'].filter(Boolean).join(' y ')}</Alert.Title>
		<Alert.Description>Instalalo y recargá. Las otras tools no dependen de esto.</Alert.Description>
	</Alert.Root>
{/if}

<form
	method="POST"
	action="?/probe"
	enctype="multipart/form-data"
	class="space-y-4"
	use:enhance={() => {
		probing = true;
		return async ({ result, update }) => {
			await update();
			probing = false;
			if (result.type === 'success') {
				const next = (result.data as { upload?: ProbeOk } | undefined)?.upload;
				if (next) {
					upload = next;
					job = null;
					jobId = null;
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
		<p class="text-muted-foreground mt-1 text-sm">mp4, mkv, webm, mp3, wav… No sale de la máquina.</p>
		<input
			bind:this={inputEl}
			id="file"
			name="file"
			type="file"
			required
			accept="audio/*,video/*"
			class="sr-only"
			onchange={(e) => {
				const el = e.currentTarget;
				if (el.files?.length) el.form?.requestSubmit();
			}}
		/>
	</label>
	{#if probing}
		<p class="text-muted-foreground text-sm">Leyendo duración…</p>
	{/if}
</form>

{#if form && 'probeError' in form && form.probeError}
	<Alert.Root variant="destructive" class="mt-6">
		<Alert.Title>No pude leer el archivo</Alert.Title>
		<Alert.Description>{form.probeError}</Alert.Description>
	</Alert.Root>
{/if}

{#if upload}
	<div class="mt-6 space-y-1 text-sm">
		<p class="font-mono">{upload.name}</p>
		<p class="text-muted-foreground">
			{formatClock(upload.duration)} · {formatBytes(upload.size)}
			{#if upload.hasVideo && upload.width && upload.height}
				· {upload.width}×{upload.height}
			{/if}
			{#if upload.hasAudio && !upload.hasVideo}
				· audio
			{/if}
		</p>
	</div>

	<form
		method="POST"
		action="?/start"
		class="mt-6 space-y-4"
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
		<input type="hidden" name="uploadId" value={upload.uploadId} />
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="space-y-2">
				<Label for="start">Inicio</Label>
				<Input
					id="start"
					name="start"
					bind:value={startRaw}
					class="font-mono"
					placeholder="00:13:42"
				/>
			</div>
			<div class="space-y-2">
				<Label for="end">Fin (vacío = hasta el final)</Label>
				<Input id="end" name="end" bind:value={endRaw} class="font-mono" placeholder="00:17:08" />
			</div>
		</div>
		{#if startSec == null}
			<p class="text-destructive text-sm">Inicio inválido.</p>
		{:else if endRaw.trim() && endSec == null}
			<p class="text-destructive text-sm">Fin inválido.</p>
		{:else if endSec != null && startSec != null && endSec <= startSec}
			<p class="text-destructive text-sm">El fin tiene que ser después del inicio.</p>
		{:else}
			<p class="text-muted-foreground text-xs">
				Fragmento: {formatClock(startSec ?? 0)} → {formatClock(endSec ?? upload.duration)}
				({formatClock((endSec ?? upload.duration) - (startSec ?? 0))})
			</p>
		{/if}
		<div class="flex flex-wrap gap-4 text-sm">
			<label class="flex items-center gap-2">
				<input type="radio" name="kind" value="copy" checked />
				Mismo formato (sin re-encodear)
			</label>
			<label class="flex items-center gap-2">
				<input type="radio" name="kind" value="mp3" disabled={!upload.hasAudio} />
				Audio MP3
			</label>
		</div>
		<Button
			type="submit"
			disabled={!ffmpeg || job?.status === 'running' || job?.status === 'queued' || startSec == null}
		>
			Recortar
		</Button>
	</form>
{/if}

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
			<div class="flex flex-wrap gap-2">
				<Button size="sm" href="/cut/file/{jobId}">Bajar archivo</Button>
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
