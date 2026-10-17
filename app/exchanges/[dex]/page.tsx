/** One exchange: `/exchanges/main/` or `/exchanges/<dex>/`, one page per exchange in perpDexs (plan §2). */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildMarkets } from '@/lib/build/build-markets';
import { MAIN_DEX } from '@/lib/hl/constants';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { exchangeIndexable, robotsFor } from '@/lib/seo/indexable';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { exchangeDex } from '@/lib/static/exchange-dex';
import { perpSettings } from '@/lib/static/perp-settings';
import {
  capText,
  clampText,
  interestText,
  leverageText,
  marginText,
  multiplierText,
  statusText,
} from '@/lib/static/settings-text';
import { JsonLd } from '../../components/json-ld';
import { NoJs } from '../../components/no-js';
import { StaticTable } from '../../components/static-table';
import { ExchangeView } from './exchange-view';

export const dynamicParams = false;

type Params = { params: Promise<{ dex: string }> };

const find = async (slug: string) =>
  (await buildMarkets()).exchanges.find((e) => e.path === `/exchanges/${slug}/`);

export async function generateStaticParams(): Promise<{ dex: string }[]> {
  const { exchanges } = await buildMarkets();
  return exchanges.map((e) => ({ dex: e.path.split('/')[2] }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = await find((await params).dex);
  if (!page) return {};
  const name =
    page.dex === MAIN_DEX
      ? "Hyperliquid's main exchange"
      : `${page.fullName ?? page.dex} (${page.dex}), a Hyperliquid builder exchange`;
  return pageMetadata({
    title: `${name}: markets, open interest, caps, settings | hlcharts`,
    description: `${name}, live: its markets with open interest and funding, its caps, each market's settings, and who deployed it. From Hyperliquid's public API.`,
    path: page.path,
    robots: robotsFor(exchangeIndexable(page.live)),
  });
}

export default async function ExchangePage({ params }: Params) {
  const page = await find((await params).dex);
  if (!page) notFound();
  const markets = await buildMarkets();
  const dex = exchangeDex(markets, page.dex);
  const own = markets.perps.filter((p) => p.market.dex === page.dex).map(perpSettings);
  return (
    <main>
      <JsonLd
        data={breadcrumbList([
          { name: 'Exchanges', path: '/exchanges/' },
          { name: page.dex === MAIN_DEX ? 'Main exchange' : page.dex, path: page.path },
        ])}
      />
      <p style={{ fontSize: '0.85em' }}>
        <Link href="/exchanges/">Exchanges</Link> ›
      </p>
      <h1>
        {page.dex === MAIN_DEX ? 'Main exchange' : page.dex}
        {page.fullName ? <span style={{ fontWeight: 400 }}> · {page.fullName}</span> : null}
      </h1>
      <ExchangeView dex={page.dex} />
      <NoJs live="Open interest, volume, funding and cap use, for the exchange and each of its markets, are live.">
        {dex && (
          <StaticTable
            caption="Who runs it (Hyperliquid's public data; addresses are not linked to anyone)"
            head={['Role', 'Address']}
            rows={[
              ['Deployer', dex.deployer],
              ['Oracle updater', dex.oracleUpdater ?? 'none set'],
              ['Fee recipient', dex.feeRecipient ?? 'none set'],
              ...(dex.subDeployers ?? []).map(([action, addresses]) => [
                `Sub-deployer: ${action}`,
                addresses.join(', '),
              ]),
            ]}
          />
        )}
        <StaticTable
          caption="Its perps and their settings (funding parameters per 8 hours; * = a default Hyperliquid does not publish)"
          head={[
            'Market',
            'Maximum leverage',
            'Margin',
            'Interest rate',
            'Clamp',
            'Multiplier',
            'Open-interest cap',
            'Status',
          ]}
          rows={own.map((s) => [
            <Link key="m" href={s.path}>
              {s.coin}
            </Link>,
            leverageText(s),
            marginText(s),
            interestText(s),
            clampText(s),
            multiplierText(s),
            capText(s),
            statusText(s),
          ])}
        />
      </NoJs>
    </main>
  );
}
