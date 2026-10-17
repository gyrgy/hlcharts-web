/**
 * Figures from the 20 live levels alone, exact: the spread, the imbalance of
 * resting value (bids against asks, −1 to +1), orders per level, and how far
 * from the mid the levels reach on each side (the span every figure from them
 * covers; on BTC only a few basis points).
 */
import { L2Book } from '../hl/types';

export function nearBookStats(book: L2Book): {
  spreadBps: number;
  imbalance: number;
  ordersPerLevel: number;
  spanBps: { bid: number; ask: number };
} | null {
  const [bids, asks] = book.levels;
  if (!bids.length || !asks.length) return null;
  const bid = Number(bids[0].px);
  const ask = Number(asks[0].px);
  const mid = (bid + ask) / 2;
  const value = (side: typeof bids) => side.reduce((s, l) => s + Number(l.px) * Number(l.sz), 0);
  const b = value(bids);
  const a = value(asks);
  const orders = [...bids, ...asks].reduce((s, l) => s + l.n, 0);
  return {
    spreadBps: ((ask - bid) / mid) * 10_000,
    imbalance: b + a > 0 ? (b - a) / (b + a) : 0,
    ordersPerLevel: orders / (bids.length + asks.length),
    spanBps: {
      bid: ((mid - Number(bids[bids.length - 1].px)) / mid) * 10_000,
      ask: ((Number(asks[asks.length - 1].px) - mid) / mid) * 10_000,
    },
  };
}
