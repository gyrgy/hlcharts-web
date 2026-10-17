/** /exchanges: per-exchange totals, builder shares, exchange-wide cap use, and shared deployers. */
import { describe, expect, it } from 'vitest';
import { ExchangeListing, ListingRow } from '../../listings/listings';
import { exchangePath } from '../../markets/market-paths';
import { ENRICHED_DEFAULTS, MarketRow } from '../../markets/types';
import { exchangeSummaries } from '../exchange-summaries';

const row = (o: Partial<MarketRow> & Pick<MarketRow, 'key'>): MarketRow => ({
  kind: 'perp',
  venue: '',
  name: o.key,
  href: '/',
  base: o.key,
  markPx: 1,
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
const market = (key: string, o: Partial<ListingRow> = {}): ListingRow => ({
  key,
  name: key,
  href: '/',
  delisted: false,
  maxLeverage: 10,
  tiers: [{ fromUsd: 0, maxLeverage: 10 }],
  margin: 'cross',
  growthMode: false,
  feeScale: null,
  feeScaleChangedAt: null,
  atCap: false,
  ...o,
});
const exchange = (
  dex: string,
  deployer: string | null,
  markets: ListingRow[]
): ExchangeListing => ({
  dex,
  fullName: dex ? dex.toUpperCase() : null,
  deployer,
  live: markets.filter((m) => !m.delisted).length,
  delisted: markets.filter((m) => m.delisted).length,
  markets,
});

describe('exchange summaries', () => {
  const s = exchangeSummaries(
    [
      exchange('', null, [market('BTC'), market('ETH')]),
      exchange('xyz', '0xAA', [
        market('xyz:A', { growthMode: true }),
        market('xyz:OLD', { delisted: true, growthMode: true }),
      ]),
      exchange('km', '0xbb', [market('km:B', { delisted: true })]),
      exchange('mkts', '0xBB', [market('mkts:C')]),
    ],
    [
      row({ key: 'BTC', oiUsd: 1000, atCap: true }),
      row({ key: 'ETH', oiUsd: 500 }),
      row({ key: 'xyz:A', venue: 'xyz', oiUsd: 300, capUse: 0.85 }),
      row({ key: 'mkts:C', venue: 'mkts', oiUsd: 100, capUse: 0.5 }),
      row({ key: 'OLD', delisted: true, oiUsd: 9999 }),
    ],
    new Map([
      ['xyz', 1000],
      ['mkts', 200],
    ])
  );
  const by = new Map(s.map((x) => [x.dex, x]));

  it('keeps every exchange, ones without live markets too, with links', () => {
    expect(s.map((x) => [x.dex, x.live, x.delisted, x.href])).toEqual([
      ['', 2, 0, exchangePath('')],
      ['xyz', 1, 1, '/exchanges/xyz/'],
      ['km', 0, 1, '/exchanges/km/'],
      ['mkts', 1, 0, '/exchanges/mkts/'],
    ]);
    expect(exchangePath('')).toBe('/exchanges/main/');
  });

  it('sums live figures; builder exchanges get a share of builder open interest', () => {
    expect([by.get('')?.oiUsd, by.get('')?.volume24h, by.get('')?.builderShare]).toEqual([
      1500,
      20,
      null,
    ]);
    expect(by.get('xyz')?.builderShare).toBe(0.75);
    expect(by.get('mkts')?.builderShare).toBe(0.25);
    expect(by.get('km')?.oiUsd).toBe(0);
  });

  it('reads cap use against the exchange-wide cap, and counts markets at or near their cap', () => {
    expect(by.get('xyz')?.capUse).toBe(0.3);
    expect(by.get('mkts')?.capUse).toBe(0.5);
    expect(by.get('km')?.capUse).toBeNull();
    expect(by.get('')?.atOrNearCap).toBe(1); // listed at cap
    expect(by.get('xyz')?.atOrNearCap).toBe(1); // 85% of its cap
    expect(by.get('mkts')?.atOrNearCap).toBe(0);
  });

  it('counts growth mode on live markets only, and names exchanges sharing a deployer (any case)', () => {
    expect(by.get('xyz')?.growthModeLive).toBe(1);
    expect(by.get('km')?.sharesDeployerWith).toEqual(['mkts']);
    expect(by.get('mkts')?.sharesDeployerWith).toEqual(['km']);
    expect(by.get('xyz')?.sharesDeployerWith).toEqual([]);
    expect(by.get('')?.sharesDeployerWith).toEqual([]);
  });
});
