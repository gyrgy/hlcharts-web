/**
 * Where a premium sits against the band in which funding stays at the base
 * rate. By the formula, the rate is the interest rate (× the multiplier) while
 * the hour's average premium P is within the clamp of it: r − c ≤ P ≤ r + c,
 * per 8 h, whatever the multiplier. Returned in bp of the oracle price:
 * positive = inside by that much, negative = outside by that much.
 * Given the latest premium sample, it says how close the market is to leaving
 * the band; the hour's average, not one sample, sets the rate.
 */
import { FundingParams } from './explain-funding';

export function bandPosition(premium: number | null, params: FundingParams): number | null {
  if (premium === null || !Number.isFinite(premium)) return null;
  const low = params.interest8h - params.clamp8h;
  const high = params.interest8h + params.clamp8h;
  return Math.min(premium - low, high - premium) * 10_000;
}
