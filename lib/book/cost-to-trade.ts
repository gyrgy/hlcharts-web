/**
 * The cost of buying (or selling) `usd` of notional at once against the
 * resting book: the average fill price against the mid, in basis points.
 * Null ("not measured") when the ladder holds less than `usd` on that side.
 * Approximate when the walk used coarse levels (bucket prices, and the one
 * skipped bucket: the figure reads high, never low).
 */
import { Ladder } from './book-ladder';

export function costToTrade(
  ladder: Ladder,
  side: 'buy' | 'sell',
  usd: number
): { bps: number; approximate: boolean } | null {
  const levels = side === 'buy' ? ladder.asks : ladder.bids;
  let need = usd;
  let qty = 0;
  let approximate = false;
  for (const l of levels) {
    const take = Math.min(need, l.px * l.sz);
    qty += take / l.px;
    need -= take;
    approximate ||= l.coarse;
    if (need <= 0) break;
  }
  if (need > usd * 1e-9) return null;
  const avg = usd / qty;
  const bps = ((side === 'buy' ? avg - ladder.mid : ladder.mid - avg) / ladder.mid) * 10_000;
  return { bps, approximate };
}
