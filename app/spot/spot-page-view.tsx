/**
 * A spot pair's page: the text is written at build time from Hyperliquid's
 * pair list; the numbers load live in the browser. Also shown by the 404 page
 * for a pair listed since the last build.
 */
import Link from 'next/link';
import { SpotPage } from '@/lib/markets/spot-pages';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { BookPanel } from '../components/book-panel';
import { JsonLd } from '../components/json-ld';
import { NoJs } from '../components/no-js';
import { PriceChart } from '../components/price-chart';
import { SiblingsPanel } from '../components/siblings-panel';
import { SpotLiveHeader } from '../components/spot-live-header';
import { TradesTape } from '../components/trades-tape';

export function SpotPageView({ page }: { page: SpotPage }) {
  return (
    <main>
      <JsonLd
        data={breadcrumbList([
          { name: 'Markets', path: '/markets/' },
          { name: `${page.base}/${page.quote} spot`, path: page.path },
        ])}
      />
      <p style={{ fontSize: '0.85em' }}>
        <Link href="/markets/">Markets</Link> › spot
      </p>
      <h1>
        {page.base}/{page.quote} spot
      </h1>
      <p style={{ maxWidth: '50rem' }}>
        {page.base} traded against {page.quote} on Hyperliquid&apos;s spot market. The price below
        updates every second; the 24-hour change and volume every 5 minutes.
      </p>
      <SpotLiveHeader coin={page.coin} quote={page.quote} />
      <h2>Price</h2>
      <PriceChart coin={page.coin} label={page.base + '/' + page.quote} />
      <h2>Book and cost to trade</h2>
      <BookPanel coin={page.coin} />
      <h2>Same asset elsewhere</h2>
      <SiblingsPanel coin={page.coin} />
      <h2>Recent trades</h2>
      <TradesTape coin={page.coin} />
      <NoJs live="The price and its chart, the order book and the cost to trade, the same asset on other exchanges and recent trades are live." />
      <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85em', maxWidth: '50rem' }}>
        Source: Hyperliquid&apos;s public API, read by your browser. Trades show the taker&apos;s
        side; the traders are not shown.
      </p>
    </main>
  );
}
