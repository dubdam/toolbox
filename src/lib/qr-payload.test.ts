import { describe, expect, test } from 'bun:test';
import { bitcoinPayload, buildQrPayload, urlPayload, vcardPayload, wifiPayload } from './qr-payload';

describe('wifiPayload', () => {
	test('WPA with escaped ssid', () => {
		expect(
			wifiPayload({ ssid: 'Cafe;WiFi', password: 'p:ass,word', auth: 'WPA', hidden: false })
		).toBe('WIFI:T:WPA;S:Cafe\\;WiFi;P:p\\:ass\\,word;;');
	});

	test('open network', () => {
		expect(wifiPayload({ ssid: 'Libre', password: 'ignored', auth: 'nopass', hidden: true })).toBe(
			'WIFI:T:nopass;S:Libre;H:true;;'
		);
	});

	test('empty ssid', () => {
		expect(wifiPayload({ ssid: '  ', password: 'x', auth: 'WPA', hidden: false })).toBe('');
	});
});

describe('bitcoinPayload', () => {
	test('address only', () => {
		expect(bitcoinPayload({ address: 'bc1qtest', amount: '', label: '', message: '' })).toBe(
			'bitcoin:bc1qtest'
		);
	});

	test('with amount and label', () => {
		const out = bitcoinPayload({
			address: 'bc1qtest',
			amount: '0.01',
			label: 'cafe',
			message: ''
		});
		expect(out.startsWith('bitcoin:bc1qtest?')).toBe(true);
		expect(out).toContain('amount=0.01');
		expect(out).toContain('label=cafe');
	});
});

describe('vcardPayload', () => {
	test('minimal fn', () => {
		const out = vcardPayload({ fn: 'Ada Lovelace', tel: '', email: '', url: '', org: '' });
		expect(out).toContain('BEGIN:VCARD');
		expect(out).toContain('FN:Ada Lovelace');
		expect(out).toContain('END:VCARD');
	});

	test('escapes commas', () => {
		const out = vcardPayload({ fn: 'Doe, Jane', tel: '', email: '', url: '', org: '' });
		expect(out).toContain('FN:Doe\\, Jane');
	});
});

describe('urlPayload', () => {
	test('adds https if missing', () => {
		expect(urlPayload('example.com/a')).toBe('https://example.com/a');
		expect(urlPayload('https://example.com')).toBe('https://example.com');
	});
});

describe('buildQrPayload', () => {
	test('text', () => {
		expect(buildQrPayload('text', { text: '  hola  ' })).toBe('hola');
	});
});

describe('new payloads', () => {
	test('mailto', () => {
		expect(buildQrPayload('email', { email: { to: 'a@b.com', subject: 'Hola', body: '' } })).toBe(
			'mailto:a@b.com?subject=Hola'
		);
	});

	test('tel and sms', () => {
		expect(buildQrPayload('phone', { phone: '+54 9 11 5555-0000' })).toBe('tel:+5491155550000');
		expect(buildQrPayload('sms', { sms: { number: '+54911', body: 'ya llego' } })).toBe(
			'SMSTO:+54911:ya llego'
		);
	});

	test('whatsapp strips to digits', () => {
		expect(buildQrPayload('whatsapp', { whatsapp: { number: '+54 9 11 1234', text: 'hola' } })).toBe(
			'https://wa.me/549111234?text=hola'
		);
	});

	test('geo coords or query', () => {
		expect(buildQrPayload('geo', { geo: { lat: '-34.6', lng: '-58.4', query: '' } })).toBe(
			'geo:-34.6,-58.4'
		);
		expect(buildQrPayload('geo', { geo: { lat: '', lng: '', query: 'Plaza de Mayo' } })).toBe(
			'geo:0,0?q=Plaza%20de%20Mayo'
		);
	});

	test('event ics stamp', () => {
		const out = buildQrPayload('event', {
			event: {
				title: 'Meetup',
				start: '2026-09-15T18:00',
				end: '2026-09-15T20:00',
				location: 'CABA',
				details: ''
			}
		});
		expect(out).toContain('BEGIN:VEVENT');
		expect(out).toContain('DTSTART:20260915T180000');
		expect(out).toContain('DTEND:20260915T200000');
		expect(out).toContain('SUMMARY:Meetup');
	});

	test('lightning and nostr prefixes', () => {
		expect(buildQrPayload('lightning', { lightning: 'lnbc1abc' })).toBe('lightning:lnbc1abc');
		expect(buildQrPayload('lightning', { lightning: 'lightning:lnbc1abc' })).toBe(
			'lightning:lnbc1abc'
		);
		expect(buildQrPayload('nostr', { nostr: 'npub1abc' })).toBe('nostr:npub1abc');
		expect(buildQrPayload('nostr', { nostr: 'nostr:note1abc' })).toBe('nostr:note1abc');
	});
});
