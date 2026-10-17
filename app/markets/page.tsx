import type { Metadata } from 'next';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { JsonLd } from '../components/json-ld';
import Link from 'next/link';
import { buildMarkets } from '@/lib/build/build-markets';
import { perpSettings } from '@/lib/static/perp-settings';
import { exchangeText, leverageText, marginText } from '@/lib/static/settings-text';
import { NoJs } from '../components/no-js';
import { StaticTable } from '../components/static-table';
import { MarketsTable } from './markets-table';

export const metadata: Metadata = pageMetadata({
  title: 'Hyperliquid markets: perps, builder exchanges and spot | hlcharts',
  description:
    'Every Hyperliquid market in one table: perpetuals on the main exchange and on builder (HIP-3) exchanges, and spot pairs, with price, volume, open interest, funding, basis, cost to trade and cap use, live from Hyperliquid.',
  path: '/markets/',
});

/** The text is written at build time (for readers and search engines); the numbers load live in the browser. */
export default async function MarketsPage() {
  const { perps, spot } = await buildMarkets();
  const listed = perps.map(perpSettings).filter((s) => !s.delisted);
  return (
    <main>
      <JsonLd data={breadcrumbList([{ name: 'Markets', path: '/markets/' }])} />
      <h1>Hyperliquid markets</h1>
      <p style={{ maxWidth: '50rem' }}>
        Every market Hyperliquid lists, in one table: perpetuals on its main exchange and on the
        builder exchanges that third parties run on it (HIP-3), and spot pairs. Prices update every
        second; funding, open interest and the other figures about every 15 seconds; spot volumes
        every 5 minutes. Everything comes from Hyperliquid&apos;s public API, fetched by your
        browser.
      </p>
      <MarketsTable />
      <NoJs live="Prices, volume, open interest, funding, basis, cost to trade and cap use are live.">
        <StaticTable
          caption="Perpetuals listed on Hyperliquid's main and builder exchanges"
          head={['Market', 'Exchange', 'Maximum leverage', 'Margin']}
          rows={listed.map((s) => [
            <Link key="m" href={s.path}>
              {s.coin}
            </Link>,
            exchangeText(s.dex),
            leverageText(s),
            marginText(s),
          ])}
        />
        <StaticTable
          caption="Spot pairs on Hyperliquid"
          head={['Pair', 'Base token', 'Quote token']}
          rows={spot.map((p) => [
            <Link key="p" href={p.path}>
              {p.base}/{p.quote}
            </Link>,
            p.base,
            p.quote,
          ])}
        />
      </NoJs>
    </main>
  );
}
