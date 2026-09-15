<script lang="ts">
	import { toolBySlug } from '$lib/tools';
	import { encodeQr, matrixToRgba, QR_ECC, qrSvg, type QrEcc } from '$lib/qr';
	import {
		buildQrPayload,
		QR_KIND_LABELS,
		QR_KINDS,
		type BitcoinFields,
		type EmailFields,
		type EventFields,
		type GeoFields,
		type QrKind,
		type SmsFields,
		type VcardFields,
		type WhatsappFields,
		type WifiFields
	} from '$lib/qr-payload';
	import { cleanUrl } from '$lib/urls';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import jsQR from 'jsqr';

	const tool = toolBySlug('qr')!;

	let tab = $state<'create' | 'read'>('create');
	let kind = $state<QrKind>('url');
	let ecc = $state<QrEcc>('M');
	let text = $state('');
	let url = $state('');
	let wifi = $state<WifiFields>({ ssid: '', password: '', auth: 'WPA', hidden: false });
	let bitcoin = $state<BitcoinFields>({ address: '', amount: '', label: '', message: '' });
	let vcard = $state<VcardFields>({ fn: '', tel: '', email: '', url: '', org: '' });
	let email = $state<EmailFields>({ to: '', subject: '', body: '' });
	let phone = $state('');
	let sms = $state<SmsFields>({ number: '', body: '' });
	let whatsapp = $state<WhatsappFields>({ number: '', text: '' });
	let geo = $state<GeoFields>({ lat: '', lng: '', query: '' });
	let event = $state<EventFields>({ title: '', start: '', end: '', location: '', details: '' });
	let lightning = $state('');
	let nostr = $state('');
	let copied = $state(false);
	let dragging = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);
	let decoded = $state<string | null>(null);
	let decodeError = $state<string | null>(null);
	let reading = $state(false);

	const payload = $derived(
		buildQrPayload(kind, {
			text,
			url,
			wifi,
			bitcoin,
			vcard,
			email,
			phone,
			sms,
			whatsapp,
			geo,
			event,
			lightning,
			nostr
		})
	);
	const encoded = $derived(payload ? encodeQr(payload, ecc) : null);
	const eccInfo = $derived(QR_ECC.find((e) => e.id === ecc)!);
	const svg = $derived(qrSvg(payload, ecc));
	const svgUrl = $derived(
		svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : ''
	);
	const decodedClean = $derived(decoded ? cleanUrl(decoded) : null);

	async function copyPayload() {
		if (!payload) return;
		await navigator.clipboard.writeText(payload);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 1500);
	}

	function download(filename: string, blob: Blob) {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = filename;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	function downloadSvg() {
		if (!svg) return;
		download(`qr-${kind}.svg`, new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
	}

	function downloadPng() {
		const qr = encodeQr(payload, ecc);
		if (!qr) return;
		const { pixels, width, height } = matrixToRgba(qr.data, 8);
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d')!;
		const img = ctx.createImageData(width, height);
		img.data.set(pixels);
		ctx.putImageData(img, 0, 0);
		canvas.toBlob((blob) => {
			if (blob) download(`qr-${kind}.png`, blob);
		}, 'image/png');
	}

	async function readFile(file: File) {
		reading = true;
		decodeError = null;
		decoded = null;
		try {
			const bitmap = await createImageBitmap(file);
			const canvas = document.createElement('canvas');
			canvas.width = bitmap.width;
			canvas.height = bitmap.height;
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				decodeError = 'no pude leer la imagen';
				return;
			}
			ctx.drawImage(bitmap, 0, 0);
			const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const result = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
			if (!result?.data) {
				decodeError = 'no encontré un QR en la imagen';
				return;
			}
			decoded = result.data;
		} catch {
			decodeError = 'no pude abrir la imagen';
		} finally {
			reading = false;
		}
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) void readFile(file);
	}

	async function copyDecoded() {
		if (!decoded) return;
		await navigator.clipboard.writeText(decoded);
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
		<Badge variant="outline">sin cámara (v1)</Badge>
	</div>
</div>

<div class="mb-6 flex flex-wrap gap-4 text-sm">
	<label class="flex items-center gap-2">
		<input type="radio" bind:group={tab} value="create" />
		Crear
	</label>
	<label class="flex items-center gap-2">
		<input type="radio" bind:group={tab} value="read" />
		Leer
	</label>
</div>

{#if tab === 'create'}
	<div class="mb-4 flex flex-wrap gap-2 text-sm">
		{#each QR_KINDS as id (id)}
			<label class="border-input has-[:checked]:bg-secondary flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1">
				<input type="radio" bind:group={kind} value={id} class="sr-only" />
				{QR_KIND_LABELS[id]}
			</label>
		{/each}
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<div class="space-y-4">
			{#if kind === 'text'}
				<div class="space-y-2">
					<Label for="qr-text">Texto</Label>
					<Textarea id="qr-text" rows={6} class="font-mono text-sm" bind:value={text} />
				</div>
			{:else if kind === 'url'}
				<div class="space-y-2">
					<Label for="qr-url">URL</Label>
					<Input id="qr-url" class="font-mono" placeholder="https://…" bind:value={url} />
				</div>
			{:else if kind === 'wifi'}
				<div class="space-y-2">
					<Label for="ssid">SSID</Label>
					<Input id="ssid" bind:value={wifi.ssid} />
				</div>
				<div class="space-y-2">
					<Label>Autenticación</Label>
					<div class="flex flex-wrap gap-3 text-sm">
						{#each ['WPA', 'WEP', 'nopass'] as auth (auth)}
							<label class="flex items-center gap-2">
								<input type="radio" bind:group={wifi.auth} value={auth} />
								{auth === 'nopass' ? 'Abierta' : auth}
							</label>
						{/each}
					</div>
				</div>
				{#if wifi.auth !== 'nopass'}
					<div class="space-y-2">
						<Label for="wifi-pass">Contraseña</Label>
						<Input id="wifi-pass" type="password" bind:value={wifi.password} />
					</div>
				{/if}
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" bind:checked={wifi.hidden} />
					Red oculta
				</label>
			{:else if kind === 'bitcoin'}
				<div class="space-y-2">
					<Label for="btc-addr">Dirección</Label>
					<Input id="btc-addr" class="font-mono" bind:value={bitcoin.address} placeholder="bc1…" />
				</div>
				<div class="space-y-2">
					<Label for="btc-amount">Monto (opcional, BTC)</Label>
					<Input id="btc-amount" class="font-mono" bind:value={bitcoin.amount} placeholder="0.01" />
				</div>
				<div class="space-y-2">
					<Label for="btc-label">Label (opcional)</Label>
					<Input id="btc-label" bind:value={bitcoin.label} />
				</div>
				<div class="space-y-2">
					<Label for="btc-msg">Mensaje (opcional)</Label>
					<Input id="btc-msg" bind:value={bitcoin.message} />
				</div>
			{:else if kind === 'vcard'}
				<div class="space-y-2">
					<Label for="v-fn">Nombre</Label>
					<Input id="v-fn" bind:value={vcard.fn} />
				</div>
				<div class="space-y-2">
					<Label for="v-tel">Teléfono</Label>
					<Input id="v-tel" bind:value={vcard.tel} />
				</div>
				<div class="space-y-2">
					<Label for="v-email">Email</Label>
					<Input id="v-email" type="email" bind:value={vcard.email} />
				</div>
				<div class="space-y-2">
					<Label for="v-url">URL</Label>
					<Input id="v-url" bind:value={vcard.url} />
				</div>
				<div class="space-y-2">
					<Label for="v-org">Organización</Label>
					<Input id="v-org" bind:value={vcard.org} />
				</div>
			{:else if kind === 'email'}
				<div class="space-y-2">
					<Label for="em-to">Para</Label>
					<Input id="em-to" type="email" bind:value={email.to} placeholder="nombre@dominio.com" />
				</div>
				<div class="space-y-2">
					<Label for="em-subj">Asunto (opcional)</Label>
					<Input id="em-subj" bind:value={email.subject} />
				</div>
				<div class="space-y-2">
					<Label for="em-body">Cuerpo (opcional)</Label>
					<Textarea id="em-body" rows={4} bind:value={email.body} />
				</div>
			{:else if kind === 'phone'}
				<div class="space-y-2">
					<Label for="tel">Número</Label>
					<Input id="tel" bind:value={phone} placeholder="+54 9 11 …" />
				</div>
			{:else if kind === 'sms'}
				<div class="space-y-2">
					<Label for="sms-n">Número</Label>
					<Input id="sms-n" bind:value={sms.number} placeholder="+54 9 11 …" />
				</div>
				<div class="space-y-2">
					<Label for="sms-b">Mensaje (opcional)</Label>
					<Textarea id="sms-b" rows={3} bind:value={sms.body} />
				</div>
			{:else if kind === 'whatsapp'}
				<div class="space-y-2">
					<Label for="wa-n">Número con código de país</Label>
					<Input id="wa-n" bind:value={whatsapp.number} placeholder="54911…" />
				</div>
				<div class="space-y-2">
					<Label for="wa-t">Mensaje (opcional)</Label>
					<Textarea id="wa-t" rows={3} bind:value={whatsapp.text} />
				</div>
			{:else if kind === 'geo'}
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-2">
						<Label for="geo-lat">Latitud</Label>
						<Input id="geo-lat" class="font-mono" bind:value={geo.lat} placeholder="-34.60" />
					</div>
					<div class="space-y-2">
						<Label for="geo-lng">Longitud</Label>
						<Input id="geo-lng" class="font-mono" bind:value={geo.lng} placeholder="-58.38" />
					</div>
				</div>
				<div class="space-y-2">
					<Label for="geo-q">O un lugar (si no hay coords)</Label>
					<Input id="geo-q" bind:value={geo.query} placeholder="Plaza de Mayo, CABA" />
				</div>
			{:else if kind === 'event'}
				<div class="space-y-2">
					<Label for="ev-title">Título</Label>
					<Input id="ev-title" bind:value={event.title} />
				</div>
				<div class="space-y-2">
					<Label for="ev-start">Inicio</Label>
					<Input id="ev-start" type="datetime-local" bind:value={event.start} />
				</div>
				<div class="space-y-2">
					<Label for="ev-end">Fin (opcional)</Label>
					<Input id="ev-end" type="datetime-local" bind:value={event.end} />
				</div>
				<div class="space-y-2">
					<Label for="ev-loc">Lugar (opcional)</Label>
					<Input id="ev-loc" bind:value={event.location} />
				</div>
				<div class="space-y-2">
					<Label for="ev-det">Detalle (opcional)</Label>
					<Textarea id="ev-det" rows={3} bind:value={event.details} />
				</div>
			{:else if kind === 'lightning'}
				<div class="space-y-2">
					<Label for="ln">Invoice o LNURL</Label>
					<Textarea id="ln" rows={4} class="font-mono text-sm" bind:value={lightning} placeholder="lnbc1… o lnurl1…" />
				</div>
			{:else if kind === 'nostr'}
				<div class="space-y-2">
					<Label for="nostr">npub, note, nevent…</Label>
					<Textarea id="nostr" rows={3} class="font-mono text-sm" bind:value={nostr} placeholder="npub1…" />
				</div>
			{/if}

			<div class="space-y-2">
				<Label>Qué tan resistente</Label>
				<p class="text-muted-foreground text-xs">
					Cuanto más alta, más pedazos del QR pueden faltar y igual se lee. El código se ve más denso.
				</p>
				<div class="grid gap-2">
					{#each QR_ECC as level (level.id)}
						<label class="border-input has-[:checked]:bg-secondary flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm">
							<input type="radio" bind:group={ecc} value={level.id} class="mt-1" />
							<span>
								<span class="font-medium">{level.id} · {level.name}</span>
								<span class="text-muted-foreground"> · aguanta {level.recovery} tapado. {level.when}</span>
							</span>
						</label>
					{/each}
				</div>
			</div>
		</div>

		<div class="space-y-3">
			{#if svgUrl}
				<img src={svgUrl} alt="QR" class="bg-white w-64 border p-2" width="256" height="256" />
				{#if encoded}
					<p class="text-muted-foreground text-xs">
						{encoded.size}×{encoded.size} módulos · {eccInfo.id} aguanta {eccInfo.recovery} tapado
					</p>
				{/if}
				<div class="flex flex-wrap gap-2">
					<Button size="sm" type="button" onclick={downloadPng}>PNG</Button>
					<Button size="sm" variant="outline" type="button" onclick={downloadSvg}>SVG</Button>
					<Button size="sm" variant="outline" type="button" onclick={copyPayload}>
						{#if copied}
							<CheckIcon />
							Copiado
						{:else}
							<CopyIcon />
							Copiar payload
						{/if}
					</Button>
				</div>
				<pre class="text-muted-foreground max-h-32 overflow-auto font-mono text-xs break-all whitespace-pre-wrap">{payload}</pre>
			{:else}
				<p class="text-muted-foreground text-sm">Completá el campo y aparece el QR.</p>
			{/if}
		</div>
	</div>
{:else}
	<label
		for="qrfile"
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
		<p class="text-sm font-medium">Soltá una foto del QR</p>
		<p class="text-muted-foreground mt-1 text-sm">PNG, JPG, WebP. Se lee acá, no sale.</p>
		<input
			bind:this={inputEl}
			id="qrfile"
			type="file"
			accept="image/*"
			class="sr-only"
			onchange={(e) => {
				const file = e.currentTarget.files?.[0];
				if (file) void readFile(file);
			}}
		/>
	</label>
	{#if reading}
		<p class="text-muted-foreground mt-4 text-sm">Leyendo…</p>
	{/if}
	{#if decodeError}
		<Alert.Root variant="destructive" class="mt-4">
			<Alert.Title>No pude leerlo</Alert.Title>
			<Alert.Description>{decodeError}</Alert.Description>
		</Alert.Root>
	{/if}
	{#if decoded}
		<div class="mt-4 space-y-2">
			<div class="flex items-center justify-between gap-2">
				<Label for="decoded">Contenido</Label>
				<Button size="sm" variant="outline" onclick={copyDecoded}>
					{#if copied}
						<CheckIcon />
						Copiado
					{:else}
						<CopyIcon />
						Copiar
					{/if}
				</Button>
			</div>
			<Textarea id="decoded" value={decoded} rows={6} readonly class="font-mono text-sm" />
			{#if decodedClean && !decodedClean.error && decodedClean.changed}
				<p class="text-muted-foreground text-sm">
					URL limpia: <span class="font-mono break-all">{decodedClean.output}</span>
				</p>
			{/if}
		</div>
	{/if}
{/if}
