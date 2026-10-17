/**
 * Several markets' hourly funding on one time axis. fundingHistory stamps each
 * hour a few milliseconds after it (4–90 ms past the hour, the same instants on
 * main and builder exchanges, 2026-10-04), so times are rounded to the hour.
 * A market without a row for an hour (listed later, a gap) gets null there,
 * never a carried-over value.
 */
import { FundingRow } from '../hl/types';

const HOUR_MS = 3_600_000;

export interface AlignedFunding {
  /** Unix seconds, ascending. */
  times: number[];
  /** One array per input series, in input order: hourly rate or null. */
  values: (number | null)[][];
}

export function alignHourly(series: readonly (readonly FundingRow[])[]): AlignedFunding {
  const hour = (t: number): number => Math.round(t / HOUR_MS) * HOUR_MS;
  const all = new Set<number>();
  for (const rows of series) for (const r of rows) all.add(hour(r.time));
  const hours = [...all].sort((a, b) => a - b);
  const at = new Map(hours.map((h, i) => [h, i]));
  const values = series.map((rows) => {
    const v: (number | null)[] = hours.map(() => null);
    for (const r of rows) v[at.get(hour(r.time))!] = Number(r.fundingRate);
    return v;
  });
  return { times: hours.map((h) => h / 1000), values };
}
