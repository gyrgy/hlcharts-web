/**
 * The lending board and the documented rate model, against the live reply of
 * 2026-10-04 (allBorrowLendReserveStates, all five tokens, values as returned).
 */
import { describe, expect, it } from 'vitest';
import { amountCompact, MISSING } from '../../format/format';
import { AllBorrowLendReserveStates } from '../../hl/types';
import { lendingRows } from '../lending-rows';
import { rateCurve } from '../rate-curve';
import { borrowRateModel, supplyRateModel } from '../rate-model';

const state = (
  supplied: string,
  borrowed: string,
  utilization: string,
  supply: string,
  oraclePx: string,
  ltv: string,
  borrow = '0.05'
): AllBorrowLendReserveStates[number][1] => ({
  borrowYearlyRate: borrow,
  supplyYearlyRate: supply,
  balance: '0',
  utilization,
  oraclePx,
  ltv,
  totalSupplied: supplied,
  totalBorrowed: borrowed,
});

const LIVE: AllBorrowLendReserveStates = [
  [
    0,
    state(
      '532648211.8330722451',
      '399203875.2093824148',
      '0.7494700373',
      '0.0337261517',
      '1.0',
      '0.0'
    ),
  ],
  [150, state('13064901.63', '0.0', '0.0', '0.0', '89.958', '0.65')],
  [197, state('2198.8', '0.0', '0.0', '0.0', '85332.767', '0.5')],
  [268, state('2768891.0', '1455551.7', '0.5256803893', '0.0236556175', '0.99994', '0.0')],
  [360, state('135915.55', '18924.61', '0.1392380178', '0.0062657108', '1.0', '0.0')],
];
const NAMES = new Map([
  [0, 'USDC'],
  [150, 'HYPE'],
  [197, 'UBTC'],
  [268, 'USDT0'],
  [360, 'USDH'],
]);

describe('lending board', () => {
  const rows = lendingRows(LIVE, NAMES);

  it('puts the lent-out stablecoins first, then collateral, each by supplied value', () => {
    expect(rows.map((r) => r.name)).toEqual(['USDC', 'USDT0', 'USDH', 'HYPE', 'UBTC']);
    expect(rows.map((r) => r.collateral)).toEqual([false, false, false, true, true]);
  });

  it('values amounts at the reply oracle price', () => {
    const hype = rows.find((r) => r.name === 'HYPE')!;
    expect(hype.suppliedUsd).toBeCloseTo(13064901.63 * 89.958, 4);
    expect(hype.borrowedUsd).toBe(0);
  });

  it('finds the live rates on the documented formula', () => {
    for (const r of rows) {
      expect(r.supplyFollowsModel).toBe(true);
      expect(r.borrowFollowsModel).toBe(r.collateral ? null : true);
    }
  });

  it('flags rates that leave the formula, and names an unknown token by id', () => {
    const [off] = lendingRows([[999, state('100', '50', '0.5', '0.03', '1', '0', '0.06')]], NAMES);
    expect(off.name).toBe('token 999');
    expect(off.borrowFollowsModel).toBe(false);
    expect(off.supplyFollowsModel).toBe(false);
  });
});

describe('token amounts', () => {
  it('keeps two decimals on small amounts, so a few BTC do not round to a whole one', () => {
    expect([13064901.63, 18924.61, 2198.8, 150, 5.3, 0].map((x) => amountCompact(x))).toEqual([
      '13.1M',
      '18.9K',
      '2.20K',
      '150',
      '5.30',
      '0.00',
    ]);
    expect(amountCompact(null)).toBe(MISSING);
  });
});

describe('rate model', () => {
  it('is flat at 5% up to the 80% kink and reaches 100% a year when fully lent', () => {
    expect(borrowRateModel(0.5)).toBe(0.05);
    expect(borrowRateModel(0.8)).toBeCloseTo(0.05, 10);
    expect(borrowRateModel(0.9)).toBeCloseTo(0.525, 10);
    expect(borrowRateModel(1)).toBeCloseTo(1, 10);
    expect(supplyRateModel(1, 1)).toBeCloseTo(0.9, 10);
  });

  it('draws the curve from 0 to 100% with the kink on a step', () => {
    const c = rateCurve(100);
    expect(c).toHaveLength(101);
    expect(c[80].borrow).toBeCloseTo(0.05, 10);
    expect(c[100].borrow).toBeCloseTo(1, 10);
    expect(c[0].supply).toBe(0);
  });
});
