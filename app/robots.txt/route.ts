/**
 * `/robots.txt` (plan §3.6): allow everything, embeds included. A disallow
 * would stop search engines from ever reading a page's own noindex, and a
 * blocked page linked from elsewhere can still be indexed as a bare address.
 */
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export function GET(): Response {
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
