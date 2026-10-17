import type { Metadata } from 'next';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { JsonLd } from '../components/json-ld';
import Link from 'next/link';
import { LEARN_TERMS, learnPath } from '@/lib/learn/terms';

export const metadata: Metadata = pageMetadata({
  title: 'Learn: the terms behind Hyperliquid data, each with a live chart | hlcharts',
  description:
    'Funding, premium, impact prices, open interest and caps, builder exchanges, basis, book depth and lending on Hyperliquid, explained in plain words, each with a live chart.',
  path: '/learn/',
});

export default function LearnPage() {
  return (
    <main style={{ maxWidth: '50rem' }}>
      <JsonLd data={breadcrumbList([{ name: 'Learn', path: '/learn/' }])} />
      <h1>Learn</h1>
      <p>
        The terms behind the numbers on this site, explained in plain words, each with a live chart
        of the market as it is now. Exact definitions of every figure are in the{' '}
        <Link href="/methodology/">methodology</Link>.
      </p>
      <ul style={{ paddingLeft: '1.2rem' }}>
        {LEARN_TERMS.map((t) => (
          <li key={t.slug} style={{ margin: '0.5rem 0' }}>
            <Link href={learnPath(t.slug)}>
              <b>{t.term}</b>
            </Link>
            : {t.summary}
          </li>
        ))}
      </ul>
    </main>
  );
}
