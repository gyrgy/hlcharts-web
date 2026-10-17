import type { Metadata } from 'next';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { JsonLd } from '../components/json-ld';
import Link from 'next/link';
import { buildMarkets } from '@/lib/build/build-markets';
import { MISSING } from '@/lib/format/format';
import { perpSettings } from '@/lib/static/perp-settings';
import { exchangeText, leverageText, marginText, statusText } from '@/lib/static/settings-text';
import { NoJs } from '../components/no-js';
import { StaticTable } from '../components/static-table';
import { ListingsView } from './listings-view';

export const metadata: Metadata = pageMetadata({
  title: 'Hyperliquid listings: every perp on every exchange, and the listing auction | hlcharts',
  description:
    "Every perp listed on Hyperliquid's main exchange and builder exchanges, delisted ones included: leverage tiers, margin rules, fee settings, markets at their cap, and the live perp listing auction.",
  path: '/listings/',
});

/** The text is written at build time; the lists load live in the browser. */
export default async function ListingsPage() {
  const { perps, exchanges } = await buildMarkets();
  return (
    <main>
      <JsonLd data={breadcrumbList([{ name: 'Listings', path: '/listings/' }])} />
      <h1>Listings</h1>
      <p style={{ maxWidth: '50rem' }}>
        Every perp listed on Hyperliquid, on the main exchange and every builder exchange, delisted
        ones included, with how each may be traded, and the auction that sells the next listing.
        Live from Hyperliquid&apos;s public API.
      </p>
      <ListingsView />
      <NoJs live="Leverage tiers, markets at their cap and the listing auction are live.">
        <StaticTable
          caption="Every perp in Hyperliquid's market list, delisted ones included"
          head={[
            'Market',
            'Exchange',
            'Maximum leverage',
            'Margin',
            'Deployer fee scale',
            'Status',
          ]}
          rows={perps.map(perpSettings).map((s) => [
            <Link key="m" href={s.path}>
              {s.coin}
            </Link>,
            exchangeText(s.dex),
            leverageText(s),
            marginText(s),
            s.deployerFeeScale ?? MISSING,
            statusText(s),
          ])}
        />
        <StaticTable
          caption="Exchanges"
          head={['Exchange', 'Name']}
          rows={exchanges.map((e) => [
            <Link key="e" href={e.path}>
              {exchangeText(e.dex)}
            </Link>,
            e.fullName ?? 'Hyperliquid main exchange',
          ])}
        />
      </NoJs>
    </main>
  );
}
