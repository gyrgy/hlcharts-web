/** Chart extras: CSV that spreadsheets read correctly, stable file names, and ids tied to real definitions. */
import { describe, expect, it } from 'vitest';
import { METRICS } from '../../methodology/metrics';
import { CHART_ID, CHART_SPECS } from '../chart-registry';
import { chartFileName, toCsv, utcIso } from '../to-csv';

describe('CSV', () => {
  it('writes a header, full-precision numbers, empty missing values and quotes only where needed', () => {
    expect(
      toCsv({
        columns: ['Hour (UTC)', 'Funding per hour', 'Market'],
        rows: [
          ['2026-10-05T14:00:00Z', 0.0000125, 'BTC'],
          ['2026-10-05T15:00:00Z', null, 'xyz:NVDA, "stock"'],
          ['2026-10-05T16:00:00Z', NaN, 'line\nbreak'],
        ],
      })
    ).toBe(
      'Hour (UTC),Funding per hour,Market\r\n' +
        '2026-10-05T14:00:00Z,0.0000125,BTC\r\n' +
        '2026-10-05T15:00:00Z,,"xyz:NVDA, ""stock"""\r\n' +
        '2026-10-05T16:00:00Z,,"line\nbreak"\r\n'
    );
  });

  it('writes UTC times without milliseconds', () => {
    expect(utcIso(Date.UTC(2026, 9, 5, 14))).toBe('2026-10-05T14:00:00Z');
  });
});

describe('file names', () => {
  it('carry the chart id, what it shows and the UTC minute', () => {
    const at = new Date(Date.UTC(2026, 9, 5, 14, 12, 30));
    expect(chartFileName('market.funding', 'BTC', at, 'csv')).toBe(
      'hlcharts-market.funding-btc-20261005-1412.csv'
    );
    expect(chartFileName('market.price', 'xyz:NVDA', at, 'png')).toBe(
      'hlcharts-market.price-xyz-nvda-20261005-1412.png'
    );
    expect(chartFileName('oi.treemap', '', at, 'png')).toBe(
      'hlcharts-oi.treemap-20261005-1412.png'
    );
  });
});

describe('chart ids', () => {
  it('each have a source and a definition that exists on /methodology', () => {
    const anchors = new Set(METRICS.map((m) => m.id));
    for (const id of Object.values(CHART_ID)) {
      expect(CHART_SPECS[id].source.length).toBeGreaterThan(0);
      expect([id, anchors.has(CHART_SPECS[id].methodology)]).toEqual([id, true]);
    }
  });

  it('are unique and stable in form (lowercase, dotted)', () => {
    const ids = Object.values(CHART_ID);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+(\.[a-z-]+)+$/);
  });
});
