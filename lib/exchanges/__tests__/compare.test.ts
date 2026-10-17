/** /exchanges/compare: assets shared across exchanges, and each exchange's live quality figures. */
import { describe, expect, it } from 'vitest';
import { FundingBoardRow } from '../../funding/funding-board';
import { ENRICHED_DEFAULTS, MarketRow } from '../../markets/types';
import { sharedAssets } from '../shared-assets';
import { venueQuality } from '../venue-quality';

const row = (o: Partial<MarketRow> & Pick<MarketRow, 'key' | 'base'>): MarketRow => ({
  kind: 'perp',
  venue: '',
  name: o.base,
  href: '/',
  markPx: 100,
  change24h: 0,
  volume24h: 10,
  oiCoins: 1,
  oiUsd: 100,
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

describe('shared assets', () => {
  const { shared, nameOnly } = sharedAssets([
    row({ key: 'BTC', base: 'BTC', oiUsd: 3e9, markPx: 85_000 }),
    row({ key: 'xyz:BTC', base: 'BTC', venue: 'xyz', oiUsd: 1e6, markPx: 85_100 }),
    row({ key: 'flx:BTC', base: 'BTC', venue: 'flx', delisted: true, markPx: 60_000 }),
    row({ key: 'STX', base: 'STX', oiUsd: 5e6, markPx: 0.38 }),
    row({ key: 'para:STX', base: 'STX', venue: 'para', oiUsd: 1e5, markPx: 840 }),
    row({ key: 'xyz:GOLD', base: 'GOLD', venue: 'xyz' }), // on one exchange only: not shared
    row({ key: '@1', base: 'BTC', kind: 'spot', volume24h: 5, markPx: 85_000 }),
  ]);

  it('groups a name across exchanges when prices agree, largest open interest first', () => {
    expect(shared.map((s) => [s.base, s.markets.map((m) => m.key)])).toEqual([
      ['BTC', ['BTC', 'xyz:BTC']],
    ]);
    expect(shared[0].totalOiUsd).toBe(3e9 + 1e6);
  });

  it('leaves out delisted markets and spot, and lists same names with different prices apart', () => {
    expect(nameOnly.map((n) => [n.base, n.markets.map((m) => m.key)])).toEqual([
      ['STX', ['STX', 'para:STX']],
    ]);
  });
});

describe('venue quality', () => {
  const b = (
    o: Partial<FundingBoardRow> & Pick<FundingBoardRow, 'key' | 'venue'>
  ): FundingBoardRow =>
    ({
      ...row({ key: o.key, base: o.key }),
      params: {
        interest8h: 0.0001,
        clamp8h: 0.0005,
        multiplier: 1,
        documented: { interest: true, clamp: true, multiplier: true },
      },
      state: 'band',
      bandBps: 1,
      ...o,
    }) as FundingBoardRow;

  it('takes medians per exchange and the share at the base funding rate', () => {
    const q = venueQuality([
      b({ key: 'A', venue: '', impactSpreadBps: 1, basisBps: -2 }),
      b({ key: 'B', venue: '', impactSpreadBps: 3, basisBps: 4, state: 'above' }),
      b({ key: 'C', venue: '', impactSpreadBps: 100, basisBps: 1 }),
      b({ key: 'x:D', venue: 'x', impactSpreadBps: null, basisBps: null, state: 'below' }),
    ]);
    expect(q.get('')).toEqual({
      venue: '',
      markets: 3,
      medianImpactSpreadBps: 3,
      medianAbsBasisBps: 2,
      atBaseShare: 2 / 3,
    });
    expect(q.get('x')).toMatchObject({
      medianImpactSpreadBps: null,
      medianAbsBasisBps: null,
      atBaseShare: 0,
    });
  });
});
