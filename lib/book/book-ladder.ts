/**
 * One price ladder per side from several books (plan §3.3, "book and cost to
 * trade"): the 20 live levels at full precision near the price, then
 * progressively coarser books (nSigFigs 4, then 3) further out. With one
 * coarse book the skipped bucket could be 43 bp wide (xyz:NVDA at $235,
 * 2026-10-04), hiding most of the depth within 0.5%; a middle book keeps each
 * junction to one small bucket. Coarse levels are price buckets; the
 * bucket that overlaps the fine levels would count the same orders twice, so
 * coarse levels start one bucket width beyond the fine book's last level.
 * Liquidity inside that skipped bucket is left out: depth reads low and cost
 * high by up to one bucket, never the other way, and every figure that used a
 * coarse level is marked approximate.
 */
import { L2Book } from '../hl/types';

export interface Level {
  px: number;
  sz: number;
  /** From the coarse book: its price is a bucket, not an order. */
  coarse: boolean;
}

export interface Ladder {
  mid: number;
  /** Best first: bids descending, asks ascending. */
  bids: Level[];
  asks: Level[];
  /** The coarse book's bucket width, when it was used. */
  step: number | null;
}

const levels = (raw: L2Book['levels'][number], coarse: boolean): Level[] =>
  raw
    .map((l) => ({ px: Number(l.px), sz: Number(l.sz), coarse }))
    .filter((l) => l.px > 0 && l.sz > 0);

/** The smallest gap between neighbouring coarse prices: the bucket width. */
function bucketWidth(prices: number[]): number | null {
  let w = Infinity;
  for (let i = 1; i < prices.length; i++) {
    const gap = Math.abs(prices[i] - prices[i - 1]);
    if (gap > 0 && gap < w) w = gap;
  }
  return Number.isFinite(w) ? w : null;
}

export function bookLadder(fine: L2Book, coarser: readonly (L2Book | null)[]): Ladder | null {
  let bids = levels(fine.levels[0], false);
  let asks = levels(fine.levels[1], false);
  if (!bids.length || !asks.length) return null;
  const mid = (bids[0].px + asks[0].px) / 2;
  let step: number | null = null;
  // Each coarser book continues where the ladder so far ends, one of its own buckets further out.
  for (const book of coarser) {
    if (!book) continue;
    const cBids = levels(book.levels[0], true);
    const cAsks = levels(book.levels[1], true);
    const w = bucketWidth([...cBids.map((l) => l.px), ...cAsks.map((l) => l.px)]);
    if (w === null) continue;
    const lastBid = bids[bids.length - 1].px;
    const lastAsk = asks[asks.length - 1].px;
    const tol = w * 1e-9;
    bids = [...bids, ...cBids.filter((l) => l.px <= lastBid - w + tol)];
    asks = [...asks, ...cAsks.filter((l) => l.px >= lastAsk + w - tol)];
    step = w;
  }
  return { mid, bids, asks, step };
}
