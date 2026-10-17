/** The trade size a perp's impact prices are measured at; null where Hyperliquid does not publish it (builder exchanges). */
import { MAIN_DEX, MAIN_IMPACT_LARGE_COINS, MAIN_IMPACT_NOTIONAL_USD } from '../hl/constants';

export function impactNotionalUsd(dex: string, coin: string): number | null {
  if (dex !== MAIN_DEX) return null;
  return MAIN_IMPACT_LARGE_COINS.includes(coin)
    ? MAIN_IMPACT_NOTIONAL_USD.large
    : MAIN_IMPACT_NOTIONAL_USD.other;
}
