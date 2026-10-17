/**
 * Number formats used in tables. A missing value is always an en dash, never
 * a zero: "no data" and "nothing" must look different.
 */
export const MISSING = '–';

/** $1.23B, $45.6M, $789K, $12.3 */
export function usdCompact(x: number | null): string {
  if (x === null || !Number.isFinite(x)) return MISSING;
  const a = Math.abs(x);
  const [div, unit] =
    a >= 1e9 ? [1e9, 'B'] : a >= 1e6 ? [1e6, 'M'] : a >= 1e3 ? [1e3, 'K'] : [1, ''];
  return `$${(x / div).toFixed(a >= 100 * div || unit === '' ? 0 : a >= 10 * div ? 1 : 2)}${unit}`;
}

/** A token amount: 13.1M, 2.20K, 5.30 (two decimals below 100: a few BTC must not read as 5). */
export function amountCompact(x: number | null): string {
  if (x === null || !Number.isFinite(x)) return MISSING;
  const a = Math.abs(x);
  const [div, unit] =
    a >= 1e9 ? [1e9, 'B'] : a >= 1e6 ? [1e6, 'M'] : a >= 1e3 ? [1e3, 'K'] : [1, ''];
  return `${(x / div).toFixed(a >= 100 * div ? 0 : a >= 10 * div && unit ? 1 : 2)}${unit}`;
}

/** A price with about 5 significant figures, never in exponent form. */
export function price(x: number | null): string {
  if (x === null || !Number.isFinite(x) || x <= 0) return MISSING;
  const digits = Math.max(0, Math.min(8, 4 - Math.floor(Math.log10(x))));
  return x.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** A fraction as a signed percentage: 0.0123 -> +1.23% */
export function pctSigned(x: number | null, digits = 2): string {
  if (x === null || !Number.isFinite(x)) return MISSING;
  return `${x > 0 ? '+' : ''}${(x * 100).toFixed(digits)}%`;
}

export function pct(x: number | null, digits = 1): string {
  if (x === null || !Number.isFinite(x)) return MISSING;
  return `${(x * 100).toFixed(digits)}%`;
}

/** A duration in words: "40 s", "12 min", "3 h", "2 days". */
export function ago(ms: number): string {
  if (ms < 60_000) return `${Math.max(0, Math.round(ms / 1000))} s`;
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} days`;
}

export function bps(x: number | null, digits = 1): string {
  if (x === null || !Number.isFinite(x)) return MISSING;
  return x.toFixed(digits);
}

/** 0x8880…0888: an address short enough for a table cell (the full one goes in a tooltip or its own page). */
export function shortAddress(a: string | null): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : MISSING;
}
