/** Funding history for several markets: one time axis, and the per-market figures under the chart. */
import { describe, expect, it } from 'vitest';
import { FundingRow } from '../../hl/types';
import { alignHourly } from '../align-hourly';
import { fundingStats } from '../funding-stats';

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 1);
const row = (coin: string, hour: number, rate: string, msPast = 15): FundingRow => ({
  coin,
  fundingRate: rate,
  premium: '0',
  time: T0 + hour * H + msPast,
});

describe('aligning hourly funding', () => {
  it('puts each hour on one axis whatever its milliseconds, and leaves missing hours empty', () => {
    const a = alignHourly([
      [row('BTC', 0, '0.0000125', 4), row('BTC', 1, '0.00001', 90), row('BTC', 2, '0.00002', 37)],
      [row('NEW', 2, '-0.0001', 40)],
    ]);
    expect(a.times).toEqual([T0 / 1000, T0 / 1000 + 3600, T0 / 1000 + 7200]);
    expect(a.values).toEqual([
      [0.0000125, 0.00001, 0.00002],
      [null, null, -0.0001],
    ]);
  });

  it('handles no series and empty series', () => {
    expect(alignHourly([])).toEqual({ times: [], values: [] });
    expect(alignHourly([[]])).toEqual({ times: [], values: [[]] });
  });
});

describe('funding figures over a period', () => {
  it('sums the hourly rates into what a long paid, and finds the extremes', () => {
    const s = fundingStats([row('X', 0, '0.0001'), row('X', 1, '-0.0003'), row('X', 2, '0.0005')]);
    expect(s?.hours).toBe(3);
    expect(s?.total).toBeCloseTo(0.0003, 12);
    expect(s?.averageHourly).toBeCloseTo(0.0001, 12);
    expect(s?.highest).toBe(0.0005);
    expect(s?.lowest).toBe(-0.0003);
  });

  it('has nothing to say about no rows', () => {
    expect(fundingStats([])).toBeNull();
  });
});
