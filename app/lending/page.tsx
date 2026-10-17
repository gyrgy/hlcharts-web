import type { Metadata } from 'next';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { JsonLd } from '../components/json-ld';
import { NoJs } from '../components/no-js';
import { LendingBoard } from './lending-board';

export const metadata: Metadata = pageMetadata({
  title: 'Hyperliquid lending: supplied, borrowed and rates, live | hlcharts',
  description:
    "Hyperliquid's built-in lending market live: stablecoins supplied and borrowed, the share lent out, supply and borrow rates and how the formula sets them, and the tokens posted as collateral.",
  path: '/lending/',
});

/** The text is written at build time; the numbers load live in the browser. */
export default function LendingPage() {
  return (
    <main>
      <JsonLd data={breadcrumbList([{ name: 'Lending', path: '/lending/' }])} />
      <h1>Lending</h1>
      <p style={{ maxWidth: '50rem' }}>
        Hyperliquid&apos;s built-in lending market, part of its portfolio margin. Stablecoins are
        supplied to earn interest and borrowed; other tokens are posted as collateral to borrow
        against. Live from Hyperliquid&apos;s public API.
      </p>
      <LendingBoard />
      <NoJs live="The tokens lent and borrowed, the amounts, the share lent out, the supply and borrow rates and the rate curve are live." />
    </main>
  );
}
