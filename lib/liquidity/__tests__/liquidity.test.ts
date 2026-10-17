/** /liquidity: the impact sizes, one market's measurement, and how bounds read. */
import { describe, expect, it } from 'vitest';
import { bookFigures } from '../../book/book-figures';
import { costText, depthText, NOT_MEASURED } from '../../book/bound-text';
import { impactNotionalUsd } from '../../book/impact-notional';
import { FEED } from '../../hl/constants';
import { L2Book } from '../../hl/types';
import { measureBook } from '../measure-book';

const level = (px: number, sz: number) => ({ px: String(px), sz: String(sz), n: 1 });
const book = (bids: [number, number][], asks: [number, number][]): L2Book => ({
  coin: 'X',
  time: 0,
  levels: [bids.map(([p, s]) => level(p, s)), asks.map(([p, s]) => level(p, s))],
});
const FINE = book(
  [
    [99.9, 10],
    [99.8, 10],
  ],
  [
    [100.1, 10],
    [100.2, 10],
  ]
);
const MIDDLE = book(
  [
    [99.9, 20],
    [99.5, 500],
  ],
  [
    [100.1, 20],
    [100.5, 500],
  ]
);
const COARSE = book(
  [
    [99, 5000],
    [98, 5000],
  ],
  [
    [101, 5000],
    [102, 5000],
  ]
);

describe('impact size', () => {
  it('is $20,000 for BTC and ETH, $6,000 for other main perps, and unpublished on builder exchanges', () => {
    expect(impactNotionalUsd('', 'BTC')).toBe(20_000);
    expect(impactNotionalUsd('', 'ETH')).toBe(20_000);
    expect(impactNotionalUsd('', 'SOL')).toBe(6_000);
    expect(impactNotionalUsd('xyz', 'xyz:NVDA')).toBeNull();
  });
});

describe('measuring one book', () => {
  it('reads the live levels and both grouped books, and gives the market pages’ figures', async () => {
    const asked: Record<string, unknown>[] = [];
    const replies = [FINE, MIDDLE, COARSE];
    const request = async <T>(body: Record<string, unknown>): Promise<T> => {
      asked.push(body);
      return replies[asked.length - 1] as T;
    };
    const m = await measureBook(request, '@107', () => 42);
    expect(asked).toEqual([
      { type: FEED.l2Book, coin: '@107' },
      { type: FEED.l2Book, coin: '@107', nSigFigs: 4 },
      { type: FEED.l2Book, coin: '@107', nSigFigs: 3 },
    ]);
    expect(m.at).toBe(42);
    expect(m.spreadBps).toBeCloseTo(20, 9); // 99.9 / 100.1 around a mid of 100
    expect(m.figures).toEqual(bookFigures(FINE, MIDDLE, COARSE));
  });

  it('still measures from the live levels when a grouped book fails, and fails without them', async () => {
    let n = 0;
    const partial = async <T>(): Promise<T> => {
      n++;
      if (n > 1) throw new Error('429');
      return FINE as T;
    };
    const m = await measureBook(partial, 'BTC');
    expect(m.figures).toEqual(bookFigures(FINE, null, null));
    const none = async <T>(): Promise<T> => {
      throw new Error('429');
    };
    await expect(measureBook(none, 'BTC')).rejects.toThrow('429');
  });
});

describe('how bounds read', () => {
  it('says exact, "at least" for depth, "at most" for cost, and "not measured"', () => {
    expect(depthText({ value: 1_200_000, approximate: false })).toBe('$1.20M');
    expect(depthText({ value: 1_200_000, approximate: true })).toBe('at least $1.20M');
    expect(costText({ value: 3.456, approximate: true })).toBe('at most 3.5 bp');
    expect(depthText(null)).toBe(NOT_MEASURED);
    expect(costText(null)).toBe(NOT_MEASURED);
  });
});
