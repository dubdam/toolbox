export const QR_KINDS = [
	'url',
	'text',
	'wifi',
	'email',
	'phone',
	'sms',
	'whatsapp',
	'vcard',
	'geo',
	'event',
	'bitcoin',
	'lightning',
	'nostr'
] as const;
export type QrKind = (typeof QR_KINDS)[number];

export const QR_KIND_LABELS: Record<QrKind, string> = {
	url: 'URL',
	text: 'Texto',
	wifi: 'Wi-Fi',
	email: 'Email',
	phone: 'Teléfono',
	sms: 'SMS',
	whatsapp: 'WhatsApp',
	vcard: 'Contacto',
	geo: 'Ubicación',
	event: 'Evento',
	bitcoin: 'Bitcoin',
	lightning: 'Lightning',
	nostr: 'Nostr'
};

export type WifiAuth = 'WPA' | 'WEP' | 'nopass';

export interface WifiFields {
	ssid: string;
	password: string;
	auth: WifiAuth;
	hidden: boolean;
}

export interface BitcoinFields {
	address: string;
	amount: string;
	label: string;
	message: string;
}

export interface VcardFields {
	fn: string;
	tel: string;
	email: string;
	url: string;
	org: string;
}

export interface EmailFields {
	to: string;
	subject: string;
	body: string;
}

export interface SmsFields {
	number: string;
	body: string;
}

export interface WhatsappFields {
	number: string;
	text: string;
}

export interface GeoFields {
	lat: string;
	lng: string;
	query: string;
}

export interface EventFields {
	title: string;
	start: string;
	end: string;
	location: string;
	details: string;
}

export interface QrInput {
	text?: string;
	url?: string;
	wifi?: WifiFields;
	bitcoin?: BitcoinFields;
	vcard?: VcardFields;
	email?: EmailFields;
	phone?: string;
	sms?: SmsFields;
	whatsapp?: WhatsappFields;
	geo?: GeoFields;
	event?: EventFields;
	lightning?: string;
	nostr?: string;
}

function wifiEscape(value: string): string {
	return value.replace(/([\\;,:"])/g, '\\$1');
}

function vcardEscape(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

export function wifiPayload(f: WifiFields): string {
	const ssid = f.ssid.trim();
	if (!ssid) return '';
	let out = `WIFI:T:${f.auth};S:${wifiEscape(ssid)};`;
	if (f.auth !== 'nopass') out += `P:${wifiEscape(f.password)};`;
	if (f.hidden) out += 'H:true;';
	return `${out};`;
}

export function bitcoinPayload(f: BitcoinFields): string {
	const address = f.address.trim();
	if (!address) return '';
	const q = new URLSearchParams();
	if (f.amount.trim()) q.set('amount', f.amount.trim());
	if (f.label.trim()) q.set('label', f.label.trim());
	if (f.message.trim()) q.set('message', f.message.trim());
	const qs = q.toString();
	return qs ? `bitcoin:${address}?${qs}` : `bitcoin:${address}`;
}

export function vcardPayload(f: VcardFields): string {
	const fn = f.fn.trim();
	if (!fn) return '';
	const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${vcardEscape(fn)}`, `N:${vcardEscape(fn)}`];
	if (f.org.trim()) lines.push(`ORG:${vcardEscape(f.org.trim())}`);
	if (f.tel.trim()) lines.push(`TEL:${vcardEscape(f.tel.trim())}`);
	if (f.email.trim()) lines.push(`EMAIL:${vcardEscape(f.email.trim())}`);
	if (f.url.trim()) lines.push(`URL:${vcardEscape(f.url.trim())}`);
	lines.push('END:VCARD');
	return lines.join('\r\n');
}

export function urlPayload(raw: string): string {
	const t = raw.trim();
	if (!t) return '';
	if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return t;
	return `https://${t}`;
}

export function mailtoPayload(f: EmailFields): string {
	const to = f.to.trim();
	if (!to) return '';
	const q = new URLSearchParams();
	if (f.subject.trim()) q.set('subject', f.subject.trim());
	if (f.body.trim()) q.set('body', f.body.trim());
	const qs = q.toString();
	return qs ? `mailto:${to}?${qs}` : `mailto:${to}`;
}

export function telPayload(number: string): string {
	const n = number.trim().replace(/[\s()-]/g, '');
	if (!n) return '';
	return `tel:${n}`;
}

export function smsPayload(f: SmsFields): string {
	const n = f.number.trim().replace(/[\s()-]/g, '');
	if (!n) return '';
	return f.body.trim() ? `SMSTO:${n}:${f.body}` : `SMSTO:${n}`;
}

export function whatsappPayload(f: WhatsappFields): string {
	const digits = f.number.trim().replace(/[^\d]/g, '');
	if (!digits) return '';
	const q = f.text.trim() ? `?text=${encodeURIComponent(f.text.trim())}` : '';
	return `https://wa.me/${digits}${q}`;
}

export function geoPayload(f: GeoFields): string {
	const query = f.query.trim();
	const lat = f.lat.trim();
	const lng = f.lng.trim();
	if (lat && lng) {
		return query ? `geo:${lat},${lng}?q=${encodeURIComponent(query)}` : `geo:${lat},${lng}`;
	}
	if (query) return `geo:0,0?q=${encodeURIComponent(query)}`;
	return '';
}

export function icsStamp(local: string): string {
	const m = local
		.trim()
		.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
	if (!m) return '';
	return `${m[1]}${m[2]}${m[3]}T${m[4] ?? '00'}${m[5] ?? '00'}${m[6] ?? '00'}`;
}

export function eventPayload(f: EventFields): string {
	const title = f.title.trim();
	const start = icsStamp(f.start);
	if (!title || !start) return '';
	const lines = ['BEGIN:VEVENT', `SUMMARY:${vcardEscape(title)}`, `DTSTART:${start}`];
	const end = icsStamp(f.end);
	if (end) lines.push(`DTEND:${end}`);
	if (f.location.trim()) lines.push(`LOCATION:${vcardEscape(f.location.trim())}`);
	if (f.details.trim()) lines.push(`DESCRIPTION:${vcardEscape(f.details.trim())}`);
	lines.push('END:VEVENT');
	return lines.join('\r\n');
}

export function lightningPayload(raw: string): string {
	const t = raw.trim();
	if (!t) return '';
	if (/^lightning:/i.test(t) || /^lnurl/i.test(t)) return t;
	if (/^ln(bc|tb|bcrt)/i.test(t)) return `lightning:${t}`;
	return t;
}

export function nostrPayload(raw: string): string {
	const t = raw.trim();
	if (!t) return '';
	if (/^nostr:/i.test(t)) return t;
	if (/^(npub|note|nevent|nprofile|naddr|nrelay)1/i.test(t)) return `nostr:${t}`;
	return t;
}

export function buildQrPayload(kind: QrKind, input: QrInput): string {
	if (kind === 'text') return (input.text ?? '').trim();
	if (kind === 'url') return urlPayload(input.url ?? '');
	if (kind === 'wifi') return input.wifi ? wifiPayload(input.wifi) : '';
	if (kind === 'bitcoin') return input.bitcoin ? bitcoinPayload(input.bitcoin) : '';
	if (kind === 'vcard') return input.vcard ? vcardPayload(input.vcard) : '';
	if (kind === 'email') return input.email ? mailtoPayload(input.email) : '';
	if (kind === 'phone') return telPayload(input.phone ?? '');
	if (kind === 'sms') return input.sms ? smsPayload(input.sms) : '';
	if (kind === 'whatsapp') return input.whatsapp ? whatsappPayload(input.whatsapp) : '';
	if (kind === 'geo') return input.geo ? geoPayload(input.geo) : '';
	if (kind === 'event') return input.event ? eventPayload(input.event) : '';
	if (kind === 'lightning') return lightningPayload(input.lightning ?? '');
	if (kind === 'nostr') return nostrPayload(input.nostr ?? '');
	return '';
}
