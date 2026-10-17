/**
 * The live all-market feed sends each exchange's contexts as unnamed rows; the
 * site labels them by position in that exchange's market list. Measured to
 * hold on 2026-10-04 (234 of 234 main-exchange rows), but if Hyperliquid ever
 * reorders, every number would sit under the wrong market. So on every
 * connection each exchange's rows are compared with a REST snapshot, which
 * names its rows: a row agrees when its mark is within ROW_ORDER_TOLERANCE.
 */
import { ROW_ORDER_MIN_MATCH, ROW_ORDER_TOLERANCE } from './constants';

export function checkRowOrder(
  live: readonly { markPx: string }[],
  snapshot: readonly { markPx: string }[]
): { matched: number; total: number; ok: boolean } {
  let matched = 0;
  live.forEach((row, i) => {
    const a = Number(row.markPx);
    const b = Number(snapshot[i]?.markPx);
    if (a > 0 && b > 0 && Math.abs(a / b - 1) <= ROW_ORDER_TOLERANCE) matched += 1;
  });
  const total = live.length;
  return {
    matched,
    total,
    ok: total > 0 && total === snapshot.length && matched >= total * ROW_ORDER_MIN_MATCH,
  };
}
