import type { Metadata } from 'next';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { JsonLd } from '../components/json-ld';
import Link from 'next/link';
import { buildMarkets } from '@/lib/build/build-markets';
import { perpSettings } from '@/lib/static/perp-settings';
import { capText, exchangeText } from '@/lib/static/settings-text';
import { NoJs } from '../components/no-js';
import { StaticTable } from '../components/static-table';
import { OiView } from './oi-view';

export const metadata: Metadata = pageMetadata({
  title: 'Hyperliquid open interest: every perp and exchange, live | hlcharts',
  description:
    "Open interest across Hyperliquid's main exchange and builder exchanges, live: by exchange and market, against 24-hour volume, and how full each market's open-interest cap is.",
  path: '/open-interest/',
});

/** The text is written at build time; the numbers load live in the browser. */
export default async function OpenInterestPage() {
  const { perps, exchanges } = await buildMarkets();
  const listed = perps.map(perpSettings).filter((s) => !s.delisted);
  return (
    <main>
      <JsonLd data={breadcrumbList([{ name: 'Open interest', path: '/open-interest/' }])} />
      <h1>Open interest</h1>
      <p style={{ maxWidth: '50rem' }}>
        How much is held open on Hyperliquid&apos;s perps right now, on the main exchange and every
        builder exchange: by exchange, by market, against what trades in a day, and against each
        market&apos;s cap. Live from Hyperliquid&apos;s public API.
      </p>
      <OiView />
      <NoJs live="Open interest by exchange and market, the map of it, its ratio to 24-hour volume and how full each cap is are live.">
        <StaticTable
          caption="Exchanges with live perps"
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
        <StaticTable
          caption="Each listed perp's open-interest cap, set by its builder exchange (the main exchange does not publish its caps)"
          head={['Market', 'Exchange', 'Open-interest cap']}
          rows={listed.map((s) => [
            <Link key="m" href={s.path}>
              {s.coin}
            </Link>,
            exchangeText(s.dex),
            capText(s),
          ])}
        />
      </NoJs>
    </main>
  );
}
