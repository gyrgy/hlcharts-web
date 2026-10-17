/**
 * How the <noscript> tables write a perp's settings (perp-settings.ts): the
 * same formats the live pages use, so the two read alike. * marks a funding
 * parameter Hyperliquid does not publish, inferred from live rates, as on
 * /funding.
 */
import { MAIN_DEX } from '../hl/constants';
import { MISSING, pct, usdCompact } from '../format/format';
import { PerpSettings } from './perp-settings';

export const exchangeText = (dex: string): string => (dex === MAIN_DEX ? 'main' : dex);
export const leverageText = (s: PerpSettings): string => `${s.maxLeverage}×`;
export const marginText = (s: PerpSettings): string =>
  s.isolatedOnly ? 'isolated only' : 'cross or isolated';
export const statusText = (s: PerpSettings): string => (s.delisted ? 'delisted' : 'listed');
const inferred = (documented: boolean): string => (documented ? '' : '*');
export const interestText = (s: PerpSettings): string =>
  `${pct(s.funding.interest8h, 4)}${inferred(s.funding.documented.interest)}`;
export const clampText = (s: PerpSettings): string =>
  `${pct(s.funding.clamp8h, 3)}${inferred(s.funding.documented.clamp)}`;
export const multiplierText = (s: PerpSettings): string =>
  `${s.funding.multiplier}${inferred(s.funding.documented.multiplier)}`;
export const capText = (s: PerpSettings): string =>
  s.oiCapUsd === null ? (s.dex === MAIN_DEX ? 'not published' : MISSING) : usdCompact(s.oiCapUsd);
export const impactSizeText = (s: PerpSettings): string =>
  s.impactSizeUsd === null ? 'not published' : usdCompact(s.impactSizeUsd);
