/** Main-exchange perps: `/perps/<coin>/` (one segment; builder exchanges have two). */
import { notFound } from 'next/navigation';
import { MAIN_DEX } from '@/lib/hl/constants';
import { buildMarkets } from '@/lib/build/build-markets';
import { perpMetadata, PerpPageView } from '../perp-page-view';

export const dynamicParams = false;

type Params = { params: Promise<{ slug: string }> };

const find = async (slug: string) =>
  (await buildMarkets()).perps.find(
    (p) => p.market.dex === MAIN_DEX && p.path === `/perps/${slug}/`
  );

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const { perps } = await buildMarkets();
  return perps
    .filter((p) => p.market.dex === MAIN_DEX)
    .map((p) => ({ slug: p.path.split('/')[2] }));
}

export async function generateMetadata({ params }: Params) {
  const page = await find((await params).slug);
  return page ? perpMetadata(page) : {};
}

export default async function MainPerpPage({ params }: Params) {
  const page = await find((await params).slug);
  if (!page) notFound();
  return <PerpPageView page={page} />;
}
