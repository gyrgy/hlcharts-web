/**
 * `/embed/<chart-id>/`: one static page per chart id (plan §2, §3.3), its
 * settings read from the address in the browser. Never indexed: a noindex
 * tag here, and an `X-Robots-Tag: noindex` header from `public/_headers` on
 * Cloudflare Pages (robots.txt allows the path, so search engines can read
 * both).
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CHART_ID, ChartId } from '@/lib/charts/chart-registry';
import { EmbedView } from './embed-view';

export const dynamicParams = false;

type Params = { params: Promise<{ chart: string }> };

const IDS: readonly string[] = Object.values(CHART_ID);

export function generateStaticParams(): { chart: string }[] {
  return IDS.map((chart) => ({ chart }));
}

export const metadata: Metadata = {
  title: 'hlcharts chart',
  robots: { index: false, follow: true },
};

export default async function EmbedPage({ params }: Params) {
  const { chart } = await params;
  if (!IDS.includes(chart)) notFound();
  return <EmbedView chart={chart as ChartId} />;
}
