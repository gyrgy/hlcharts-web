import type { Metadata } from 'next';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { JsonLd } from '../../components/json-ld';
import Link from 'next/link';
import { buildMarkets } from '@/lib/build/build-markets';
import { exchangeText } from '@/lib/static/settings-text';
import { NoJs } from '../../components/no-js';
import { StaticTable } from '../../components/static-table';
import { CompareView } from './compare-view';

export const metadata: Metadata = pageMetadata({
  title: "Hyperliquid's builder exchanges compared, and the assets they share | hlcharts",
  description:
    "Hyperliquid's HIP-3 builder exchanges side by side with the main exchange, live: size, spreads, how closely prices track their oracles, funding and fee settings, and the same assets listed on several exchanges.",
  path: '/exchanges/compare/',
});

/** The text is written at build time; the numbers load live in the browser. */
export default async function ComparePage() {
  const { exchanges } = await buildMarkets();
  return (
    <main>
      <JsonLd
        data={breadcrumbList([
          { name: 'Exchanges', path: '/exchanges/' },
          { name: 'Compared', path: '/exchanges/compare/' },
        ])}
      />
      <p style={{ fontSize: '0.85em' }}>
        <Link href="/exchanges/">Exchanges</Link> ›
      </p>
      <h1>Exchanges compared</h1>
      <p style={{ maxWidth: '50rem' }}>
        The exchanges with live markets side by side, with Hyperliquid&apos;s main exchange as the
        reference: how big each is, how its markets trade right now, how it is set up, and the
        assets listed on more than one of them.
      </p>
      <CompareView />
      <NoJs live="The comparison itself, size, spreads, price tracking, settings and the shared assets, is live.">
        <StaticTable
          caption="The exchanges compared: those with live perps"
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
    </main>
  );
}
