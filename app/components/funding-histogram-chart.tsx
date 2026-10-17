'use client';
/**
 * Funding across live perps, per year, as stacked bars: markets at their base
 * rate apart from markets whose rate the premium sets (lib/funding/funding-histogram.ts).
 */
import { useRef } from 'react';
import { useWidth } from '@/lib/charts/use-width';
import { CHART_ID } from '@/lib/charts/chart-registry';
import { ChartTable } from '@/lib/charts/to-csv';
import { ChartFrame } from './chart-frame';
import { pct } from '@/lib/format/format';
import { FUNDING_BIN_EDGES, FundingBin } from '@/lib/funding/funding-histogram';

const HEIGHT = 230;
/** Below this the chart scrolls sideways: bars too thin to hold their edge labels. */
const MIN_WIDTH = 320;
const PAD = { left: 12, right: 12, top: 18, bottom: 34 };
/**
 * Bars at least this wide (px) are labelled with their range ("−100% to −50%");
 * thinner ones, on phones and narrow windows, with the edges between them,
 * which stay readable down to MIN_WIDTH.
 */
const RANGE_LABEL_MIN_SLOT = 90;
export const AT_BASE_COLOUR = '#adb5bd';
export const PREMIUM_SET_COLOUR = '#1c64d1';

const binLabel = (b: FundingBin): string =>
  b.low === null
    ? `below ${pct(b.high, 0)}`
    : b.high === null
      ? `${pct(b.low, 0)} and up`
      : `${pct(b.low, 0)} to ${pct(b.high, 0)}`;

export function FundingHistogramChart({ bins }: { bins: readonly FundingBin[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const width = Math.max(useWidth(wrap), MIN_WIDTH);
  const max = Math.max(1, ...bins.map((b) => b.atBase + b.premiumSet));
  const slot = (width - PAD.left - PAD.right) / bins.length;
  const h = (n: number): number => (n / max) * (HEIGHT - PAD.top - PAD.bottom);
  const floor = HEIGHT - PAD.bottom;
  const rangeLabels = slot >= RANGE_LABEL_MIN_SLOT;

  const table: ChartTable = {
    columns: ['Funding per year, from', 'to', 'At the base rate', 'Set by the premium'],
    rows: bins.map((b) => [b.low, b.high, b.atBase, b.premiumSet]),
  };
  return (
    <ChartFrame
      id={CHART_ID.fundingHistogram}
      title="Live perps by funding rate per year"
      table={table}
      legend={[
        { label: 'At the base rate', colour: AT_BASE_COLOUR },
        { label: 'Set by the premium', colour: PREMIUM_SET_COLOUR },
      ]}
    >
      <div ref={wrap} style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Number of live perps by yearly funding rate"
          style={{ display: 'block' }}
        >
          <line x1={PAD.left} x2={width - PAD.right} y1={floor} y2={floor} stroke="#999" />
          {bins.map((b, i) => {
            const x = PAD.left + i * slot + slot * 0.12;
            const w = slot * 0.76;
            const total = b.atBase + b.premiumSet;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={floor - h(b.atBase)}
                  width={w}
                  height={h(b.atBase)}
                  fill={AT_BASE_COLOUR}
                />
                <rect
                  x={x}
                  y={floor - h(total)}
                  width={w}
                  height={h(b.premiumSet)}
                  fill={PREMIUM_SET_COLOUR}
                />
                <text x={x + w / 2} y={floor - h(total) - 4} textAnchor="middle" fontSize={11}>
                  {total}
                </text>
                {rangeLabels && (
                  <text
                    x={x + w / 2}
                    y={floor + 14}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#555"
                    className="fill-muted-foreground"
                  >
                    {binLabel(b)}
                  </text>
                )}
              </g>
            );
          })}
          {!rangeLabels &&
            FUNDING_BIN_EDGES.map((e, i) => {
              const x = PAD.left + (i + 1) * slot;
              return (
                <g key={e}>
                  <line x1={x} x2={x} y1={floor} y2={floor + 4} stroke="#999" />
                  <text
                    x={x}
                    y={floor + 15}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#555"
                    className="fill-muted-foreground"
                  >
                    {pct(e, 0)}
                  </text>
                </g>
              );
            })}
          <text
            x={PAD.left}
            y={HEIGHT - 4}
            fontSize={10}
            fill="#555"
            className="fill-muted-foreground"
          >
            Funding per year
          </text>
        </svg>
      </div>
    </ChartFrame>
  );
}
