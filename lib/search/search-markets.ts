/**
 * The header search's ranking. Live markets always come before delisted ones:
 * about half of the builder exchanges' perps are delisted (147 of 299 on
 * 2026-10-04) and would otherwise push live markets off the list. Then the
 * closest match: the name exactly, a name that starts with the query, one that
 * contains it, then an exchange ("xyz", "xyz:nv") or, for a query with a "/",
 * the full pair name ("hype/usdh"; without the "/", "usdc" would match every
 * pair quoted in USDC). Then perps before spot, the main exchange before
 * builder exchanges, shorter names first.
 */
import { MAIN_VENUE } from './search-index';
import { SearchEntry } from './types';

export const SEARCH_RESULTS = 8;
const PAIR_SEPARATOR = '/';

function closeness(e: SearchEntry, q: string): number {
  const base = e.base.toLowerCase();
  if (base === q) return 0;
  if (base.startsWith(q)) return 1;
  if (base.includes(q)) return 2;
  if (e.kind === 'perp' && `${e.venue}:${base}`.startsWith(q)) return 3;
  if (q.includes(PAIR_SEPARATOR) && e.name.toLowerCase().includes(q)) return 3;
  return -1;
}

const placement = (e: SearchEntry): number =>
  e.kind === 'spot' ? 2 : e.venue === MAIN_VENUE ? 0 : 1;

export function searchMarkets(
  entries: readonly SearchEntry[],
  query: string,
  limit = SEARCH_RESULTS
): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return entries
    .map((e) => ({ e, c: closeness(e, q) }))
    .filter((m) => m.c >= 0)
    .sort(
      (a, b) =>
        Number(a.e.delisted) - Number(b.e.delisted) ||
        a.c - b.c ||
        placement(a.e) - placement(b.e) ||
        a.e.name.length - b.e.name.length ||
        a.e.name.localeCompare(b.e.name)
    )
    .slice(0, limit)
    .map((m) => m.e);
}
