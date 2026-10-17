import type { Metadata } from 'next';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { JsonLd } from '../components/json-ld';
import Link from 'next/link';
import { buildMarkets } from '@/lib/build/build-markets';
import { MISSING } from '@/lib/format/format';
import { MAIN_DEX } from '@/lib/hl/constants';
import { exchangeDex } from '@/lib/static/exchange-dex';
import { exchangeText } from '@/lib/static/settings-text';
import { NoJs } from '../components/no-js';
import { StaticTable } from '../components/static-table';
import { ExchangesView } from './exchanges-view';

export const metadata: Metadata = pageMetadata({
  title: "Hyperliquid's exchanges: the main exchange and every builder exchange (HIP-3) | hlcharts",
  description:
    "Every perp exchange on Hyperliquid, the main one and the HIP-3 builder exchanges, live: markets, open interest, volume, each exchange's share, its open-interest cap and who deployed it.",
  path: '/exchanges/',
});

/** The text is written at build time; the numbers load live in the browser. */
export default async function ExchangesPage() {
  const markets = await buildMarkets();
  return (
    <main>
      <JsonLd data={breadcrumbList([{ name: 'Exchanges', path: '/exchanges/' }])} />
      <h1>Exchanges</h1>
      <p style={{ maxWidth: '50rem' }}>
        Hyperliquid runs its own perp exchange and, since HIP-3, lets others deploy theirs on the
        same chain: builder exchanges, each with its own markets, caps and settings. Every one in
        Hyperliquid&apos;s list, live, including those whose markets have all been delisted.{' '}
        <Link href="/exchanges/compare/">Compare them side by side</Link>.
      </p>
      <ExchangesView />
      <NoJs live="Each exchange's markets, open interest, volume, share and cap use are live.">
        <StaticTable
          caption="Every perp exchange in Hyperliquid's list"
          head={['Exchange', 'Name', 'Deployed by']}
          rows={markets.exchanges.map((e) => [
            <Link key="e" href={e.path}>
              {exchangeText(e.dex)}
            </Link>,
            e.fullName ?? 'Hyperliquid main exchange',
            e.dex === MAIN_DEX ? 'Hyperliquid' : (exchangeDex(markets, e.dex)?.deployer ?? MISSING),
          ])}
        />
      </NoJs>
    </main>
  );
}
