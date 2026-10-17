/** A market's funding parameters (see explain-funding.ts for the sources and what is inferred). */
import { MAIN_DEX } from '../hl/constants';
import {
  BUILDER_CLAMP_8H_DEFAULT,
  BUILDER_INTEREST_8H_DEFAULT,
  BUILDER_MULTIPLIER_DEFAULT,
  FundingParams,
  MAIN_CLAMP_8H,
  MAIN_INTEREST_8H,
} from './explain-funding';

/** The funding parameters of a market: the main exchange's, or a builder exchange's overrides and defaults. */
export function fundingParams(
  dex: string,
  coin: string,
  overrides: {
    interest?: readonly [string, string][];
    clamp?: readonly [string, string][];
    multiplier?: readonly [string, string][];
  } = {}
): FundingParams {
  if (dex === MAIN_DEX) {
    return {
      interest8h: MAIN_INTEREST_8H,
      clamp8h: MAIN_CLAMP_8H,
      multiplier: 1,
      documented: { interest: true, clamp: true, multiplier: true },
    };
  }
  const find = (list?: readonly [string, string][]): number | null => {
    const hit = list?.find(([c]) => c === coin);
    return hit ? Number(hit[1]) : null;
  };
  const interest = find(overrides.interest);
  const clamp = find(overrides.clamp);
  const multiplier = find(overrides.multiplier);
  return {
    interest8h: interest ?? BUILDER_INTEREST_8H_DEFAULT,
    clamp8h: clamp ?? BUILDER_CLAMP_8H_DEFAULT,
    multiplier: multiplier ?? BUILDER_MULTIPLIER_DEFAULT,
    documented: { interest: interest !== null, clamp: true, multiplier: multiplier !== null },
  };
}
