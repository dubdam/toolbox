export function parseTime(raw: string): number | null {
	const t = raw.trim();
	if (!t) return null;
	if (/^\d+(\.\d+)?$/.test(t)) {
		const n = Number(t);
		return Number.isFinite(n) && n >= 0 ? n : null;
	}
	const parts = t.split(':');
	if (parts.length < 2 || parts.length > 3) return null;
	const nums = parts.map((p) => (/^\d+(\.\d+)?$/.test(p) ? Number(p) : NaN));
	if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
	const sec = nums[nums.length - 1]!;
	const min = nums[nums.length - 2]!;
	const hour = parts.length === 3 ? nums[0]! : 0;
	if (sec >= 60) return null;
	if (parts.length === 3 && min >= 60) return null;
	return hour * 3600 + min * 60 + sec;
}

export function formatFfmpegTime(seconds: number): string {
	const ms = Math.max(0, Math.round(seconds * 1000));
	const h = Math.floor(ms / 3_600_000);
	const m = Math.floor((ms % 3_600_000) / 60_000);
	const s = Math.floor((ms % 60_000) / 1000);
	const milli = ms % 1000;
	const pad = (n: number, w = 2) => n.toString().padStart(w, '0');
	return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(milli, 3)}`;
}

export function formatClock(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
	const whole = Math.floor(seconds);
	const s = whole % 60;
	const m = Math.floor(whole / 60) % 60;
	const h = Math.floor(whole / 3600);
	const pad = (n: number) => n.toString().padStart(2, '0');
	if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
	return `${m}:${pad(s)}`;
}
