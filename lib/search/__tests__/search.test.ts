/** The header search: what `/markets.json` holds, and what a query finds first. */
import { describe, expect, it } from 'vitest';
import { BuildMarkets } from '../../build/build-markets';
import { searchIndex } from '../search-index';
import { searchMarkets } from '../search-markets';
import { SearchEntry } from '../types';

const perp = (dex: string, name: string, isDelisted = false): BuildMarkets['perps'][number] => ({
  path: `/perps/${name.toLowerCase().replace(':', '/')}/`,
  market: { dex, name, szDecimals: 0, maxLeverage: 10, isDelisted },
  dex: null,
});

const markets: BuildMarkets = {
  perps: [
    perp('', 'BTC'),
    perp('', 'HYPE'),
    perp('', 'OLDBTC', true),
    perp('xyz', 'xyz:NVDA'),
    perp('xyz', 'xyz:BTC'),
    perp('flx', 'flx:BTC', true),
  ],
  spot: [
    { path: '/spot/hype-usdc/', coin: '@107', base: 'HYPE', quote: 'USDC', volume24h: 1 },
    { path: '/spot/ubtc-usdc/', coin: '@142', base: 'UBTC', quote: 'USDC', volume24h: 1 },
    { path: '/spot/hype-usdh/', coin: '@200', base: 'HYPE', quote: 'USDH', volume24h: 0 },
  ],
  exchanges: [],
};
const index = searchIndex(markets, '2026-10-04T00:00:00.000Z');
const found = (q: string): string[] =>
  searchMarkets(index.markets, q).map((e: SearchEntry) => `${e.venue} ${e.name}`);

describe('markets.json', () => {
  it('names builder perps without their exchange and spot pairs by token', () => {
    expect(index.markets.find((e) => e.path === '/perps/xyz/nvda/')).toEqual({
      name: 'NVDA',
      base: 'NVDA',
      venue: 'xyz',
      kind: 'perp',
      path: '/perps/xyz/nvda/',
      delisted: false,
    });
    expect(index.markets.find((e) => e.path === '/spot/hype-usdc/')).toMatchObject({
      name: 'HYPE/USDC',
      base: 'HYPE',
      venue: 'spot',
    });
    expect(index.markets).toHaveLength(9);
  });
});

describe('search ranking', () => {
  it('puts every live market before any delisted one, even an exact delisted match', () => {
    expect(found('btc')).toEqual([
      'main BTC',
      'xyz BTC',
      'spot UBTC/USDC',
      'flx BTC',
      'main OLDBTC',
    ]);
  });

  it('puts the exact name first, then perps before spot', () => {
    expect(found('hype')).toEqual(['main HYPE', 'spot HYPE/USDC', 'spot HYPE/USDH']);
  });

  it('finds markets by exchange and by full pair name', () => {
    expect(found('xyz')).toEqual(['xyz BTC', 'xyz NVDA']);
    expect(found('xyz:nv')).toEqual(['xyz NVDA']);
    expect(found(' HYPE/USDH ')).toEqual(['spot HYPE/USDH']);
  });

  it('does not match a quote token alone: "usdc" is not every pair quoted in USDC', () => {
    expect(found('usdc')).toEqual([]);
  });

  it('finds nothing for an empty query and caps the list', () => {
    expect(found('  ')).toEqual([]);
    expect(found('b')).toHaveLength(5);
    expect(searchMarkets(index.markets, 'b', 2)).toHaveLength(2);
  });
});
