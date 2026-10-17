/**
 * Hyperliquid's documented lending rates (docs, "Portfolio margin", read
 * 2026-10-04): "The borrow interest rate for stablecoins is set at
 * 0.05 + 4.75 * max(0, utilization - 0.8) APY ... utilization =
 * total_borrowed_value / total_supplied_value", and "the protocol retains 10%
 * of borrowed interest as a buffer for future liquidations", so suppliers earn
 * borrow rate × utilization × 0.9. Checked against the live reply the same day:
 * all five tokens within 1e-11. Every token was below the kink then, so the
 * slope above 80% rests on the docs alone.
 */
export const BORROW_BASE = 0.05;
export const BORROW_SLOPE = 4.75;
export const KINK = 0.8;
export const SUPPLIER_SHARE = 0.9;
/** The reply's rates carry 10 decimals. */
export const RATE_TOLERANCE = 1e-9;

export function borrowRateModel(utilization: number): number {
  return BORROW_BASE + BORROW_SLOPE * Math.max(0, utilization - KINK);
}

export function supplyRateModel(borrowRate: number, utilization: number): number {
  return borrowRate * utilization * SUPPLIER_SHARE;
}
