/** Spot pairs: `/spot/<base>-<quote>/`. Indexed once the pair trades at least SPOT_INDEX_MIN_VOLUME_USD a day (plan §2). */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildMarkets } from '@/lib/build/build-markets';
import { robotsFor, spotIndexable } from '@/lib/seo/indexable';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { SpotPageView } from '../spot-page-view';

export const dynamicParams = false;

type Params = { params: Promise<{ pair: string }> };

const find = async (pair: string) =>
  (await buildMarkets()).spot.find((s) => s.path === `/spot/${pair}/`);

export async function generateStaticParams(): Promise<{ pair: string }[]> {
  return (await buildMarkets()).spot.map((s) => ({ pair: s.path.split('/')[2] }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = await find((await params).pair);
  if (!page) return {};
  return pageMetadata({
    title: `${page.base}/${page.quote} spot on Hyperliquid: price, volume, trades | hlcharts`,
    description: `${page.base}/${page.quote} on Hyperliquid's spot market: live price, 24-hour change and volume, and recent trades, from Hyperliquid's public API.`,
    path: page.path,
    robots: robotsFor(spotIndexable(page.volume24h)),
  });
}

export default async function SpotPage({ params }: Params) {
  const page = await find((await params).pair);
  if (!page) notFound();
  return <SpotPageView page={page} />;
}
