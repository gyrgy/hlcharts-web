/** `/sitemaps/<section>.xml`: the indexable pages of one kind, as of the build (plan §3.6). */
import { buildMarkets } from '@/lib/build/build-markets';
import { SITE_PUBLIC, SITE_URL } from '@/lib/site';
import { SITEMAP_SECTIONS, SitemapSection, sitemapPaths, urlsetXml } from '@/lib/seo/sitemap';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams(): { section: string }[] {
  return SITEMAP_SECTIONS.map((s) => ({ section: `${s}.xml` }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ section: string }> }
): Promise<Response> {
  const section = (await params).section.replace(/\.xml$/, '') as SitemapSection;
  if (!SITEMAP_SECTIONS.includes(section)) return new Response('Not found', { status: 404 });
  const paths = sitemapPaths(await buildMarkets(), SITE_PUBLIC)[section];
  return new Response(urlsetXml(paths.map((p) => `${SITE_URL}${p}`)), {
    headers: { 'Content-Type': 'application/xml' },
  });
}
