/**
 * The home page's venue strip (plan §3.3): per venue, open interest and 24 h
 * volume summed over its live markets, and how many markets are live. Main
 * exchange first, then the builder exchanges by open interest, then spot.
 * Delisted perps take no part. A spot pair counts as live when it traded in
 * the last 24 h (117 of 330 on 2026-10-04). Spot volume sums the USDC-quoted
 * pairs only (99.97% of spot volume that day): each pair's volume is in its
 * quote token, and adding other tokens' amounts would mix units.
 */
import { MAIN_DEX, USDC_TOKEN_ID } from '../hl/constants';
import { SPOT_VENUE } from '../markets/build-spot-rows';
import { MarketRow } from '../markets/types';

export interface VenueSummary {
  venue: string;
  label: string;
  oiUsd: number | null;
  volume24h: number;
  live: number;
}

export function venueSummary(rows: readonly MarketRow[]): VenueSummary[] {
  const perps = new Map<string, VenueSummary>();
  let spot: VenueSummary | null = null;
  for (const r of rows) {
    if (r.kind === 'spot') {
      if (!(r.volume24h > 0)) continue;
      spot ??= { venue: SPOT_VENUE, label: 'Spot', oiUsd: null, volume24h: 0, live: 0 };
      if (r.quoteToken === USDC_TOKEN_ID) spot.volume24h += r.volume24h;
      spot.live += 1;
      continue;
    }
    if (r.delisted) continue;
    const s = perps.get(r.venue) ?? {
      venue: r.venue,
      label: r.venue === MAIN_DEX ? 'Main exchange' : r.venue,
      oiUsd: 0,
      volume24h: 0,
      live: 0,
    };
    s.oiUsd = (s.oiUsd ?? 0) + (r.oiUsd ?? 0);
    s.volume24h += r.volume24h;
    s.live += 1;
    perps.set(r.venue, s);
  }
  const main = perps.get(MAIN_DEX);
  const builders = [...perps.values()]
    .filter((s) => s.venue !== MAIN_DEX)
    .sort((a, b) => (b.oiUsd ?? 0) - (a.oiUsd ?? 0));
  return [...(main ? [main] : []), ...builders, ...(spot ? [spot] : [])];
}
