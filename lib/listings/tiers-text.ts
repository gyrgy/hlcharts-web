/** Leverage tiers in words: "40×", or "40× up to $150M, then 20×". */
import { usdCompact } from '../format/format';
import { ListingRow } from './listings';

export function tiersText(tiers: ListingRow['tiers']): string {
  return tiers
    .map((t, i) =>
      i + 1 < tiers.length
        ? `${t.maxLeverage}× up to ${usdCompact(tiers[i + 1].fromUsd)}`
        : `${t.maxLeverage}×`
    )
    .join(', then ');
}
