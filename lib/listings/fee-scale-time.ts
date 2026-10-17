/**
 * When a builder market's deployer fee scale last changed, from the market
 * list's `lastFeeScaleChangeTime`. Hyperliquid sends a UTC date-time with no
 * zone and nanoseconds ("2025-11-23T17:37:10.033211662"), and
 * "1970-01-01T00:00:00" for never (checked 2026-10-16; the type said epoch
 * ms, and pages showed "1969-12-31"). Read as UTC to the second: a browser takes
 * a zone-less string as local time, and nine decimal places are not part of
 * the date format browsers must accept. Null for never, missing or unreadable.
 */
const TO_THE_SECOND = 'YYYY-MM-DDTHH:MM:SS'.length;

export function feeScaleChangedAt(raw: string | undefined): number | null {
  if (!raw) return null;
  const t = Date.parse(`${raw.slice(0, TO_THE_SECOND)}Z`);
  return Number.isFinite(t) && t > 0 ? t : null;
}
