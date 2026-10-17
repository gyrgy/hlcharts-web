import { SITE_URL } from '../site';
import { SITE_NAME } from './page-metadata';

/** The site itself as schema.org WebSite data, on the home page: its name for search results. */
export function websiteLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `${SITE_URL}/`,
  };
}
