import { domainToUnicode, isMixedScript } from './idn';

export interface RemovedParam {
	name: string;
	value: string;
}

export interface QueryParam {
	name: string;
	value: string;
	tracking: boolean;
	where: 'query' | 'hash';
}

export interface HostInfo {
	ascii: string;
	unicode: string;
	punycode: boolean;
	mixedScript: boolean;
}

export interface CleanResult {
	input: string;
	output: string;
	changed: boolean;
	removed: RemovedParam[];
	params: QueryParam[];
	host: HostInfo | null;
	unwrapped: boolean;
	amp: boolean;
	mobile: boolean;
	error: string | null;
}

const GLOBAL_EXACT = new Set([
	'fbclid',
	'fb_action_ids',
	'fb_action_types',
	'fb_source',
	'fb_ref',
	'gclid',
	'gclsrc',
	'dclid',
	'gbraid',
	'wbraid',
	'gad_source',
	'gad_campaignid',
	'msclkid',
	'twclid',
	'ttclid',
	'ndclid',
	'yclid',
	'ysclid',
	'igshid',
	'igsh',
	'mibextid',
	'epik',
	'rdt_cid',
	'li_fat_id',
	'srsltid',
	'mc_cid',
	'mc_eid',
	'_hsenc',
	'_hsmi',
	'mkt_tok',
	'vero_id',
	'nr_email_referer',
	'oly_anon_id',
	'oly_enc_id',
	'wickedid',
	'irclickid',
	'icid',
	'_openstat',
	'spm',
	'scm',
	'ncid',
	'mc_tc',
	'otc',
	'cmpid',
	'campaign_id',
	'echobox',
	'xtor'
]);

const GLOBAL_PREFIX = ['utm_', 'mtm_', 'pk_', 'hsa_', 'pd_rd_', 'pf_rd_'];

const YOUTUBE_STRIP = new Set(['si', 'feature', 'pp', 'embeds_referring_euri', 'embeds_referring_origin']);
const TWITTER_STRIP = new Set(['s', 't', 'ref_src', 'ref_url', 'cn', 'src']);
const INSTAGRAM_STRIP = new Set(['igshid', 'igsh']);
const AMAZON_STRIP = new Set(['tag', 'ref', 'ref_', 'ie', 'psc', 'th', 'crid', 'sprefix', 'dib', 'dib_tag']);
const FACEBOOK_STRIP = new Set(['h', 'eav', 'sfnsn', 'ref', 'refsrc', '__tn__', 'app', 'extid']);

function hostOf(url: URL): string {
	return url.hostname.toLowerCase().replace(/^www\./, '');
}

function isYoutube(host: string): boolean {
	return host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com' || host === 'music.youtube.com';
}

function isTwitter(host: string): boolean {
	return host === 'x.com' || host === 'twitter.com' || host === 'mobile.twitter.com';
}

function isInstagram(host: string): boolean {
	return host === 'instagram.com' || host === 'instagr.am';
}

function isAmazon(host: string): boolean {
	return host === 'amazon.com' || host.startsWith('amazon.') || host.endsWith('.amazon.com');
}

function isFacebook(host: string): boolean {
	return host === 'facebook.com' || host === 'fb.com' || host === 'm.facebook.com' || host.endsWith('.facebook.com');
}

function isTrackingParam(name: string, host: string): boolean {
	const n = name.toLowerCase();
	if (GLOBAL_EXACT.has(n)) return true;
	if (GLOBAL_PREFIX.some((p) => n.startsWith(p))) return true;
	if (isYoutube(host) && YOUTUBE_STRIP.has(n)) return true;
	if (isTwitter(host) && TWITTER_STRIP.has(n)) return true;
	if (isInstagram(host) && INSTAGRAM_STRIP.has(n)) return true;
	if (isAmazon(host) && AMAZON_STRIP.has(n)) return true;
	if (isFacebook(host) && FACEBOOK_STRIP.has(n)) return true;
	return false;
}

function parseLoose(raw: string): URL | null {
	const text = raw.trim();
	if (!text) return null;
	try {
		return new URL(text);
	} catch {
		/* try with scheme */
	}
	if (/^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(text)) {
		try {
			return new URL(`https://${text}`);
		} catch {
			return null;
		}
	}
	return null;
}

function firstParam(url: URL, names: string[]): string | null {
	for (const name of names) {
		const value = url.searchParams.get(name);
		if (value) return value;
	}
	return null;
}

function unwrapRedirect(url: URL): URL | null {
	const host = hostOf(url);
	const path = url.pathname;

	if (host === 'google.com' || host.endsWith('.google.com') || /^google\.[a-z.]+$/.test(host)) {
		if (path === '/url' || path === '/url/') {
			const inner = firstParam(url, ['q', 'url']);
			if (inner) return parseLoose(inner);
		}
	}

	if (isFacebook(host) || host === 'l.facebook.com' || host === 'lm.facebook.com' || host === 'l.instagram.com') {
		if (path === '/l.php' || path === '/l.php/') {
			const inner = firstParam(url, ['u']);
			if (inner) return parseLoose(inner);
		}
	}

	if (host === 'youtube.com' || host === 'm.youtube.com') {
		if (path === '/redirect') {
			const inner = firstParam(url, ['q']);
			if (inner) return parseLoose(inner);
		}
	}

	if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) {
		const inner = firstParam(url, ['url', 'session_redirect']);
		if (inner && (path.includes('/redir') || path.includes('/safety/go'))) {
			return parseLoose(inner);
		}
	}

	if (host === 'duckduckgo.com' && path.startsWith('/l/')) {
		const inner = firstParam(url, ['uddg']);
		if (inner) return parseLoose(inner);
	}

	if (host === 'href.li') {
		const rest = url.href.slice(url.origin.length + 1);
		if (rest.startsWith('http')) return parseLoose(decodeURIComponent(rest.replace(/^\?/, '')));
	}

	return null;
}

function withHost(url: URL, hostname: string): URL {
	const next = new URL(url.toString());
	next.hostname = hostname;
	return next;
}

function unwrapAmp(url: URL): URL | null {
	const host = hostOf(url);
	const path = url.pathname;

	const viewer =
		host === 'google.com' ||
		host.endsWith('.google.com') ||
		host === 'cdn.ampproject.org' ||
		host.endsWith('.cdn.ampproject.org');

	if (viewer) {
		const m =
			path.match(/^\/(?:amp|c|v)\/s\/(.+)$/i) ??
			path.match(/^\/(?:amp|c|v)\/(.+)$/i);
		if (m?.[1]) {
			const dest = parseLoose(`https://${m[1]}`);
			if (dest) return dest;
		}
	}

	if (/\/amp\/?$/i.test(path) && path.toLowerCase() !== '/amp' && path.toLowerCase() !== '/amp/') {
		const next = new URL(url.toString());
		next.pathname = path.replace(/\/amp\/?$/i, '') || '/';
		return next;
	}

	if (/\.amp\.html$/i.test(path)) {
		const next = new URL(url.toString());
		next.pathname = path.replace(/\.amp\.html$/i, '.html');
		return next;
	}

	return null;
}

function stripAmpParams(url: URL): boolean {
	const drop = new Set(['amp', 'amp_js_v', 'amp_gsa', 'usqp']);
	let changed = false;
	const keep = new URLSearchParams();
	for (const [name, value] of url.searchParams.entries()) {
		const n = name.toLowerCase();
		if (drop.has(n) || ((n === 'output' || n === 'outputtype') && value.toLowerCase() === 'amp')) {
			changed = true;
			continue;
		}
		keep.append(name, value);
	}
	if (changed) url.search = keep.toString();
	return changed;
}

function unwrapMobile(url: URL): URL | null {
	const host = hostOf(url);
	const map: Record<string, string> = {
		'm.youtube.com': 'youtube.com',
		'm.wikipedia.org': 'wikipedia.org',
		'mobile.twitter.com': 'x.com',
		'm.twitter.com': 'x.com',
		'mobile.x.com': 'x.com',
		'm.facebook.com': 'www.facebook.com',
		'touch.facebook.com': 'www.facebook.com',
		'm.instagram.com': 'www.instagram.com',
		'm.reddit.com': 'www.reddit.com',
		'i.reddit.com': 'www.reddit.com',
		'm.imdb.com': 'www.imdb.com'
	};
	if (map[host]) return withHost(url, map[host]);
	const wiki = host.match(/^([a-z]{2,3})\.m\.wikipedia\.org$/);
	if (wiki) return withHost(url, `${wiki[1]}.wikipedia.org`);
	if (host.startsWith('m.amazon.')) return withHost(url, `www.${host.slice(2)}`);
	return null;
}

function listParams(url: URL): QueryParam[] {
	const host = hostOf(url);
	const out: QueryParam[] = [];
	for (const [name, value] of url.searchParams.entries()) {
		out.push({ name, value, tracking: isTrackingParam(name, host), where: 'query' });
	}
	if (url.hash.length > 1 && url.hash.includes('=')) {
		try {
			const params = new URLSearchParams(url.hash.slice(1));
			for (const [name, value] of params.entries()) {
				out.push({ name, value, tracking: isTrackingParam(name, host), where: 'hash' });
			}
		} catch {
			/* ignore malformed hash */
		}
	}
	return out;
}

function hostInfo(url: URL): HostInfo {
	const ascii = url.hostname;
	const unicode = domainToUnicode(ascii);
	return {
		ascii,
		unicode,
		punycode: /xn--/i.test(ascii) || ascii !== unicode,
		mixedScript: isMixedScript(unicode)
	};
}

function blankResult(input: string, error: string | null): CleanResult {
	return {
		input,
		output: error ? input : '',
		changed: false,
		removed: [],
		params: [],
		host: null,
		unwrapped: false,
		amp: false,
		mobile: false,
		error
	};
}

function stripParams(url: URL): RemovedParam[] {
	const host = hostOf(url);
	const removed: RemovedParam[] = [];
	const keep = new URLSearchParams();

	for (const [name, value] of url.searchParams.entries()) {
		if (isTrackingParam(name, host)) {
			removed.push({ name, value });
		} else {
			keep.append(name, value);
		}
	}

	url.search = keep.toString();
	return removed;
}

function stripHashTracking(url: URL): RemovedParam[] {
	if (!url.hash || url.hash.length < 2) return [];
	const body = url.hash.slice(1);
	if (!body.includes('=')) return [];
	try {
		const params = new URLSearchParams(body);
		const host = hostOf(url);
		const keep = new URLSearchParams();
		const removed: RemovedParam[] = [];
		for (const [name, value] of params.entries()) {
			if (isTrackingParam(name, host)) removed.push({ name, value });
			else keep.append(name, value);
		}
		if (removed.length) {
			const next = keep.toString();
			url.hash = next ? `#${next}` : '';
		}
		return removed;
	} catch {
		return [];
	}
}

function splitUrls(raw: string): string[] {
	const matches = [...raw.matchAll(/https?:\/\//gi)];
	if (matches.length === 0) {
		return raw
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
	}
	const parts: string[] = [];
	for (let i = 0; i < matches.length; i++) {
		const start = matches[i].index ?? 0;
		const end = i + 1 < matches.length ? (matches[i + 1].index ?? raw.length) : raw.length;
		const chunk = raw.slice(start, end).trim();
		if (chunk) parts.push(chunk);
	}
	return parts;
}

export function cleanUrl(raw: string): CleanResult {
	const input = raw.trim();
	if (!input) return blankResult(input, null);

	let url = parseLoose(input);
	if (!url) return blankResult(input, 'no es una URL');

	let unwrapped = false;
	let amp = false;
	let mobile = false;
	for (let i = 0; i < 5; i++) {
		const inner = unwrapRedirect(url);
		if (!inner) break;
		url = inner;
		unwrapped = true;
	}

	const ampUrl = unwrapAmp(url);
	if (ampUrl) {
		url = ampUrl;
		amp = true;
	}
	if (stripAmpParams(url)) amp = true;

	const mobileUrl = unwrapMobile(url);
	if (mobileUrl) {
		url = mobileUrl;
		mobile = true;
	}

	const params = listParams(url);
	const host = hostInfo(url);
	const removed = [...stripParams(url), ...stripHashTracking(url)];

	let output = url.toString();
	if (output.endsWith('/') && !input.trim().endsWith('/') && url.pathname === '/' && !url.search && !url.hash) {
		output = output.slice(0, -1);
	}
	if (output.endsWith('?')) output = output.slice(0, -1);

	return {
		input,
		output,
		changed: output !== input,
		removed,
		params,
		host,
		unwrapped,
		amp,
		mobile,
		error: null
	};
}

export function cleanText(raw: string): CleanResult[] {
	return splitUrls(raw).map(cleanUrl);
}
