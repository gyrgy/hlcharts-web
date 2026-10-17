/** /learn: terms have usable addresses and only link to pages and anchors that exist; the basis is right. */
import { describe, expect, it } from 'vitest';
import { METRICS } from '../../methodology/metrics';
import { ENRICHED_DEFAULTS, MarketRow } from '../../markets/types';
import { SITE_PAGES } from '../../site-pages';
import { spotPerpBasis } from '../spot-perp-basis';
import { LEARN_TERMS, learnPath } from '../terms';

describe('learn terms', () => {
  it('have unique, usable slugs', () => {
    const slugs = LEARN_TERMS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it('link only to pages of the site, other terms and methodology anchors that exist', () => {
    const pages = new Set([
      ...SITE_PAGES.map((p) => p.path),
      ...LEARN_TERMS.map((t) => learnPath(t.slug)),
    ]);
    const anchors = new Set(METRICS.map((m) => m.id));
    for (const t of LEARN_TERMS) {
      for (const r of t.related) {
        const anchor = r.href.match(/^\/methodology\/#([a-z0-9-]+)$/)?.[1];
        expect([t.slug, r.href, anchor ? anchors.has(anchor) : pages.has(r.href)]).toEqual([
          t.slug,
          r.href,
          true,
        ]);
      }
    }
  });
});

describe('spot–perp basis', () => {
  const row = (o: Partial<MarketRow> & Pick<MarketRow, 'key' | 'base'>): MarketRow => ({
    kind: 'perp',
    venue: '',
    name: o.base,
    href: '/',
    markPx: 100,
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

  it('pairs each spot market with the same asset as a perp, busiest spot first, in basis points', () => {
    const b = spotPerpBasis([
      row({ key: 'HYPE', base: 'HYPE', markPx: 90.271 }),
      row({
        key: '@107',
        base: 'HYPE',
        kind: 'spot',
        venue: 'spot',
        markPx: 90.281,
        volume24h: 3e7,
      }),
      row({
        key: '@200',
        base: 'HYPE',
        kind: 'spot',
        venue: 'spot',
        markPx: 90.245,
        volume24h: 2e4,
      }),
      row({ key: 'TRUMP', base: 'TRUMP', markPx: 2.045 }),
      row({
        key: '@9',
        base: 'TRUMP',
        kind: 'spot',
        venue: 'spot',
        markPx: 0.000578,
        volume24h: 5,
      }), // a different asset
      row({ key: '@10', base: 'PURR', kind: 'spot', venue: 'spot', volume24h: 0 }), // untraded: no part
      row({ key: 'PURR', base: 'PURR' }),
    ]);
    expect(b.map((x) => [x.spot.key, x.perp.key])).toEqual([
      ['@107', 'HYPE'],
      ['@200', 'HYPE'],
    ]);
    expect(b[0].basisBps).toBeCloseTo(((90.271 - 90.281) / 90.281) * 10_000, 9);
  });
});
