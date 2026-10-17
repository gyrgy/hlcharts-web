/** The 404 page: raw forms find their page, new listings show live, nothing loops, spot names match the build. */
import { describe, expect, it } from 'vitest';
import { spotPages } from '../../markets/spot-pages';
import { liveTargets } from '../live-targets';
import { normalizePath } from '../normalize-path';
import { resolveMissing } from '../resolve-missing';

const UNIVERSE = {
  perps: new Map([
    [
      '',
      [
        { dex: '', name: 'BTC', szDecimals: 5, maxLeverage: 40 },
        { dex: '', name: 'NEWCOIN', szDecimals: 0, maxLeverage: 3 },
      ],
    ],
    ['xyz', [{ dex: 'xyz', name: 'xyz:NVDA', szDecimals: 3, maxLeverage: 10 }]],
  ]),
  dexes: new Map([['', null]]),
  spot: [
    { tokens: [150, 0] as [number, number], name: '@107', index: 107, isCanonical: false },
    { tokens: [1, 0] as [number, number], name: 'PURR/USDC', index: 0, isCanonical: true },
    { tokens: [1, 0] as [number, number], name: '@9', index: 9, isCanonical: false },
  ],
  tokenNames: new Map([
    [0, 'USDC'],
    [1, 'PURR'],
    [150, 'HYPE'],
  ]),
};
// What the build wrote (markets.json and the site's pages): NEWCOIN was listed after it.
const BUILT = new Set(['/', '/markets/', '/perps/btc/', '/perps/xyz/nvda/', '/spot/hype-usdc/']);
const live = liveTargets(UNIVERSE);

describe('normalizing an address', () => {
  it('lowercases, splits a builder exchange name, joins a spot pair and ends with a slash', () => {
    expect(normalizePath('/perps/BTC')).toBe('/perps/btc/');
    expect(normalizePath('/perps/xyz:NVDA')).toBe('/perps/xyz/nvda/');
    expect(normalizePath('/perps/xyz%3ANVDA/')).toBe('/perps/xyz/nvda/');
    expect(normalizePath('/spot/HYPE/USDC')).toBe('/spot/hype-usdc/');
    expect(normalizePath('/Markets')).toBe('/markets/');
    expect(normalizePath('/perps/%E0%A4%A')).toBe('/perps/%e0%a4%a/'); // broken encoding: kept
  });
});

describe('resolving a missing address', () => {
  it('sends a raw or mistyped form to the page that exists', () => {
    expect(resolveMissing('/perps/BTC', BUILT, live)).toEqual({
      kind: 'redirect',
      to: '/perps/btc/',
    });
    expect(resolveMissing('/perps/xyz:NVDA', BUILT, live)).toEqual({
      kind: 'redirect',
      to: '/perps/xyz/nvda/',
    });
    expect(resolveMissing('/spot/HYPE/USDC', BUILT, live)).toEqual({
      kind: 'redirect',
      to: '/spot/hype-usdc/',
    });
  });

  it('shows a market listed since the build live, under any casing', () => {
    for (const p of ['/perps/newcoin/', '/perps/NEWCOIN']) {
      const r = resolveMissing(p, BUILT, live);
      expect(r.kind).toBe('perp');
      expect(r.kind === 'perp' && r.page.market.name).toBe('NEWCOIN');
    }
  });

  it('never redirects an address to itself, and admits when there is nothing', () => {
    expect(resolveMissing('/perps/btc/', BUILT, new Map())).toEqual({ kind: 'none' });
    expect(resolveMissing('/nothing-here', BUILT, live)).toEqual({ kind: 'none' });
  });
});

describe('spot pages', () => {
  it('names pairs from their tokens and numbers only those sharing a name, as the build does', () => {
    expect(
      spotPages(UNIVERSE.spot, UNIVERSE.tokenNames, new Map([['@107', 5]])).map((s) => [
        s.coin,
        s.path,
        s.volume24h,
      ])
    ).toEqual([
      ['@107', '/spot/hype-usdc/', 5],
      ['PURR/USDC', '/spot/purr-usdc-0/', 0],
      ['@9', '/spot/purr-usdc-9/', 0],
    ]);
  });

  it('refuses a pair naming an unknown token; the 404 page then leaves spot out', () => {
    const odd = [
      { tokens: [999, 0] as [number, number], name: '@5', index: 5, isCanonical: false },
    ];
    expect(() => spotPages(odd, UNIVERSE.tokenNames, new Map())).toThrow(/unknown tokens/);
    const t = liveTargets({ ...UNIVERSE, spot: odd });
    expect([...t.keys()].some((k) => k.startsWith('/spot/'))).toBe(false);
    expect(t.has('/perps/btc/')).toBe(true);
  });
});
