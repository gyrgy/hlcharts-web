/** `/markets.json` from the build's market list: one entry per page written. */
import { BuildMarkets } from '../build/build-markets';
import { MAIN_DEX } from '../hl/constants';
import { SPOT_VENUE } from '../markets/build-spot-rows';
import { SearchIndex } from './types';

/** The main exchange's label; `main` is a reserved exchange slug, so no builder exchange can take it. */
export const MAIN_VENUE = 'main';

export function searchIndex(markets: BuildMarkets, builtAt: string): SearchIndex {
  return {
    builtAt,
    markets: [
      ...markets.perps.map(({ path, market }) => {
        const name =
          market.dex === MAIN_DEX ? market.name : market.name.slice(market.dex.length + 1);
        return {
          name,
          base: name.toUpperCase(),
          venue: market.dex === MAIN_DEX ? MAIN_VENUE : market.dex,
          kind: 'perp' as const,
          path,
          delisted: market.isDelisted === true,
        };
      }),
      ...markets.spot.map((s) => ({
        name: `${s.base}/${s.quote}`,
        base: s.base.toUpperCase(),
        venue: SPOT_VENUE,
        kind: 'spot' as const,
        path: s.path,
        delisted: false,
      })),
    ],
  };
}
