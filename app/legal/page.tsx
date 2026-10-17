/**
 * `/legal` (plan §3.3): not investment advice, no affiliation and no referrals,
 * the privacy statement (visitors, and the people whose public wallet
 * addresses the exchange pages show), the licence for charts, and the
 * operator. Decisions behind it: docs/hlcharts-website.md, Build status
 * (owner, 2026-10-15/16). The build refuses a public site while the operator's
 * name is blank.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { CONTACT_EMAIL, OPERATOR_NAME, SITE_PUBLIC } from '@/lib/site';
import { JsonLd } from '../components/json-ld';

export const metadata: Metadata = pageMetadata({
  title: 'Legal and privacy | hlcharts',
  description:
    'hlcharts: not investment advice, not affiliated with any exchange, no referral links. Privacy statement: no cookies or tracking; what reaches Cloudflare and Hyperliquid; the licence for charts.',
  path: '/legal/',
});

/** When this page's statements last changed. */
const UPDATED = '2026-10-17';
const HL_PRIVACY = 'https://app.hyperliquid.xyz/privacypolicy';
const CF_PRIVACY = 'https://www.cloudflare.com/privacypolicy/';
const AP = 'https://autoriteitpersoonsgegevens.nl';
const CC_BY = 'https://creativecommons.org/licenses/by/4.0/';

export default function LegalPage() {
  if (SITE_PUBLIC && OPERATOR_NAME === null)
    throw new Error(
      'legal: the privacy statement names no operator; set OPERATOR_NAME in lib/site.ts'
    );
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <main style={{ maxWidth: '50rem' }}>
      <JsonLd data={breadcrumbList([{ name: 'Legal and privacy', path: '/legal/' }])} />
      <h1>Legal and privacy</h1>
      <p style={{ color: 'var(--muted-foreground)' }}>Last updated {UPDATED}.</p>

      <h2>Not investment advice</h2>
      <p>
        hlcharts shows data. Nothing on it is a recommendation to buy, sell or hold anything, or
        advice of any kind. Figures are shown as Hyperliquid&apos;s public API reports them; they
        can be delayed, incomplete or wrong, and are defined in the{' '}
        <Link href="/methodology/">methodology</Link>.
      </p>

      <h2>No affiliation, no referrals</h2>
      <p>
        hlcharts is not affiliated with Hyperliquid, trade.xyz or any other exchange; names and
        marks belong to their owners. It earns nothing from what it shows: no ads, no sponsored
        content and no referral links.
      </p>

      <h2>Who runs it</h2>
      <p>
        hlcharts is run by{' '}
        {OPERATOR_NAME ?? (
          <mark title="To be filled in before the site is public">[name to be added]</mark>
        )}
        , operating as hlcharts, who is the controller for the personal data described below.
        Contact: {mail}.
      </p>

      <h2>Privacy: visitors</h2>
      <p>
        hlcharts has no accounts, forms, ads or tracking, and sets no cookies. Two other parties see
        your IP address when you visit, because the site cannot work without them:
      </p>
      <ul>
        <li>
          <b>Cloudflare</b> (Cloudflare, Inc.) delivers the pages and counts visits with Cloudflare
          Web Analytics, which uses no cookies and nothing stored in your browser. If
          Cloudflare&apos;s protection suspects a visit is automated, it may ask the visitor to pass
          a check and then set a cookie (<code>cf_clearance</code>) recording that it was passed; it
          is needed for security and not used to follow you. See{' '}
          <a href={CF_PRIVACY}>Cloudflare&apos;s privacy policy</a>.
        </li>
        <li>
          <b>Hyperliquid</b>: every live figure is fetched by your browser directly from
          Hyperliquid&apos;s public API, so Hyperliquid receives your IP address, outside the
          European Union. hlcharts does not see or control what Hyperliquid records. See{' '}
          <a href={HL_PRIVACY}>Hyperliquid&apos;s privacy policy</a>.
        </li>
      </ul>
      <p>
        The legal basis is a legitimate interest (GDPR art. 6(1)(f)): showing live market data needs
        both. hlcharts itself keeps nothing about visitors.
      </p>
      <p>Your browser keeps a few things for the site, all needed for what you asked for:</p>
      <ul>
        <li>
          for this tab only (session storage): Hyperliquid&apos;s replies for up to a minute, to
          stay within its limit on requests, and where you were on each page, for the back button;
        </li>
        <li>
          on this device (local storage), only if you choose them: the light or dark theme, and the
          figures for &quot;open interest change since your last visit&quot;, which is off until you
          switch it on and deleted when you switch it off.
        </li>
      </ul>
      <p>Clearing your browser&apos;s site data removes all of it.</p>

      <h2>Privacy: addresses on the exchange pages</h2>
      <p>
        Each builder exchange&apos;s page shows the wallet addresses Hyperliquid publishes for it:
        its deployer, oracle updater, fee recipient and the addresses allowed to act for it. They
        come from Hyperliquid&apos;s public API, are shown as published and are not linked to
        anyone. Where an address belongs to a person, the legal basis is a legitimate interest (GDPR
        art. 6(1)(f)): showing who operates each exchange that trades on Hyperliquid. To object or
        ask for an address to be removed, write to {mail}.
      </p>

      <h2>Your rights</h2>
      <p>
        You may ask for access to, correction or erasure of personal data about you, restrict or
        object to its use: write to {mail}. You may also complain to the Dutch data protection
        authority, the <a href={AP}>Autoriteit Persoonsgegevens</a>.
      </p>

      <h2>Licence</h2>
      <p>
        Charts, chart images and embeds are licensed under{' '}
        <a href={CC_BY}>Creative Commons Attribution 4.0</a>: use them freely with a credit link to
        hlcharts. The data itself is Hyperliquid&apos;s, from its public API; hlcharts claims no
        rights in it.
      </p>
    </main>
  );
}
