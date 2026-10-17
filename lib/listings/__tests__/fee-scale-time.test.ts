/**
 * The fee-scale change time as Hyperliquid really sends it (2026-10-16): pages
 * showed "1969-12-31" for never and shifted every date by the browser's zone.
 */
import { describe, expect, it } from 'vitest';
import { feeScaleChangedAt } from '../fee-scale-time';

describe('feeScaleChangedAt', () => {
  it('reads the zone-less nanosecond form as UTC, to the second', () => {
    expect(feeScaleChangedAt('2025-11-23T17:37:10.033211662')).toBe(
      Date.UTC(2025, 10, 23, 17, 37, 10)
    );
  });

  it('gives no date for never, missing or unreadable', () => {
    expect(feeScaleChangedAt('1970-01-01T00:00:00')).toBeNull();
    expect(feeScaleChangedAt(undefined)).toBeNull();
    expect(feeScaleChangedAt('')).toBeNull();
    expect(feeScaleChangedAt('not a date')).toBeNull();
  });
});
