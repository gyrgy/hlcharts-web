/**
 * A perp's page: the text is written at build time from Hyperliquid's own
 * market list (for readers and search engines, plan §3.6); the numbers load
 * live in the browser.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { MAIN_DEX } from '@/lib/hl/constants';
import { PerpPage } from '@/lib/build/build-markets';
import { shortAddress } from '@/lib/format/format';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { perpIndexable, robotsFor } from '@/lib/seo/indexable';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { perpSettings } from '@/lib/static/perp-settings';
import {
  capText,
  clampText,
  impactSizeText,
  interestText,
  leverageText,
  marginText,
  multiplierText,
  statusText,
} from '@/lib/static/settings-text';
import { JsonLd } from '../components/json-ld';
import { NoJs } from '../components/no-js';
import { StaticTable } from '../components/static-table';
import { PerpLiveHeader } from '../components/perp-live-header';
import { BookPanel } from '../components/book-panel';
import { FundingChart } from '../components/funding-chart';
import { FundingExplained } from '../components/funding-explained';
import { PriceChart } from '../components/price-chart';
import { SiblingsPanel } from '../components/siblings-panel';
import { TradesTape } from '../components/trades-tape';

function names(page: PerpPage): { coin: string; venue: string } {
  const { market, dex } = page;
  const coin = market.dex === MAIN_DEX ? market.name : market.name.slice(market.dex.length + 1);
  const venue =
    market.dex === MAIN_DEX
      ? "Hyperliquid's main exchange"
      : `${dex?.fullName ?? market.dex}, a builder exchange on Hyperliquid (HIP-3)`;
  return { coin, venue };
}

export function perpMetadata(page: PerpPage): Metadata {
  const { coin } = names(page);
  const where =
    page.market.dex === MAIN_DEX
      ? 'Hyperliquid'
      : `${page.dex?.fullName ?? page.market.dex} (Hyperliquid HIP-3)`;
  return pageMetadata({
    title: `${coin} perp on ${where}: funding, open interest, depth | hlcharts`,
    description: `${coin} perpetual on ${where}: live price, funding rate with the next payment, open interest, cost to trade and recent trades, from Hyperliquid's public API.`,
    path: page.path,
    robots: robotsFor(perpIndexable(page.market.isDelisted === true)),
  });
}

export function PerpPageView({ page }: { page: PerpPage }) {
  const { market, dex } = page;
  const { coin, venue } = names(page);
  const chartLabel = market.dex === MAIN_DEX ? coin : coin + ' on ' + market.dex;
  const settings = perpSettings(page);
  const isolated = settings.isolatedOnly;
  return (
    <main>
      <JsonLd
        data={breadcrumbList([
          { name: 'Markets', path: '/markets/' },
          {
            name: `${coin} perpetual${market.dex === MAIN_DEX ? '' : ` on ${dex?.fullName ?? market.dex}`}`,
            path: page.path,
          },
        ])}
      />
      <p style={{ fontSize: '0.85em' }}>
        <Link href="/markets/">Markets</Link> ›{' '}
        {market.dex === MAIN_DEX ? 'main exchange' : market.dex}
      </p>
      <h1>
        {coin} perpetual{market.dex === MAIN_DEX ? '' : ` on ${dex?.fullName ?? market.dex}`}
        {market.isDelisted && (
          <span style={{ fontSize: '0.5em', color: 'var(--muted-foreground)' }}> · delisted</span>
        )}
      </h1>
      <p style={{ maxWidth: '50rem' }}>
        {coin} is a perpetual futures market on {venue}
        {market.dex !== MAIN_DEX && dex ? `, deployed by ${shortAddress(dex.deployer)}` : ''}.
        Maximum leverage {market.maxLeverage}×{isolated ? ', isolated margin only' : ''}
        {market.dex !== MAIN_DEX && market.deployerFeeScale
          ? `; deployer fee scale ${market.deployerFeeScale}`
          : ''}
        .{' '}
        {market.isDelisted
          ? 'Hyperliquid has delisted it: it takes no new positions, and nothing on this page updates.'
          : 'The figures below are live from Hyperliquid: the price every second, funding and open interest about every 15 seconds.'}
      </p>
      {market.isDelisted ? (
        <p style={{ color: 'var(--muted-foreground)' }}>Delisted: no live figures.</p>
      ) : (
        <PerpLiveHeader coin={market.name} dex={market.dex} />
      )}
      <h2>Price</h2>
      <PriceChart coin={market.name} label={chartLabel} />
      {!market.isDelisted && (
        <>
          <h2>Funding explained</h2>
          <FundingExplained coin={market.name} dex={market.dex} />
        </>
      )}
      <h2>Funding history</h2>
      <FundingChart coin={market.name} label={chartLabel} />
      {!market.isDelisted && (
        <>
          <h2>Book and cost to trade</h2>
          <BookPanel coin={market.name} />
        </>
      )}
      {!market.isDelisted && (
        <>
          <h2>Same asset elsewhere</h2>
          <SiblingsPanel coin={market.name} />
        </>
      )}
      <h2>Recent trades</h2>
      {market.isDelisted ? (
        <p style={{ color: 'var(--muted-foreground)' }}>None: the market is delisted.</p>
      ) : (
        <TradesTape coin={market.name} />
      )}
      <NoJs
        live={
          market.isDelisted
            ? 'Its price and funding history are drawn live.'
            : 'The price and its chart, funding and how it is set this hour, its history, the order book and cost to trade, the same asset elsewhere and recent trades are live.'
        }
      >
        <StaticTable
          caption={`${coin} perpetual: its settings (funding parameters per 8 hours; * = a default Hyperliquid does not publish)`}
          head={['Setting', 'Value']}
          rows={[
            ['Exchange', market.dex === MAIN_DEX ? "Hyperliquid's main exchange" : venue],
            ['Maximum leverage', leverageText(settings)],
            ['Margin', marginText(settings)],
            ['Funding interest rate', interestText(settings)],
            ['Funding clamp', clampText(settings)],
            ['Funding multiplier', multiplierText(settings)],
            ['Open-interest cap', capText(settings)],
            ['Impact spread measured at', impactSizeText(settings)],
            ...(settings.deployerFeeScale
              ? [['Deployer fee scale', settings.deployerFeeScale]]
              : []),
            ['Status', statusText(settings)],
          ]}
        />
      </NoJs>
      <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85em', maxWidth: '50rem' }}>
        Source: Hyperliquid&apos;s public API, read by your browser. Trades show the taker&apos;s
        side; the traders are not shown.
      </p>
    </main>
  );
}
