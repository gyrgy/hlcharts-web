/**
 * One market's funding over a period: the average hourly rate, the total a
 * long paid over the period (the sum of the hourly rates applied: positive =
 * longs paid, negative = longs received), the highest and lowest hour, and
 * how many hours the period holds.
 */
import { FundingRow } from '../hl/types';

export interface FundingStats {
  hours: number;
  averageHourly: number;
  total: number;
  highest: number;
  lowest: number;
}

export function fundingStats(rows: readonly FundingRow[]): FundingStats | null {
  const rates = rows.map((r) => Number(r.fundingRate)).filter((x) => Number.isFinite(x));
  if (!rates.length) return null;
  const total = rates.reduce((s, x) => s + x, 0);
  return {
    hours: rates.length,
    averageHourly: total / rates.length,
    total,
    highest: Math.max(...rates),
    lowest: Math.min(...rates),
  };
}
