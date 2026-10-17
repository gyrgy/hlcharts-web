/**
 * Depth and cost to trade from two books. A double-counted bucket inflates
 * depth; a figure past the book's reach would be invented; both look like
 * ordinary numbers on the page.
 *
 * Fine book: 20 levels of 10 units each side, one cent apart, around a $100
 * mid. Coarse book: 10-cent buckets of 100 units, from 99.9 / 100.1 outwards.
 */
import { describe, expect, it } from 'vitest';
import { L2Book } from '../../hl/types';
import { bookFigures } from '../book-figures';
import { bookLadder } from '../book-ladder';
import { costToTrade } from '../cost-to-trade';
import { depthWithin } from '../depth-within';
import { nearBookStats } from '../near-book-stats';

const lvl = (px: number, sz: number, n = 2) => ({ px: px.toFixed(2), sz: String(sz), n });
const fine: L2Book = {
  coin: 'X',
  time: 0,
  levels: [
    Array.from({ length: 20 }, (_, i) => lvl(99.99 - i * 0.01, 10)),
    Array.from({ length: 20 }, (_, i) => lvl(100.01 + i * 0.01, 10)),
  ],
};
const coarse: L2Book = {
  coin: 'X',
  time: 0,
  levels: [
    Array.from({ length: 20 }, (_, i) => lvl(99.9 - i * 0.1, 100)),
    Array.from({ length: 20 }, (_, i) => lvl(100.1 + i * 0.1, 100)),
  ],
};

describe('near book', () => {
  it('reports spread, balance, orders per level and the span the 20 levels cover', () => {
    const s = nearBookStats(fine)!;
    expect(s.spreadBps).toBeCloseTo(2, 10);
    expect(s.imbalance).toBeCloseTo((99.895 - 100.105) / (99.895 + 100.105), 10);
    expect(s.ordersPerLevel).toBe(2);
    expect(s.spanBps.bid).toBeCloseTo(20, 10);
    expect(s.spanBps.ask).toBeCloseTo(20, 10);
  });
});

describe('ladder from two books', () => {
  const ladder = bookLadder(fine, [coarse])!;

  it('starts the coarse levels one bucket beyond the fine ones, so no order is counted twice', () => {
    expect(ladder.step).toBeCloseTo(0.1, 10);
    const coarseBids = ladder.bids.filter((l) => l.coarse).map((l) => l.px);
    expect(coarseBids[0]).toBeCloseTo(99.7, 10); // 99.9 and 99.8 overlap the fine levels (down to 99.80)
    const coarseAsks = ladder.asks.filter((l) => l.coarse).map((l) => l.px);
    expect(coarseAsks[0]).toBeCloseTo(100.3, 10);
  });

  it('skips a coarse bucket that reaches into the fine levels when they stop mid-bucket', () => {
    // Fine bids stop at 99.85: the 99.8 bucket also holds the 99.85-99.89 orders already counted.
    const shortFine: L2Book = { ...fine, levels: [fine.levels[0].slice(0, 15), fine.levels[1]] };
    const l = bookLadder(shortFine, [coarse])!;
    const firstCoarse = l.bids.find((x) => x.coarse)!;
    expect(firstCoarse.px).toBeCloseTo(99.7, 10);
  });

  it('chains a middle book between the fine and coarse ones, each one bucket beyond the last', () => {
    // Middle book: 5-cent buckets of 50 units, from 99.95 / 100.05 outwards (20 levels).
    const middle: L2Book = {
      coin: 'X',
      time: 0,
      levels: [
        Array.from({ length: 20 }, (_, i) => lvl(99.95 - i * 0.05, 50)),
        Array.from({ length: 20 }, (_, i) => lvl(100.05 + i * 0.05, 50)),
      ],
    };
    const l = bookLadder(fine, [middle, coarse])!;
    const bids = l.bids.map((x) => x.px);
    expect(bids.every((p, i) => i === 0 || p < bids[i - 1])).toBe(true); // strictly falling: no price twice
    const firstMiddle = l.bids.find((x) => x.coarse)!.px;
    expect(firstMiddle).toBeCloseTo(99.75, 10); // 99.80 (fine end) − one 5-cent bucket
    const lastMiddle = 99.95 - 19 * 0.05; // 99.00
    expect(bids.find((p) => p < lastMiddle - 1e-9)).toBeCloseTo(98.9, 10); // coarse resumes one 10-cent bucket on
    // The middle book fills the 0.5% band the coarse book alone left half empty.
    const twoBooks = depthWithin(ladder, 'bid', 0.005)!.usd;
    expect(depthWithin(l, 'bid', 0.005)!.usd).toBeGreaterThan(twoBooks);
  });

  it('measures depth inside the fine span exactly, and further out as approximate', () => {
    const near = depthWithin(ladder, 'bid', 0.001)!;
    expect(near.approximate).toBe(false);
    expect(near.usd).toBeCloseTo(
      Array.from({ length: 10 }, (_, i) => (99.99 - i * 0.01) * 10).reduce((a, b) => a + b),
      6
    );
    const far = depthWithin(ladder, 'bid', 0.005)!;
    expect(far.approximate).toBe(true);
    const fineValue = Array.from({ length: 20 }, (_, i) => (99.99 - i * 0.01) * 10).reduce(
      (a, b) => a + b
    );
    expect(far.usd).toBeCloseTo(fineValue + (99.7 + 99.6 + 99.5) * 100, 6);
  });

  it('says "not measured", never 0, past the book\'s reach', () => {
    expect(depthWithin(ladder, 'bid', 0.05)).toBeNull();
    expect(depthWithin(bookLadder(fine, [])!, 'ask', 0.005)).toBeNull();
  });

  it('prices a trade against the resting book, exact when the fine levels suffice', () => {
    const small = costToTrade(ladder, 'buy', 500)!;
    expect(small.approximate).toBe(false);
    expect(small.bps).toBeCloseTo(1, 10); // all at 100.01: 1 bp over the mid
    const big = costToTrade(ladder, 'sell', 50_000)!;
    expect(big.approximate).toBe(true);
    expect(big.bps).toBeGreaterThan(0);
    expect(costToTrade(ladder, 'buy', 10_000_000)).toBeNull();
  });
});

describe('panel figures from three books', () => {
  const middle: L2Book = {
    coin: 'X',
    time: 0,
    levels: [
      Array.from({ length: 20 }, (_, i) => lvl(99.95 - i * 0.05, 50)),
      Array.from({ length: 20 }, (_, i) => lvl(100.05 + i * 0.05, 50)),
    ],
  };
  const ladders = [
    bookLadder(fine, [])!,
    bookLadder(fine, [middle])!,
    bookLadder(fine, [coarse])!,
    bookLadder(fine, [middle, coarse])!,
  ];
  const f = bookFigures(fine, middle, coarse)!;

  it('takes the largest depth any combination measures: each one can only read low', () => {
    for (const d of f.depth) {
      const all = ladders.map((l) => depthWithin(l, 'bid', d.band)?.usd ?? -1);
      expect(d.bid?.value ?? -1).toBe(Math.max(...all));
    }
  });

  it('takes the smallest cost any combination measures: each one can only read high', () => {
    for (const c of f.cost) {
      const all = ladders.map((l) => costToTrade(l, 'sell', c.usd)?.bps ?? Infinity);
      const min = Math.min(...all);
      expect(c.sell?.value ?? Infinity).toBe(min);
    }
  });

  it('reports a figure inside the fine levels as exact, and anything past every book as not measured', () => {
    expect(f.depth[0].bid).toMatchObject({ approximate: false });
    expect(f.cost[0].buy).toMatchObject({ approximate: false });
    expect(f.cost[2].buy).toBeNull(); // $1M is more than every book holds
  });
});
