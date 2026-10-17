import type { Metadata } from 'next';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { JsonLd } from '../components/json-ld';
import Link from 'next/link';
import { buildMarkets } from '@/lib/build/build-markets';
import { perpSettings } from '@/lib/static/perp-settings';
import { exchangeText, impactSizeText } from '@/lib/static/settings-text';
import { NoJs } from '../components/no-js';
import { StaticTable } from '../components/static-table';
import { LiquidityView } from './liquidity-view';

export const metadata: Metadata = pageMetadata({
  title: 'Hyperliquid liquidity: spread, depth and cost to trade, every market | hlcharts',
  description:
    'What it costs to trade on Hyperliquid, market by market: the impact spread of every perp live, and order-book depth and cost to trade for perps on the main and builder exchanges and for spot pairs, measured on request.',
  path: '/liquidity/',
});

/** The text is written at build time; the numbers load live in the browser. */
export default async function LiquidityPage() {
  const listed = (await buildMarkets()).perps.map(perpSettings).filter((s) => !s.delisted);
  return (
    <main>
      <JsonLd data={breadcrumbList([{ name: 'Liquidity', path: '/liquidity/' }])} />
      <h1>Liquidity</h1>
      <p style={{ maxWidth: '50rem' }}>
        What it costs to trade, market by market: every perp&apos;s impact spread live, and, when
        you ask, each market&apos;s order book read into depth and cost for a trade size you pick,
        on the main exchange, the builder exchanges and spot. Live from Hyperliquid&apos;s public
        API.
      </p>
      <LiquidityView />
      <NoJs live="Impact spreads, volume, and the spread, depth and cost read from each order book are live.">
        <StaticTable
          caption="The trade size Hyperliquid measures each listed perp's impact spread at"
          head={['Market', 'Exchange', 'Impact size']}
          rows={listed.map((s) => [
            <Link key="m" href={s.path}>
              {s.coin}
            </Link>,
            exchangeText(s.dex),
            impactSizeText(s),
          ])}
        />
      </NoJs>
    </main>
  );
}
