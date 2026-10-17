/**
 * What a perp's current funding rate says, by Hyperliquid's formula (docs,
 * trading/funding, read 2026-10-04):
 *
 *   rate (8 h) = average premium + clamp(interest − average premium, −clamp, +clamp)
 *   paid hourly at one eighth; capped at 4% an hour.
 *
 * Main exchange: interest 0.01% per 8 h, clamp 0.05%. Builder exchanges
 * (HIP-3, docs for-developers/api/hip-3-deployer-actions): per-market interest
 * rate and clamp (clamp default 0.03%), and a multiplier (0-10) that scales
 * the rate. Their interest default (0.01%) and multiplier default (1) are NOT
 * documented; they are inferred from live data (xyz markets without overrides
 * fund at exactly 0.5 x 0.00125%/h under xyz's 0.5 multiplier, 2026-10-04).
 *
 * From the rate alone the formula tells which state the hour is in:
 *  - band: rate = interest (the average premium is within the clamp of it);
 *  - above / below: the clamp binds, and the hour's average premium is
 *    rate + clamp / rate − clamp (per 8 h, after removing the multiplier).
 * A rate the formula cannot produce (over the cap, not a number) is
 * 'unexplained': the page shows the rate and no breakdown.
 */
export const MAIN_INTEREST_8H = 0.0001;
export const MAIN_CLAMP_8H = 0.0005;
export const BUILDER_CLAMP_8H_DEFAULT = 0.0003;
/** Inferred, not documented (see above). */
export const BUILDER_INTEREST_8H_DEFAULT = 0.0001;
export const BUILDER_MULTIPLIER_DEFAULT = 1;
export const FUNDING_CAP_HOURLY = 0.04;
/**
 * Hourly rates are published rounded to 10 decimal places, so a rate this
 * close (per hour) to the formula's band value IS the band value. A tighter
 * tolerance read mkts:US500 (5% a year: 0.0000057078/h against an interest
 * rate of 0.0000456621 per 8 h) as a binding clamp (2026-10-04).
 */
const HOURLY_ROUNDING = 1e-9;

export interface FundingParams {
  interest8h: number;
  clamp8h: number;
  multiplier: number;
  /** True where a value is Hyperliquid's documented one, false where it is our inference. */
  documented: { interest: boolean; clamp: boolean; multiplier: boolean };
}

export interface FundingExplanation {
  state: 'band' | 'above' | 'below' | 'unexplained';
  params: FundingParams;
  /** The hour's average premium the rate implies (above / below only), as a fraction of the oracle price. */
  impliedPremium: number | null;
}

export function explainFunding(hourly: number, params: FundingParams): FundingExplanation {
  const none = { state: 'unexplained' as const, params, impliedPremium: null };
  if (!Number.isFinite(hourly) || Math.abs(hourly) > FUNDING_CAP_HOURLY) return none;
  if (params.multiplier === 0)
    return hourly === 0 ? { state: 'band', params, impliedPremium: null } : none;
  const rate8h = (hourly * 8) / params.multiplier;
  const { interest8h: r, clamp8h: c } = params;
  if (Math.abs(hourly - (r * params.multiplier) / 8) <= HOURLY_ROUNDING) {
    return { state: 'band', params, impliedPremium: null };
  }
  // The clamp binds: rate = P − c when P > r + c, rate = P + c when P < r − c.
  return rate8h > r
    ? { state: 'above', params, impliedPremium: rate8h + c }
    : { state: 'below', params, impliedPremium: rate8h - c };
}
