import { BuildMarkets } from '../build/build-markets';
import { PerpDex } from '../hl/types';

/** An exchange's details (deployer, settings) from the build's market list; null for the main exchange. */
export function exchangeDex(markets: BuildMarkets, dex: string): PerpDex | null {
  return markets.perps.find((p) => p.market.dex === dex)?.dex ?? null;
}
