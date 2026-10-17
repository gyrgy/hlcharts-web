import type { Metadata } from 'next';
import { websiteLd } from '@/lib/seo/website-ld';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { JsonLd } from './components/json-ld';
import Link from 'next/link';
import { buildMarkets } from '@/lib/build/build-markets';
import { SITE_PUBLIC } from '@/lib/site';
import { SITE_PAGES } from '@/lib/site-pages';
import { exchangeText } from '@/lib/static/settings-text';
import { NoJs } from './components/no-js';
import { StaticTable } from './components/static-table';
import { HomeLive } from './home-live';

export const metadata: Metadata = pageMetadata({
  title: 'hlcharts: Hyperliquid markets, funding and open interest, live',
  description:
    "Every Hyperliquid market live: perps on the main exchange and the builder exchanges, spot, funding against Binance and Bybit, open-interest caps and cost to trade, from Hyperliquid's public API.",
  path: '/',
});

/** The text is written at build time; the numbers load live in the browser. */
export default async function Home() {
  const { exchanges } = await buildMarkets();
  return (
    <main>
      <JsonLd data={websiteLd()} />
      <h1>Hyperliquid, live</h1>
      <p style={{ maxWidth: '50rem' }}>
        Every market on Hyperliquid&apos;s main exchange, its builder exchanges and its spot market,
        with funding against Binance and Bybit, open-interest caps and the cost to trade, straight
        from Hyperliquid&apos;s public API.
      </p>
      <p style={{ maxWidth: '50rem', color: 'var(--muted-foreground)' }}>
        hlcharts is in early access. Everything here is live from Hyperliquid&apos;s public API.
        Longer history and new sections arrive in late October.
      </p>
      <HomeLive />
      <NoJs live="Each exchange's totals, the market map, funding against Binance and Bybit, the highest and lowest funding, open-interest caps, prices against their oracles, lending and the busiest markets are live.">
        <StaticTable
          caption="What the site covers"
          head={['Section', 'What it shows']}
          rows={SITE_PAGES.filter((p) => p.nav).map((p) => [
            <Link key="s" href={p.path}>
              {p.title}
            </Link>,
            p.summary,
          ])}
        />
        <StaticTable
          caption="Hyperliquid's exchanges with live perps"
          head={['Exchange', 'Name']}
          rows={exchanges
            .filter((e) => e.live > 0)
            .map((e) => [
              <Link key="e" href={e.path}>
                {exchangeText(e.dex)}
              </Link>,
              e.fullName ?? 'Hyperliquid main exchange',
            ])}
        />
      </NoJs>
      {!SITE_PUBLIC && (
        <p style={{ fontSize: '0.8em', color: 'var(--muted-foreground)', marginTop: '2rem' }}>
          Development pages: <Link href="/feed-test/">feed test</Link> ·{' '}
          <Link href="/live-client/">live client check</Link>
        </p>
      )}
    </main>
  );
}
