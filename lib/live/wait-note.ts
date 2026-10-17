/**
 * The sentence a loading chart adds while the tab's requests wait for
 * Hyperliquid's per-minute limit (WeightQueue.resumesAt): a countdown, so a
 * long load never looks frozen. Empty when nothing waits.
 */
export function waitNote(resumesAt: number, now: number): string {
  const s = Math.ceil(Math.max(0, resumesAt - now) / 1000);
  return s > 0
    ? ` Waiting ${s} s for Hyperliquid's per-minute request limit, then it continues.`
    : '';
}
