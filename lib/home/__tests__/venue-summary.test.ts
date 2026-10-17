/** The venue strip's sums: delisted perps and untraded spot pairs must not count. */
import { describe, expect, it } from 'vitest';
import { ENRICHED_DEFAULTS, MarketRow } from '../../markets/types';
import { venueSummary } from '../venue-summary';

const row = (o: Partial<MarketRow> & Pick<MarketRow, 'key'>): MarketRow => ({
  kind: 'perp',
  venue: '',
  name: o.key,
  href: '/',
  base: o.key,
  markPx: 1,
  change24h: 0,
  volume24h: 100,
  oiCoins: 1,
  oiUsd: 1000,
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

describe('venue strip', () => {
  it('sums live markets per venue: main first, builders by open interest, spot last (USDC-quoted volume only)', () => {
    const s = venueSummary([
      row({ key: 'BTC' }),
      row({ key: 'OLD', delisted: true, oiUsd: 5_000 }),
      row({ key: 'para:X', venue: 'para', oiUsd: 10 }),
      row({ key: 'xyz:Y', venue: 'xyz', oiUsd: 500 }),
      row({ key: 'xyz:Z', venue: 'xyz', oiUsd: 700 }),
      row({ key: '@1', kind: 'spot', venue: 'spot', oiUsd: null, volume24h: 50, quoteToken: 0 }),
      row({ key: '@2', kind: 'spot', venue: 'spot', oiUsd: null, volume24h: 0, quoteToken: 0 }),
      // Quoted in another token (USDT0 is 268): live, but its volume is not added to USDC.
      row({ key: '@3', kind: 'spot', venue: 'spot', oiUsd: null, volume24h: 7, quoteToken: 268 }),
    ]);
    expect(s.map((v) => [v.venue, v.oiUsd, v.volume24h, v.live])).toEqual([
      ['', 1000, 100, 1],
      ['xyz', 1200, 200, 2],
      ['para', 10, 100, 1],
      ['spot', null, 50, 2],
    ]);
  });
});
