/**
 * Spot–perp basis: for every asset traded both as a spot pair and as a perp
 * (the sibling rules: same name, prices within 2%), the perp's price against
 * the spot price, in basis points. Busiest spot pair first. On 2026-10-04: 7
 * pairs, HYPE three times (USDC, USDT0, USDE quotes).
 */
import { isSibling } from '../markets/sibling-rules';
import { MarketRow } from '../markets/types';

export interface SpotPerpBasis {
  spot: MarketRow;
  perp: MarketRow;
  /** (perp − spot) ÷ spot × 10,000. */
  basisBps: number;
}

export function spotPerpBasis(rows: readonly MarketRow[]): SpotPerpBasis[] {
  const perps = rows.filter((r) => r.kind === 'perp');
  return rows
    .filter((r) => r.kind === 'spot')
    .flatMap((spot) =>
      perps
        .filter((perp) => isSibling(spot, perp))
        .map((perp) => ({
          spot,
          perp,
          basisBps: ((perp.markPx - spot.markPx) / spot.markPx) * 10_000,
        }))
    )
    .sort((a, b) => b.spot.volume24h - a.spot.volume24h);
}
