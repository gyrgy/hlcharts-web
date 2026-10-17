/** /learn pass 2: the fee table from the live schedule, round-trip costs, and the TWAP plan of the docs' example. */
import { describe, expect, it } from 'vitest';
import { FeeSchedule } from '../../hl/types';
import { ENRICHED_DEFAULTS, MarketRow } from '../../markets/types';
import { feeTable } from '../fee-table';
import { roundTrips } from '../round-trip';
import { twapPlan } from '../twap-plan';

// The schedule as Hyperliquid returned it on 2026-10-05 (first two VIP tiers kept).
const SCHEDULE: FeeSchedule = {
  cross: '0.00045',
  add: '0.00015',
  spotCross: '0.0007',
  spotAdd: '0.0004',
  referralDiscount: '0.04',
  tiers: {
    vip: [
      {
        ntlCutoff: '5000000.0',
        cross: '0.0004',
        add: '0.00012',
        spotCross: '0.0006',
        spotAdd: '0.0003',
      },
      {
        ntlCutoff: '25000000.0',
        cross: '0.00035',
        add: '0.00008',
        spotCross: '0.0005',
        spotAdd: '0.0002',
      },
    ],
    mm: [{ makerFractionCutoff: '0.005', add: '-0.00001' }],
  },
  stakingDiscountTiers: [
    { bpsOfMaxSupply: '0.0', discount: '0.0' },
    { bpsOfMaxSupply: '0.0001', discount: '0.05' },
    { bpsOfMaxSupply: '5.0', discount: '0.4' },
  ],
};

describe('fee table', () => {
  const t = feeTable(SCHEDULE);

  it('puts the base rates first, then each volume tier', () => {
    expect(
      t.tiers.map((x) => [x.fromUsd, x.perpTaker, x.perpMaker, x.spotTaker, x.spotMaker])
    ).toEqual([
      [0, 0.00045, 0.00015, 0.0007, 0.0004],
      [5e6, 0.0004, 0.00012, 0.0006, 0.0003],
      [25e6, 0.00035, 0.00008, 0.0005, 0.0002],
    ]);
  });

  it("reads staking tiers in HYPE (the docs' 10 HYPE and 500,000 HYPE), rebates and the referral discount", () => {
    expect(t.staking).toEqual([
      { fromHype: 10, discount: 0.05 },
      { fromHype: 500_000, discount: 0.4 },
    ]);
    expect(t.rebates).toEqual([{ makerShareAbove: 0.005, rate: -0.00001 }]);
    expect(t.referralDiscount).toBe(0.04);
  });
});

describe('round trips', () => {
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
    fundingHourly: 0,
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

  it('adds two base taker fees to the impact spread, busiest main-exchange perps first', () => {
    const r = roundTrips(
      [
        row({ key: 'BTC', volume24h: 9e8, impactSpreadBps: 0.1 }),
        row({ key: 'SOL', volume24h: 2e8, impactSpreadBps: 2.4 }),
        row({ key: 'xyz:NVDA', venue: 'xyz', volume24h: 1e9 }),
        row({ key: 'OLD', delisted: true, volume24h: 5e9 }),
      ],
      0.00045,
      5
    );
    expect(r.map((x) => [x.row.key, x.spreadBps, x.feesBps, x.totalBps])).toEqual([
      ['BTC', 0.1, 9, 9.1],
      ['SOL', 2.4, 9, 11.4],
    ]);
  });
});

describe('TWAP plan', () => {
  it("matches the docs' example: $10,000 over an hour is about 121 suborders of about $83, every 30 s", () => {
    const p = twapPlan(10_000, 3600);
    expect(p.suborders).toBe(121);
    expect(p.suborderUsd).toBeCloseTo(82.6, 1);
    expect(p.intervalS).toBe(30);
  });

  it('refuses runs whose interval the docs do not state exactly', () => {
    expect(() => twapPlan(10_000, 4 * 24 * 3600)).toThrow(/outside/);
    expect(() => twapPlan(10_000, 0)).toThrow(/outside/);
  });
});
