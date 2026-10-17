/**
 * Market page addresses (docs/hlcharts-website.md §2, frozen before the first
 * cross-post): lowercase, a fixed type prefix, main perps one segment deep and
 * builder-exchange perps two (`/perps/btc`, `/perps/xyz/nvda`), spot pairs by
 * token names (`/spot/hype-usdc`, or `-<pairIndex>` when two pairs share them).
 * Used by the build (which pages exist) and by the browser (links), so both
 * always agree.
 */
import { MAIN_DEX } from '../hl/constants';

/** `/exchanges/main/` is the main exchange's page, `/exchanges/compare/` the comparison. */
export const MAIN_EXCHANGE_SLUG = 'main';
export const COMPARE_SLUG = 'compare';
/** Exchange slugs the site keeps for its own pages; a deployer using one fails the build. */
export const RESERVED_EXCHANGE_SLUGS = new Set([MAIN_EXCHANGE_SLUG, COMPARE_SLUG]);
const SAFE = /^[a-z0-9][a-z0-9-]*$/;

/** Lowercase and keep [a-z0-9-]; anything else becomes '-' (the build checks collisions). */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `/perps/btc/` or `/perps/xyz/nvda/` for a perp named as the API names it ("BTC", "xyz:NVDA"). */
export function perpPath(dex: string, name: string): string {
  if (dex === MAIN_DEX) return `/perps/${slugify(name)}/`;
  return `/perps/${slugify(dex)}/${slugify(name.slice(dex.length + 1))}/`;
}

/** `/exchanges/main/` or `/exchanges/xyz/`. */
export function exchangePath(dex: string): string {
  return `/exchanges/${dex === MAIN_DEX ? MAIN_EXCHANGE_SLUG : slugify(dex)}/`;
}

/** `/spot/hype-usdc/`; `duplicated` when another pair has the same token names. */
export function spotPath(
  base: string,
  quote: string,
  pairIndex: number,
  duplicated: boolean
): string {
  return `/spot/${slugify(`${base}-${quote}`)}${duplicated ? `-${pairIndex}` : ''}/`;
}

/**
 * True when the path is `/<seg>/…/<seg>/` and every segment is a usable slug.
 * An empty segment (a name with no usable character) is refused: `/perps//`
 * would otherwise land on the `/perps/` index (caught by a test, 2026-10-04).
 */
export function isSafePath(path: string): boolean {
  if (!path.startsWith('/') || !path.endsWith('/')) return false;
  const segments = path.slice(1, -1).split('/');
  return segments.length > 0 && segments.every((seg) => SAFE.test(seg));
}
