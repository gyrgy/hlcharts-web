/** /listings: every exchange's markets with margin rules and leverage tiers, and the listing auction. */
import { describe, expect, it } from 'vitest';
import { PerpDex, PerpMetaWithCollateral } from '../../hl/types';
import { auctionView } from '../auction-view';
import { listings } from '../listings';
import { tiersText } from '../tiers-text';

const XYZ: PerpDex = {
  name: 'xyz',
  fullName: 'XYZ',
  deployer: '0xabc',
  oracleUpdater: null,
  feeRecipient: null,
  assetToStreamingOiCap: [],
  assetToFundingMultiplier: [],
  assetToFundingInterestRate: [],
  assetToFundingClamp: [],
};
// Shapes as returned by allPerpMetas on 2026-10-04.
const MAIN: PerpMetaWithCollateral = {
  collateralToken: 0,
  marginTables: [
    [
      56,
      {
        description: 'tiered 40x',
        marginTiers: [
          { lowerBound: '0.0', maxLeverage: 40 },
          { lowerBound: '150000000.0', maxLeverage: 20 },
        ],
      },
    ],
  ],
  universe: [
    { name: 'BTC', szDecimals: 5, maxLeverage: 40, marginTableId: 56 },
    { name: 'FTM', szDecimals: 0, maxLeverage: 3, marginTableId: 3, isDelisted: true },
    {
      name: 'LOCKED',
      szDecimals: 0,
      maxLeverage: 3,
      marginTableId: 3,
      onlyIsolated: true,
      marginMode: 'strictIsolated',
    },
  ],
};
const XYZ_META: PerpMetaWithCollateral = {
  collateralToken: 0,
  universe: [
    {
      name: 'xyz:NVDA',
      szDecimals: 3,
      maxLeverage: 10,
      marginTableId: 10,
      onlyIsolated: true,
      marginMode: 'noCross',
      growthMode: 'enabled',
      deployerFeeScale: '1.0',
      // Hyperliquid's real format: UTC, no zone, nanoseconds (2026-09-21T14:13:20Z = 1790000000000).
      lastFeeScaleChangeTime: '2026-09-21T14:13:20.033211662',
    },
    { name: 'xyz:OLD', szDecimals: 0, maxLeverage: 5, marginTableId: 5, onlyIsolated: true },
  ],
};

describe('listings', () => {
  const [main, xyz] = listings([null, XYZ], [MAIN, XYZ_META], new Set(['FTM', 'LOCKED']));

  it("keeps every market, delisted ones too, in Hyperliquid's order", () => {
    expect(main.markets.map((m) => m.key)).toEqual(['BTC', 'FTM', 'LOCKED']);
    expect([main.live, main.delisted]).toEqual([2, 1]);
    expect(xyz.markets.map((m) => [m.name, m.href])).toEqual([
      ['NVDA', '/perps/xyz/nvda/'],
      ['OLD', '/perps/xyz/old/'],
    ]);
    expect([xyz.fullName, xyz.deployer]).toEqual(['XYZ', '0xabc']);
  });

  it('reads leverage tiers from the table, or one tier at max leverage when the table is not listed', () => {
    expect(main.markets[0].tiers).toEqual([
      { fromUsd: 0, maxLeverage: 40 },
      { fromUsd: 150_000_000, maxLeverage: 20 },
    ]);
    expect(xyz.markets[0].tiers).toEqual([{ fromUsd: 0, maxLeverage: 10 }]);
  });

  it('reads the margin rule from the mode, and from the old isolated-only flag when there is no mode', () => {
    expect(main.markets.map((m) => m.margin)).toEqual(['cross', 'cross', 'isolatedLocked']);
    expect(xyz.markets.map((m) => m.margin)).toEqual(['isolated', 'isolated']);
  });

  it('marks main-exchange markets at their cap, never a delisted one', () => {
    expect(main.markets.map((m) => m.atCap)).toEqual([false, false, true]);
  });

  it("keeps a builder market's fee settings", () => {
    expect(xyz.markets[0]).toMatchObject({
      growthMode: true,
      feeScale: 1,
      feeScaleChangedAt: 1790000000000,
    });
    expect(main.markets[0]).toMatchObject({ growthMode: false, feeScale: null });
  });

  it('refuses lists that do not line up', () => {
    expect(() => listings([null], [MAIN, XYZ_META], new Set())).toThrow(/2 market lists/);
  });
});

describe('leverage tiers in words', () => {
  it('names each tier up to where the next starts', () => {
    expect(tiersText([{ fromUsd: 0, maxLeverage: 10 }])).toBe('10×');
    expect(
      tiersText([
        { fromUsd: 0, maxLeverage: 40 },
        { fromUsd: 150_000_000, maxLeverage: 20 },
      ])
    ).toBe('40× up to $150M, then 20×');
    expect(
      tiersText([
        { fromUsd: 0, maxLeverage: 10 },
        { fromUsd: 3_000_000, maxLeverage: 5 },
        { fromUsd: 20_000_000, maxLeverage: 3 },
      ])
    ).toBe('10× up to $3.00M, then 5× up to $20.0M, then 3×');
  });
});

describe('listing auction', () => {
  // The live reply of 2026-10-04: started 2026-10-03 23:00 UTC, 31 hours.
  const status = {
    startTimeSeconds: 1791068400,
    durationSeconds: 111600,
    startGas: '1129.25311896',
    currentGas: '754.0569491',
    endGas: null,
  };
  const start = 1791068400_000;
  const end = start + 111600_000;

  it('falls in a straight line to 500 HYPE, and the live price sits on that line', () => {
    expect(auctionView(status, start).linePrice).toBeCloseTo(1129.25311896, 6);
    expect(auctionView(status, end).linePrice).toBe(500);
    // 59.6% of the way: where the live price of 754.06 puts the reply.
    const v = auctionView(status, start + 0.59626 * 111600_000);
    expect(v.state).toBe('running');
    expect(v.onLine).toBe(true);
    expect(v.endMs).toBe(end);
  });

  it('notices a price off the documented line', () => {
    expect(auctionView({ ...status, currentGas: '1000' }, start + 0.6 * 111600_000).onLine).toBe(
      false
    );
  });

  it('says sold once someone has bought, and ended once time is up without a buyer', () => {
    expect(auctionView({ ...status, endGas: '754.06' }, start + 1000).state).toBe('sold');
    expect(auctionView({ ...status, endGas: '754.06' }, start + 1000).soldAt).toBe(754.06);
    expect(auctionView(status, end + 1).state).toBe('ended');
  });
});
