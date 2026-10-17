/**
 * A page's place on the site as schema.org BreadcrumbList data (plan §3.6),
 * which search engines may show in place of the address. The home page comes
 * first; each step is a name and the site path it links to.
 */
import { SITE_URL } from '../site';
import { SITE_NAME } from './page-metadata';

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbList(trail: readonly Crumb[]): Record<string, unknown> {
  const steps = [{ name: SITE_NAME, path: '/' }, ...trail];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: steps.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${SITE_URL}${c.path}`,
    })),
  };
}
