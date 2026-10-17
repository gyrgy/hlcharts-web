/**
 * Spot pairs as pages: named from their tokens, `-<pairIndex>` only when two
 * pairs share token names (plan §2). Shared by the build (which pages exist)
 * and the 404 page (which address a pair listed since the build would have),
 * so both always compute the same address. A pair naming a token missing from
 * the list is refused: a page with a wrong name is worse than none.
 */
import { SpotMeta } from '../hl/types';
import { spotPath } from './market-paths';

export interface SpotPage {
  path: string;
  /** The API's pair name ("@107", "PURR/USDC"). */
  coin: string;
  base: string;
  quote: string;
  volume24h: number;
}

export function spotPages(
  pairs: SpotMeta['universe'],
  tokenNames: ReadonlyMap<number, string>,
  volumes: ReadonlyMap<string, number>
): SpotPage[] {
  const named = pairs.map((pair) => ({
    pair,
    base: tokenNames.get(pair.tokens[0]),
    quote: tokenNames.get(pair.tokens[1]),
  }));
  const counts = new Map<string, number>();
  for (const n of named)
    counts.set(`${n.base}/${n.quote}`, (counts.get(`${n.base}/${n.quote}`) ?? 0) + 1);
  return named.map(({ pair, base, quote }) => {
    if (!base || !quote) {
      throw new Error(`spot pair ${pair.name} names unknown tokens ${pair.tokens.join(', ')}`);
    }
    return {
      path: spotPath(base, quote, pair.index, (counts.get(`${base}/${quote}`) ?? 0) > 1),
      coin: pair.name,
      base,
      quote,
      volume24h: volumes.get(pair.name) ?? 0,
    };
  });
}
