/** Sitemap, AI-reader files and the site's page list: each follows one rule and names only real pages. */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { BuildMarkets } from '../../build/build-markets';
import { LEARN_TERMS, learnPath } from '../../learn/terms';
import { CHANGELOG, METRICS } from '../../methodology/metrics';
import { OPERATOR_NAME, SITE_PUBLIC, SITE_URL } from '../../site';
import { SITE_PAGES } from '../../site-pages';
import { llmsFullTxt } from '../llms-full-txt';
import { llmsTxt } from '../llms-txt';
import { sitemapPaths, urlsetXml } from '../sitemap';

const perp = (dex: string, name: string, isDelisted = false): BuildMarkets['perps'][number] => ({
  path: `/perps/${name.toLowerCase().replace(':', '/')}/`,
  market: { dex, name, szDecimals: 0, maxLeverage: 10, isDelisted },
  dex: null,
});
const MARKETS: BuildMarkets = {
  perps: [perp('', 'BTC'), perp('', 'FTM', true), perp('xyz', 'xyz:NVDA')],
  spot: [
    { path: '/spot/hype-usdc/', coin: '@107', base: 'HYPE', quote: 'USDC', volume24h: 5e6 },
    { path: '/spot/purr-usdc/', coin: 'PURR/USDC', base: 'PURR', quote: 'USDC', volume24h: 9_999 },
  ],
  exchanges: [
    { dex: '', path: '/exchanges/main/', fullName: null, live: 178 },
    { dex: 'flx', path: '/exchanges/flx/', fullName: 'Felix Exchange', live: 0 },
  ],
};

describe('sitemap', () => {
  it('lists nothing while the site is not public', () => {
    expect(sitemapPaths(MARKETS, false)).toEqual({
      pages: [],
      markets: [],
      exchanges: [],
      learn: [],
    });
  });

  it('lists, once public, exactly the pages each rule lets search engines index', () => {
    const s = sitemapPaths(MARKETS, true);
    expect(s.pages).toEqual(SITE_PAGES.map((p) => p.path));
    expect(s.markets).toEqual(['/perps/btc/', '/perps/xyz/nvda/', '/spot/hype-usdc/']);
    expect(s.exchanges).toEqual(['/exchanges/main/']);
    expect(s.learn).toEqual(LEARN_TERMS.map((t) => learnPath(t.slug)));
  });

  it('writes valid XML, escaping what must be escaped', () => {
    expect(urlsetXml([`${SITE_URL}/a?b=1&c=2`])).toContain(
      '<loc>https://hlcharts.com/a?b=1&amp;c=2</loc>'
    );
    expect(urlsetXml([])).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>'
    );
  });
});

describe('files for AI readers', () => {
  it('llms.txt links every page of the site, and the market list', () => {
    const t = llmsTxt(SITE_PAGES, LEARN_TERMS);
    for (const p of SITE_PAGES) expect(t).toContain(`](${SITE_URL}${p.path})`);
    for (const l of LEARN_TERMS) expect(t).toContain(`](${SITE_URL}${learnPath(l.slug)})`);
    expect(t).toContain(`${SITE_URL}/markets.json`);
    expect(t.startsWith('# hlcharts\n\n> ')).toBe(true);
  });

  it('llms-full.txt carries every definition and the changelog', () => {
    const t = llmsFullTxt(METRICS, CHANGELOG, LEARN_TERMS);
    for (const m of METRICS) expect(t).toContain(`## ${m.name}\n\n${m.what}`);
    for (const e of CHANGELOG) expect(t).toContain(`- ${e.date}: ${e.change}`);
    for (const l of LEARN_TERMS) for (const p of l.body) expect(t).toContain(p);
  });
});

describe('going public', () => {
  it("never happens while the privacy statement's operator is blank", () => {
    expect(SITE_PUBLIC && OPERATOR_NAME === null).toBe(false);
  });
});

describe("the site's page list", () => {
  it('names only pages that exist in the app', () => {
    const app = path.join(__dirname, '../../../app');
    for (const p of SITE_PAGES) {
      expect([p.path, fs.existsSync(path.join(app, p.path, 'page.tsx'))]).toEqual([p.path, true]);
    }
  });
});
