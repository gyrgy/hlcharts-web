/**
 * When two markets are the same asset on different venues: same name AND a
 * price within SIBLING_PRICE_TOLERANCE. The name alone is wrong (main STX was
 * $0.38 while para:STX was $840 on 2026-10-04). Delisted markets and spot
 * pairs with no trade in 24 h carry stale prices and take no part. Assets
 * under different names (UBTC spot, BTC perp) are not matched: no guessing.
 * Used by the "also on" badge (/markets) and the market page's panel, so the
 * two never disagree.
 */
import { MAIN_DEX } from '../hl/constants';
import { MarketRow } from './types';

export const SIBLING_PRICE_TOLERANCE = 0.02;

/** "main", the builder exchange's name, or "spot". */
export function siblingVenue(r: MarketRow): string {
  return r.kind === 'spot' ? 'spot' : r.venue === MAIN_DEX ? 'main' : r.venue;
}

/** Live enough to compare prices with. */
export function comparable(r: MarketRow): boolean {
  return !r.delisted && !(r.kind === 'spot' && !(r.volume24h > 0)) && r.markPx > 0;
}

/** Same asset on another venue. */
export function isSibling(a: MarketRow, b: MarketRow): boolean {
  return (
    a.key !== b.key &&
    a.base === b.base &&
    siblingVenue(a) !== siblingVenue(b) &&
    comparable(a) &&
    comparable(b) &&
    Math.abs(b.markPx / a.markPx - 1) <= SIBLING_PRICE_TOLERANCE
  );
}

/** Same name on another venue but a different price: a different asset, worth saying so. */
export function isNameOnly(a: MarketRow, b: MarketRow): boolean {
  return (
    a.key !== b.key &&
    a.base === b.base &&
    siblingVenue(a) !== siblingVenue(b) &&
    comparable(a) &&
    comparable(b) &&
    !isSibling(a, b)
  );
}
