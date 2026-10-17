/**
 * What a round trip costs on the busiest main-exchange perps at their impact
 * size: the impact spread (buy and sell against the book) plus the taker fee
 * twice, at the base tier. Main exchange only: builder exchanges add their own
 * fee share and do not publish their impact size.
 */
import { MAIN_DEX } from '../hl/constants';
import { MarketRow } from '../markets/types';

export interface RoundTrip {
  row: MarketRow;
  spreadBps: number;
  feesBps: number;
  totalBps: number;
}

export function roundTrips(
  rows: readonly MarketRow[],
  takerRate: number,
  count: number
): RoundTrip[] {
  const feesBps = 2 * takerRate * 10_000;
  return rows
    .filter(
      (r) => r.kind === 'perp' && !r.delisted && r.venue === MAIN_DEX && r.impactSpreadBps !== null
    )
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, count)
    .map((row) => ({
      row,
      spreadBps: row.impactSpreadBps ?? 0,
      feesBps,
      totalBps: (row.impactSpreadBps ?? 0) + feesBps,
    }));
}
