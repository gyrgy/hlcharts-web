/**
 * Chart data rules. A live candle that duplicated a period, or funding paged
 * from the wrong end, would draw a plausible but wrong chart.
 */
import { describe, expect, it } from 'vitest';
import { Candle, FundingRow } from '../../hl/types';
import { FUNDING_PAGE_ROWS, fetchFundingHistory } from '../fetch-funding-history';
import { mergeCandle } from '../merge-candle';

const candle = (t: number, c: string): Candle => ({
  t,
  T: t + 59_999,
  s: 'BTC',
  i: '1m',
  o: c,
  c,
  h: c,
  l: c,
  v: '1',
  n: 1,
});

describe('live candles', () => {
  it('replaces the current candle, appends a new one, ignores a late older one', () => {
    let s = [candle(0, '1'), candle(60_000, '2')];
    s = mergeCandle(s, candle(60_000, '3'));
    expect(s.map((c) => [c.t, c.c])).toEqual([
      [0, '1'],
      [60_000, '3'],
    ]);
    s = mergeCandle(s, candle(120_000, '4'));
    expect(s.map((c) => c.t)).toEqual([0, 60_000, 120_000]);
    expect(mergeCandle(s, candle(0, '9'))).toBe(s);
  });
});

describe('funding history', () => {
  // Hyperliquid's behaviour: the first FUNDING_PAGE_ROWS rows from startTime onwards.
  const HOUR = 3_600_000;
  const all: FundingRow[] = Array.from({ length: 1210 }, (_, i) => ({
    coin: 'BTC',
    fundingRate: '0.0000125',
    premium: '0',
    time: i * HOUR + 7,
  }));
  const fake = () => {
    const calls: number[] = [];
    const request = async <T>(body: Record<string, unknown>): Promise<T> => {
      const start = body.startTime as number;
      calls.push(start);
      return all
        .filter((r) => r.time >= start && r.time <= (body.endTime as number))
        .slice(0, FUNDING_PAGE_ROWS) as T;
    };
    return { request, calls };
  };

  it('pages forward from the start until a short page, without gaps or repeats', async () => {
    const { request, calls } = fake();
    const progress: number[] = [];
    const rows = await fetchFundingHistory(request, 'BTC', 0, all[all.length - 1].time, (n) =>
      progress.push(n)
    );
    expect(rows).toHaveLength(1210);
    expect(new Set(rows.map((r) => r.time)).size).toBe(1210);
    expect(calls).toEqual([0, all[499].time + 1, all[999].time + 1]);
    expect(progress).toEqual([500, 1000, 1210]);
  });

  it('makes one request for a range that fits in one page', async () => {
    const { request, calls } = fake();
    const rows = await fetchFundingHistory(request, 'BTC', 0, 167 * HOUR + 7);
    expect(rows).toHaveLength(168);
    expect(calls).toHaveLength(1);
  });
});
