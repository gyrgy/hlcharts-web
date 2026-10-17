/** Builder-exchange perps: `/perps/<dex>/<coin>/`. The first segment shares its name with the main route (Next.js requires it). */
import { notFound } from 'next/navigation';
import { MAIN_DEX } from '@/lib/hl/constants';
import { buildMarkets } from '@/lib/build/build-markets';
import { perpMetadata, PerpPageView } from '../../perp-page-view';

export const dynamicParams = false;

type Params = { params: Promise<{ slug: string; coin: string }> };

const find = async (dex: string, coin: string) =>
  (await buildMarkets()).perps.find(
    (p) => p.market.dex !== MAIN_DEX && p.path === `/perps/${dex}/${coin}/`
  );

export async function generateStaticParams(): Promise<{ slug: string; coin: string }[]> {
  const { perps } = await buildMarkets();
  return perps
    .filter((p) => p.market.dex !== MAIN_DEX)
    .map((p) => {
      const [, , slug, coin] = p.path.split('/');
      return { slug, coin };
    });
}

export async function generateMetadata({ params }: Params) {
  const { slug, coin } = await params;
  const page = await find(slug, coin);
  return page ? perpMetadata(page) : {};
}

export default async function BuilderPerpPage({ params }: Params) {
  const { slug, coin } = await params;
  const page = await find(slug, coin);
  if (!page) notFound();
  return <PerpPageView page={page} />;
}
