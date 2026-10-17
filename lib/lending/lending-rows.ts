/**
 * The lending board (plan §3.3): one row per token in the reply, never a list
 * of ours (rule 7). Stablecoins (LTV 0: they are lent out) first, then
 * collateral tokens (LTV above 0: posted to borrow against), each by supplied
 * value. USD values use the reply's oracle price. Each row says whether its
 * rates follow the documented formula; the page explains only those that do.
 */
import { AllBorrowLendReserveStates } from '../hl/types';
import { borrowRateModel, RATE_TOLERANCE, supplyRateModel } from './rate-model';

export interface LendingRow {
  token: number;
  name: string;
  supplied: number;
  borrowed: number;
  oraclePx: number;
  suppliedUsd: number;
  borrowedUsd: number;
  utilization: number;
  supplyRate: number;
  borrowRate: number;
  ltv: number;
  collateral: boolean;
  /** Borrow rate as documented for stablecoins; null for collateral tokens (the docs give no formula). */
  borrowFollowsModel: boolean | null;
  supplyFollowsModel: boolean;
}

export function lendingRows(
  reply: AllBorrowLendReserveStates,
  tokenNames: ReadonlyMap<number, string>
): LendingRow[] {
  const rows = reply.map(([token, s]): LendingRow => {
    const supplied = Number(s.totalSupplied);
    const borrowed = Number(s.totalBorrowed);
    const oraclePx = Number(s.oraclePx);
    const utilization = Number(s.utilization);
    const borrowRate = Number(s.borrowYearlyRate);
    const supplyRate = Number(s.supplyYearlyRate);
    const ltv = Number(s.ltv);
    const collateral = ltv > 0;
    const near = (a: number, b: number): boolean => Math.abs(a - b) <= RATE_TOLERANCE;
    return {
      token,
      name: tokenNames.get(token) ?? `token ${token}`,
      supplied,
      borrowed,
      oraclePx,
      suppliedUsd: supplied * oraclePx,
      borrowedUsd: borrowed * oraclePx,
      utilization,
      supplyRate,
      borrowRate,
      ltv,
      collateral,
      borrowFollowsModel: collateral ? null : near(borrowRate, borrowRateModel(utilization)),
      supplyFollowsModel: near(supplyRate, supplyRateModel(borrowRate, utilization)),
    };
  });
  return rows.sort(
    (a, b) => Number(a.collateral) - Number(b.collateral) || b.suppliedUsd - a.suppliedUsd
  );
}
