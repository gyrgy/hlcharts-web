/**
 * The book panel's figures from the fine book and two coarser ones. Every
 * ladder built from them errs in one direction only (skipped liquidity is
 * left out, buckets are priced outward: Hyperliquid rounds bids down and asks
 * up, BTC 85,200/85,300 against 85,272/85,273 on 2026-10-04): depth reads
 * low, cost reads high. So each figure is taken from the ladder that comes
 * closest, the largest depth and the smallest cost, and an approximate one is
 * a bound: "at least" for depth, "at most" for cost. On 2026-10-04 no single
 * ladder was best everywhere (three books: ZEC depth within 0.5% $1.86M ->
 * $6.47M, but within 2% $22.6M -> $18.9M).
 */
import { L2Book } from '../hl/types';
import { bookLadder } from './book-ladder';
import { costToTrade } from './cost-to-trade';
import { depthWithin } from './depth-within';

export const DEPTH_BANDS = [0.001, 0.005, 0.01, 0.02] as const;
export const TRADE_SIZES_USD = [10_000, 100_000, 1_000_000] as const;

export interface Bound {
  value: number;
  /** True: an "at least" (depth) or "at most" (cost) bound; false: exact. */
  approximate: boolean;
}

export interface BookFigures {
  mid: number;
  depth: { band: number; bid: Bound | null; ask: Bound | null }[];
  cost: { usd: number; buy: Bound | null; sell: Bound | null }[];
}

/** Every ladder the books allow: the live levels alone, and with each grouped book and both. */
function laddersOf(fine: L2Book, middle: L2Book | null, coarse: L2Book | null) {
  return [
    bookLadder(fine, []),
    bookLadder(fine, [middle]),
    bookLadder(fine, [coarse]),
    bookLadder(fine, [middle, coarse]),
  ].filter((l): l is NonNullable<typeof l> => l !== null);
}

/** The closest figure among the ladders: an exact one if any has it, else the largest depth or smallest cost. */
function best(xs: (Bound | null)[], pick: 'max' | 'min'): Bound | null {
  const ok = xs.filter((x): x is Bound => x !== null);
  if (!ok.length) return null;
  // An exact figure is the same in every ladder that has it; it beats any bound.
  const exact = ok.find((x) => !x.approximate);
  if (exact) return exact;
  return ok.reduce((a, b) => ((pick === 'max' ? b.value > a.value : b.value < a.value) ? b : a));
}

const asBound = (
  x: { usd: number; approximate: boolean } | { bps: number; approximate: boolean } | null
): Bound | null =>
  x === null ? null : { value: 'usd' in x ? x.usd : x.bps, approximate: x.approximate };

/** The cost of one market order of any size, by the same rule as bookFigures' fixed sizes. */
export function costAt(
  fine: L2Book,
  middle: L2Book | null,
  coarse: L2Book | null,
  side: 'buy' | 'sell',
  usd: number
): Bound | null {
  return best(
    laddersOf(fine, middle, coarse).map((l) => asBound(costToTrade(l, side, usd))),
    'min'
  );
}

export function bookFigures(
  fine: L2Book,
  middle: L2Book | null,
  coarse: L2Book | null
): BookFigures | null {
  const ladders = laddersOf(fine, middle, coarse);
  if (!ladders.length) return null;
  return {
    mid: ladders[0].mid,
    depth: DEPTH_BANDS.map((band) => ({
      band,
      bid: best(
        ladders.map((l) => asBound(depthWithin(l, 'bid', band))),
        'max'
      ),
      ask: best(
        ladders.map((l) => asBound(depthWithin(l, 'ask', band))),
        'max'
      ),
    })),
    cost: TRADE_SIZES_USD.map((usd) => ({
      usd,
      buy: costAt(fine, middle, coarse, 'buy', usd),
      sell: costAt(fine, middle, coarse, 'sell', usd),
    })),
  };
}
