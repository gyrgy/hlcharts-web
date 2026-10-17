'use client';
/**
 * Builder codes, live: on a $10,000 trade, the exchange's base taker fee now
 * (fee schedule) next to the most a builder may add (docs: builder codes).
 */
import { pct, usdCompact } from '@/lib/format/format';
import { BUILDER_FEE_MAX } from '@/lib/hl/constants';
import { feeTable } from '@/lib/learn/fee-table';
import { LiveClient } from '@/lib/live/live-client';
import { useFeeSchedule } from './fee-schedule-chart';
import { tableBox } from '../components/table-box';

const EXAMPLE_USD = 10_000;

export function BuilderFeeChart({ client }: { client: LiveClient }) {
  const fees = useFeeSchedule(client);
  if (!fees.data)
    return (
      <p style={{ color: 'var(--muted-foreground)' }}>
        {fees.error || 'Loading the fee schedule…'}
      </p>
    );
  const base = feeTable(fees.data.feeSchedule).tiers[0];
  const lines = [
    { market: 'Perp', taker: base.perpTaker, builder: BUILDER_FEE_MAX.perp },
    { market: 'Spot', taker: base.spotTaker, builder: BUILDER_FEE_MAX.spot },
  ];
  const td = {
    padding: '0.2rem 0.8rem',
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums' as const,
  };
  return (
    <div {...tableBox()}>
      <table style={{ borderCollapse: 'collapse', fontSize: '0.9em' }}>
        <thead>
          <tr>
            {[
              `A ${usdCompact(EXAMPLE_USD)} market order`,
              'Exchange fee (base tier)',
              'Builder fee, at most',
              'All in, at most',
            ].map((h, i) => (
              <th
                key={h}
                style={{
                  ...td,
                  textAlign: i ? 'right' : 'left',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.market}>
              <td style={{ ...td, textAlign: 'left' }}>{l.market}</td>
              <td style={td}>
                {usdCompact(EXAMPLE_USD * l.taker)} ({pct(l.taker, 3)})
              </td>
              <td style={td}>
                {usdCompact(EXAMPLE_USD * l.builder)} ({pct(l.builder, 1)})
              </td>
              <td style={td}>
                <b>{usdCompact(EXAMPLE_USD * (l.taker + l.builder))}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
