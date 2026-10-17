/**
 * `/llms.txt` (plan §3.6, the llmstxt.org format): what the site is and where
 * its pages and data are, for AI readers. Built from the site's page list, so
 * it never names a page that does not exist.
 */
import { SITE_URL } from '../site';
import { LearnTerm, learnPath } from '../learn/terms';
import { SitePage } from '../site-pages';

export const SITE_SUMMARY =
  "Live data on Hyperliquid's markets: every perp on the main exchange and the HIP-3 builder exchanges, every spot pair, funding, open interest, liquidity, lending and listings. Every number is fetched by the reader's browser from Hyperliquid's public API; nothing is stored or altered on the way.";

export function llmsTxt(pages: readonly SitePage[], terms: readonly LearnTerm[]): string {
  return [
    '# hlcharts',
    '',
    `> ${SITE_SUMMARY}`,
    '',
    'Each market has its own page: /perps/<coin>/ on the main exchange, /perps/<exchange>/<coin>/ on a builder exchange, /spot/<base>-<quote>/ for spot. Each exchange has one at /exchanges/<exchange>/. Definitions of every figure are in the methodology.',
    '',
    '## Pages',
    '',
    ...pages.map((p) => `- [${p.title}](${SITE_URL}${p.path}): ${p.summary}`),
    '',
    '## Learn',
    '',
    ...terms.map((t) => `- [${t.term}](${SITE_URL}${learnPath(t.slug)}): ${t.summary}`),
    '',
    '## Data',
    '',
    `- [Every market](${SITE_URL}/markets.json): the market list as of the last build, with each page's address`,
    `- [Definitions and Learn, full text](${SITE_URL}/llms-full.txt): every metric's definition, formula, source and caveats, and every Learn page`,
    '',
  ].join('\n');
}
