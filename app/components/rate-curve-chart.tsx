'use client';
/**
 * The documented lending rate curve (borrow and supply against utilization),
 * the 80% kink, and where each stablecoin sits on it right now. Only tokens
 * whose live rates follow the formula are placed on it.
 */
import { useRef } from 'react';
import { useWidth } from '@/lib/charts/use-width';
import { CHART_ID } from '@/lib/charts/chart-registry';
import { ChartTable } from '@/lib/charts/to-csv';
import { ChartFrame } from './chart-frame';
import { pct } from '@/lib/format/format';
import { LendingRow } from '@/lib/lending/lending-rows';
import { rateCurve } from '@/lib/lending/rate-curve';
import { KINK } from '@/lib/lending/rate-model';

const HEIGHT = 260;
const PAD = { left: 44, right: 16, top: 12, bottom: 30 };
const STEPS = 100;
const BORROW_COLOUR = '#c2255c';
const SUPPLY_COLOUR = '#2b8a3e';
const TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1];

export function RateCurveChart({ rows }: { rows: readonly LendingRow[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const width = useWidth(wrap);
  const curve = rateCurve(STEPS);
  const x = (u: number): number => PAD.left + u * (width - PAD.left - PAD.right);
  const y = (r: number): number => HEIGHT - PAD.bottom - r * (HEIGHT - PAD.top - PAD.bottom);
  const line = (key: 'borrow' | 'supply'): string =>
    curve.map((p, i) => `${i ? 'L' : 'M'}${x(p.utilization)},${y(p[key])}`).join(' ');

  const table: ChartTable = {
    columns: ['Point', 'Lent out', 'Borrow rate per year', 'Supply rate per year'],
    rows: [
      ...rows.map((r) => [`${r.name} now`, r.utilization, r.borrowRate, r.supplyRate]),
      ...curve
        .filter((p) => Math.round(p.utilization * 100) % 5 === 0)
        .map((p) => ['documented curve', p.utilization, p.borrow, p.supply]),
    ],
  };
  return (
    <ChartFrame
      id={CHART_ID.lendingCurve}
      title="Lending rates against the share lent out"
      table={table}
      legend={[
        { label: 'Borrow rate', colour: BORROW_COLOUR },
        { label: 'Supply rate', colour: SUPPLY_COLOUR },
      ]}
    >
      <div ref={wrap} style={{ width: '100%' }}>
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label="Documented borrow and supply rates against utilization, with the 80% kink"
            style={{ display: 'block' }}
          >
            {TICKS.map((t) => (
              <g key={t}>
                <line
                  x1={x(0)}
                  x2={x(1)}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="#e6e6e6"
                  className="stroke-border"
                />
                <text
                  x={x(0) - 6}
                  y={y(t) + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="#555"
                  className="fill-muted-foreground"
                >
                  {pct(t, 0)}
                </text>
                <text
                  x={x(t)}
                  y={HEIGHT - PAD.bottom + 16}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#555"
                  className="fill-muted-foreground"
                >
                  {pct(t, 0)}
                </text>
              </g>
            ))}
            <line
              x1={x(KINK)}
              x2={x(KINK)}
              y1={y(0)}
              y2={y(1)}
              stroke="#999"
              strokeDasharray="4 3"
            />
            <text
              x={x(KINK) - 4}
              y={y(0.95)}
              textAnchor="end"
              fontSize={11}
              fill="#555"
              className="fill-muted-foreground"
            >
              kink {pct(KINK, 0)}
            </text>
            <path d={line('borrow')} fill="none" stroke={BORROW_COLOUR} strokeWidth={2} />
            <path d={line('supply')} fill="none" stroke={SUPPLY_COLOUR} strokeWidth={2} />
            {rows.map((r, i) => (
              <g key={r.token}>
                <circle cx={x(r.utilization)} cy={y(r.borrowRate)} r={4} fill={BORROW_COLOUR} />
                <circle cx={x(r.utilization)} cy={y(r.supplyRate)} r={4} fill={SUPPLY_COLOUR} />
                <text
                  x={x(r.utilization)}
                  y={y(r.borrowRate) - 8 - (i % 2) * 12}
                  textAnchor="middle"
                  fontSize={11}
                >
                  {r.name}
                </text>
              </g>
            ))}
          </svg>
        )}
        <p style={{ fontSize: '0.85em', margin: '0.2rem 0' }}>
          <span style={{ color: BORROW_COLOUR, fontWeight: 600 }}>Borrow rate</span> ·{' '}
          <span style={{ color: SUPPLY_COLOUR, fontWeight: 600 }}>Supply rate</span>, per year,
          against utilization (the share of supplied tokens lent out). Dots: each stablecoin now.
        </p>
      </div>
    </ChartFrame>
  );
}
