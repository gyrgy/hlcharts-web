/**
 * The `/funding` board (plan §3.3): every live perp with its funding
 * parameters (the main exchange's, or its builder exchange's overrides and
 * defaults), what the current rate says about the hour (explain-funding.ts),
 * and where the latest premium sample sits against the base-rate band.
 */
import { PerpDex } from '../hl/types';
import { MarketRow } from '../markets/types';
import { bandPosition } from './band-position';
import { explainFunding, FundingExplanation, FundingParams } from './explain-funding';
import { fundingParams } from './funding-params';

export interface FundingBoardRow extends MarketRow {
  params: FundingParams;
  state: FundingExplanation['state'];
  /** Latest premium sample against the base-rate band, bp: + inside, − outside. */
  bandBps: number | null;
}

export function fundingBoard(
  rows: readonly MarketRow[],
  dexes: ReadonlyMap<string, PerpDex | null>
): FundingBoardRow[] {
  return rows
    .filter((r) => r.kind === 'perp' && !r.delisted && r.fundingHourly !== null)
    .map((r) => {
      const d = dexes.get(r.venue);
      const params = fundingParams(r.venue, r.key, {
        interest: d?.assetToFundingInterestRate,
        clamp: d?.assetToFundingClamp,
        multiplier: d?.assetToFundingMultiplier,
      });
      return {
        ...r,
        params,
        state: explainFunding(r.fundingHourly ?? NaN, params).state,
        bandBps: bandPosition(r.premium, params),
      };
    });
}
