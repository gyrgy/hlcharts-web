/**
 * The sitemap (plan §3.6): an index pointing to one list per kind of page,
 * each holding only the pages that may be indexed (lib/seo/indexable.ts).
 * No lastmod: we do not record when a page's text changed, and a build date
 * would claim changes that did not happen (Google uses lastmod only when it is
 * accurate).
 */
import { BuildMarkets } from '../build/build-markets';
import { LEARN_TERMS, learnPath } from '../learn/terms';
import { SITE_PAGES } from '../site-pages';
import { exchangeIndexable, pageIndexable, perpIndexable, spotIndexable } from './indexable';

export const SITEMAP_SECTIONS = ['pages', 'markets', 'exchanges', 'learn'] as const;
export type SitemapSection = (typeof SITEMAP_SECTIONS)[number];

export const sitemapPath = (section: SitemapSection): string => `/sitemaps/${section}.xml`;

export function sitemapPaths(
  markets: BuildMarkets,
  isPublic: boolean
): Record<SitemapSection, string[]> {
  return {
    pages: pageIndexable(isPublic) ? SITE_PAGES.map((p) => p.path) : [],
    markets: [
      ...markets.perps
        .filter((p) => perpIndexable(p.market.isDelisted === true, isPublic))
        .map((p) => p.path),
      ...markets.spot.filter((s) => spotIndexable(s.volume24h, isPublic)).map((s) => s.path),
    ],
    exchanges: markets.exchanges
      .filter((e) => exchangeIndexable(e.live, isPublic))
      .map((e) => e.path),
    learn: pageIndexable(isPublic) ? LEARN_TERMS.map((t) => learnPath(t.slug)) : [],
  };
}

const escape = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export function urlsetXml(urls: readonly string[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  <url><loc>${escape(u)}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
}

export function sitemapIndexXml(urls: readonly string[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  <sitemap><loc>${escape(u)}</loc></sitemap>`),
    '</sitemapindex>',
    '',
  ].join('\n');
}
