/**
 * The `/open-interest` board (plan §3.3): every live perp with its share of its
 * exchange's open interest, open interest against 24 h volume, and, on builder
 * exchanges, its cap. Caps are notional, in USD (docs: HIP-3 deployer actions,
 * "notional (sum of absolute position size times mark price)"); `perpDexs` and
 * `perpDexLimits` gave identical per-market caps on all 10 exchanges
 * (2026-10-04). The main exchange publishes no per-market cap.
 */
import { PerpDex } from '../hl/types';
import { MarketRow } from '../markets/types';

export interface OiRow extends MarketRow {
  /** Share of this exchange's open interest. */
  venueShare: number | null;
  /** Open interest ÷ 24 h volume; null without volume. */
  oiPerVolume: number | null;
  /** Builder exchanges' per-market cap in USD; null where none is published. */
  capUsd: number | null;
}

export function oiBoard(
  rows: readonly MarketRow[],
  dexes: ReadonlyMap<string, PerpDex | null>
): OiRow[] {
  const live = rows.filter((r) => r.kind === 'perp' && !r.delisted);
  const venueOi = new Map<string, number>();
  for (const r of live) venueOi.set(r.venue, (venueOi.get(r.venue) ?? 0) + (r.oiUsd ?? 0));
  const caps = new Map<string, number>();
  for (const d of dexes.values())
    for (const [coin, cap] of d?.assetToStreamingOiCap ?? []) caps.set(coin, Number(cap));
  return live.map((r) => {
    const total = venueOi.get(r.venue) ?? 0;
    const cap = caps.get(r.key);
    return {
      ...r,
      venueShare: total > 0 && r.oiUsd !== null ? r.oiUsd / total : null,
      oiPerVolume: r.volume24h > 0 && r.oiUsd !== null ? r.oiUsd / r.volume24h : null,
      capUsd: cap !== undefined && cap > 0 ? cap : null,
    };
  });
}
