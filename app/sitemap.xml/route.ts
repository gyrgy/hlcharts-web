/** `/sitemap.xml`: the index of the per-kind sitemaps (plan §3.6). */
import { SITE_URL } from '@/lib/site';
import { SITEMAP_SECTIONS, sitemapIndexXml, sitemapPath } from '@/lib/seo/sitemap';

export const dynamic = 'force-static';

export function GET(): Response {
  return new Response(
    sitemapIndexXml(SITEMAP_SECTIONS.map((s) => `${SITE_URL}${sitemapPath(s)}`)),
    {
      headers: { 'Content-Type': 'application/xml' },
    }
  );
}
