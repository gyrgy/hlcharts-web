import { SitePage } from '../site-pages';

/**
 * Whether a header link is the section of the page at `path`: its own page or
 * any page under it (`/exchanges/` covers `/exchanges/hyna/`), plus the
 * prefixes it claims (`navAlso`). Paths compare with a trailing slash, since
 * the site's addresses end in one.
 */
export function navActive(page: SitePage, path: string): boolean {
  const here = path.endsWith('/') ? path : `${path}/`;
  return [page.path, ...(page.navAlso ?? [])].some((p) =>
    p === '/' ? here === '/' : here.startsWith(p)
  );
}
