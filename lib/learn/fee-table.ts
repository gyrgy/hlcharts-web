/**
 * Hyperliquid's fee schedule as a table people can read: one row per volume
 * tier (base first), taker and maker rates for perps and spot, plus the maker
 * rebates, staking discounts and referral discount. From the live reply, so
 * the table changes when Hyperliquid's schedule does.
 */
import { FeeSchedule } from '../hl/types';

/** HYPE's maximum supply: the staking tiers are in basis points of it (0.0001 bp = 10 HYPE, docs: fees). */
export const HYPE_MAX_SUPPLY = 1_000_000_000;

export interface FeeTier {
  /** 14-day weighted volume from which the tier applies, USD; 0 for the base tier. */
  fromUsd: number;
  perpTaker: number;
  perpMaker: number;
  spotTaker: number;
  spotMaker: number;
}

export interface FeeTable {
  tiers: FeeTier[];
  rebates: { makerShareAbove: number; rate: number }[];
  staking: { fromHype: number; discount: number }[];
  referralDiscount: number;
}

export function feeTable(s: FeeSchedule): FeeTable {
  return {
    tiers: [
      {
        fromUsd: 0,
        perpTaker: Number(s.cross),
        perpMaker: Number(s.add),
        spotTaker: Number(s.spotCross),
        spotMaker: Number(s.spotAdd),
      },
      ...s.tiers.vip.map((t) => ({
        fromUsd: Number(t.ntlCutoff),
        perpTaker: Number(t.cross),
        perpMaker: Number(t.add),
        spotTaker: Number(t.spotCross),
        spotMaker: Number(t.spotAdd),
      })),
    ],
    rebates: s.tiers.mm.map((m) => ({
      makerShareAbove: Number(m.makerFractionCutoff),
      rate: Number(m.add),
    })),
    staking: s.stakingDiscountTiers
      .filter((t) => Number(t.discount) > 0)
      .map((t) => ({
        fromHype: (Number(t.bpsOfMaxSupply) / 10_000) * HYPE_MAX_SUPPLY,
        discount: Number(t.discount),
      })),
    referralDiscount: Number(s.referralDiscount),
  };
}
