/** One Learn term: `/learn/<term>/`, text written at build time, its chart live (plan §3.3). */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LEARN_TERMS, learnPath } from '@/lib/learn/terms';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { pageIndexable, robotsFor } from '@/lib/seo/indexable';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { JsonLd } from '../../components/json-ld';
import { NoJs } from '../../components/no-js';
import { TermChart } from '../term-chart';

export const dynamicParams = false;

type Params = { params: Promise<{ term: string }> };

const find = async (params: Params['params']) => {
  const { term } = await params;
  return LEARN_TERMS.find((t) => t.slug === term);
};

export function generateStaticParams(): { term: string }[] {
  return LEARN_TERMS.map((t) => ({ term: t.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const t = await find(params);
  if (!t) return {};
  return pageMetadata({
    title: `${t.term} on Hyperliquid, explained with a live chart | hlcharts`,
    description: t.summary,
    path: learnPath(t.slug),
    robots: robotsFor(pageIndexable()),
  });
}

export default async function TermPage({ params }: Params) {
  const t = await find(params);
  if (!t) notFound();
  return (
    <main style={{ maxWidth: '50rem' }}>
      <JsonLd
        data={breadcrumbList([
          { name: 'Learn', path: '/learn/' },
          { name: t.term, path: learnPath(t.slug) },
        ])}
      />
      <p style={{ fontSize: '0.85em' }}>
        <Link href="/learn/">Learn</Link> ›
      </p>
      <h1>{t.term}</h1>
      <p style={{ fontSize: '1.05em' }}>{t.summary}</p>
      {t.body.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <h2>Live</h2>
      <TermChart chart={t.chart} />
      <NoJs live="This term's chart and its figures are live." />
      <p style={{ fontSize: '0.8em', color: 'var(--muted-foreground)' }}>{t.chartCaption}</p>
      <h2>Read next</h2>
      <ul>
        {t.related.map((r) => (
          <li key={r.href}>
            <Link href={r.href}>{r.label}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
