/** `/about` (plan §3.3): what the site is, where the numbers come from, and how to reach it. */
import type { Metadata } from 'next';
import Link from 'next/link';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { CONTACT_EMAIL } from '@/lib/site';
import { JsonLd } from '../components/json-ld';

export const metadata: Metadata = pageMetadata({
  title: 'About hlcharts: live Hyperliquid data, defined in the open | hlcharts',
  description:
    'hlcharts shows Hyperliquid markets, funding, open interest, liquidity and lending live from its public API, with every number defined. No ads, no referral links, no tracking.',
  path: '/about/',
});

export default function AboutPage() {
  return (
    <main style={{ maxWidth: '50rem' }}>
      <JsonLd data={breadcrumbList([{ name: 'About', path: '/about/' }])} />
      <h1>About hlcharts</h1>
      <p>
        hlcharts shows Hyperliquid as it is right now: every market on the main exchange, on the
        builder exchanges that third parties run on it, and on its spot market, with funding, open
        interest, the cost to trade, lending and listings.
      </p>
      <h2>Where the numbers come from</h2>
      <p>
        Every figure is fetched by your browser from Hyperliquid&apos;s public API while you read
        the page; nothing is stored, edited or estimated on the way. Each number is defined in the{' '}
        <Link href="/methodology/">methodology</Link>: what it is, how often it updates and what can
        mislead. When a definition changes, the change is dated there. Where a figure is missing,
        the page shows a dash, never a zero.
      </p>
      <h2>What it is not</h2>
      <p>
        Not investment advice: the site shows data, not recommendations. Not affiliated with
        Hyperliquid, trade.xyz or any other exchange. It earns nothing from what it shows: no ads,
        no referral links, no tracking. See <Link href="/legal/">legal and privacy</Link>.
      </p>
      <h2>Contact</h2>
      <p>
        Corrections, questions and requests: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        .
      </p>
    </main>
  );
}
