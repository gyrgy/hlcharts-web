/** The /funding board: band position, per-market parameters and state, the histogram, and sorting. */
import { describe, expect, it } from 'vitest';
import { PerpDex } from '../../hl/types';
import { sortBy } from '../../markets/sort-by';
import { ENRICHED_DEFAULTS, MarketRow } from '../../markets/types';
import { bandPosition } from '../band-position';
import { MAIN_CLAMP_8H, MAIN_INTEREST_8H } from '../explain-funding';
import { fundingBoard } from '../funding-board';
import { fundingHistogram } from '../funding-histogram';

const MAIN = {
  interest8h: MAIN_INTEREST_8H,
  clamp8h: MAIN_CLAMP_8H,
  multiplier: 1,
  documented: { interest: true, clamp: true, multiplier: true },
};
const row = (o: Partial<MarketRow> & Pick<MarketRow, 'key'>): MarketRow => ({
  kind: 'perp',
  venue: '',
  name: o.key,
  href: '/',
  base: o.key,
  markPx: 1,
  change24h: 0,
  volume24h: 1,
  oiCoins: 1,
  oiUsd: 1,
  fundingHourly: 0.0000125,
  premium: 0,
  basisBps: 0,
  impactSpreadBps: 1,
  maxLeverage: 10,
  capUse: null,
  atCap: false,
  delisted: false,
  isolatedOnly: false,
  ...ENRICHED_DEFAULTS,
  alsoOn: [],
  ...o,
});
const XYZ: PerpDex = {
  name: 'xyz',
  fullName: 'XYZ',
  deployer: '0x0',
  oracleUpdater: null,
  feeRecipient: null,
  assetToStreamingOiCap: [],
  assetToFundingMultiplier: [['xyz:NVDA', '0.5']],
  assetToFundingInterestRate: [],
  assetToFundingClamp: [],
};

describe('band position', () => {
  it('is how far inside (+) or outside (−) the base-rate band a premium sits, in bp', () => {
    // Main band: 0.01% ± 0.05% per 8 h, i.e. a premium from −4 bp to +6 bp.
    expect(bandPosition(0.0001, MAIN)).toBeCloseTo(5, 10);
    expect(bandPosition(0.0006, MAIN)).toBeCloseTo(0, 10);
    expect(bandPosition(0.0008, MAIN)).toBeCloseTo(-2, 10);
    expect(bandPosition(-0.0005, MAIN)).toBeCloseTo(-1, 10);
    expect(bandPosition(null, MAIN)).toBeNull();
  });
});

describe('funding board', () => {
  const board = fundingBoard(
    [
      row({ key: 'BTC' }),
      row({ key: 'HOT', fundingHourly: 0.0001, premium: 0.0013 }),
      row({ key: 'xyz:NVDA', venue: 'xyz', fundingHourly: 0.00000625 }),
      row({ key: 'OLD', delisted: true }),
      row({ key: '@1', kind: 'spot', fundingHourly: null }),
    ],
    new Map([
      ['', null],
      ['xyz', XYZ],
    ])
  );

  it('keeps live perps only', () => {
    expect(board.map((r) => r.key)).toEqual(['BTC', 'HOT', 'xyz:NVDA']);
  });

  it("reads each market's state with its own exchange's parameters", () => {
    const by = new Map(board.map((r) => [r.key, r]));
    expect(by.get('BTC')?.state).toBe('band');
    expect(by.get('HOT')?.state).toBe('above');
    expect(by.get('HOT')?.bandBps).toBeCloseTo(-7, 10);
    expect(by.get('xyz:NVDA')?.params.multiplier).toBe(0.5);
    expect(by.get('xyz:NVDA')?.state).toBe('band'); // 0.5 × 0.00125%/h
  });
});

describe('funding histogram', () => {
  it('bins per-year rates with open ends and splits base-rate markets from premium-set ones', () => {
    const perYear = (y: number): number => y / (24 * 365);
    const bins = fundingHistogram([
      { fundingHourly: perYear(-2), state: 'below' },
      { fundingHourly: perYear(0), state: 'band' },
      { fundingHourly: perYear(0.1095), state: 'band' },
      { fundingHourly: perYear(0.15), state: 'above' },
      { fundingHourly: perYear(6), state: 'above' },
      { fundingHourly: null, state: 'unexplained' },
    ]);
    expect(bins).toHaveLength(10);
    expect(bins[0]).toEqual({ low: null, high: -1, atBase: 0, premiumSet: 1 });
    expect(bins[4]).toEqual({ low: -0.1, high: 0, atBase: 0, premiumSet: 0 });
    expect(bins[5]).toEqual({ low: 0, high: 0.1, atBase: 1, premiumSet: 0 });
    expect(bins[6]).toEqual({ low: 0.1, high: 0.2, atBase: 1, premiumSet: 1 });
    expect(bins[9]).toEqual({ low: 1, high: null, atBase: 0, premiumSet: 1 });
    expect(bins.reduce((s, b) => s + b.atBase + b.premiumSet, 0)).toBe(5);
  });
});

describe('sorting', () => {
  it('puts rows without a value last in both directions', () => {
    const rows = [
      { key: 'a', v: 2 },
      { key: 'b', v: null },
      { key: 'c', v: 5 },
    ];
    expect(sortBy(rows, (r) => r.v, true).map((r) => r.key)).toEqual(['c', 'a', 'b']);
    expect(sortBy(rows, (r) => r.v, false).map((r) => r.key)).toEqual(['a', 'c', 'b']);
  });
});
