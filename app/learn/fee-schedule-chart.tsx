'use client';
/**
 * Fees, live: Hyperliquid's fee schedule as it returns it now (userFees for
 * the zero address, no one's account), and what a round trip costs on the
 * busiest main-exchange perps at the base tier.
 */
import { pct, usdCompact } from '@/lib/format/format';
import { INFO, ZERO_ADDRESS } from '@/lib/hl/constants';
import { UserFees } from '@/lib/hl/types';
import { feeTable } from '@/lib/learn/fee-table';
import { roundTrips } from '@/lib/learn/round-trip';
import { LiveClient } from '@/lib/live/live-client';
import { usePolledInfo } from '@/lib/live/use-polled-info';
import { MarketRow } from '@/lib/markets/types';
import { BarList } from '../components/bar-list';
import { tableBox } from '../components/table-box';

/** The schedule changes rarely. */
export const FEES_POLL_MS = 60 * 60_000;
const ROUND_TRIPS = 8;
const rate = (x: number): string => pct(x, 4);

export function useFeeSchedule(client: LiveClient | null) {
  return usePolledInfo<UserFees>(client, { type: INFO.userFees, user: ZERO_ADDRESS }, FEES_POLL_MS);
}

export function FeeScheduleChart({
  client,
  rows,
}: {
  client: LiveClient;
  rows: readonly MarketRow[];
}) {
  const fees = useFeeSchedule(client);
  if (!fees.data)
    return (
      <p style={{ color: 'var(--muted-foreground)' }}>
        {fees.error || 'Loading the fee schedule…'}
      </p>
    );
  const t = feeTable(fees.data.feeSchedule);
  const td = {
    padding: '0.15rem 0.7rem',
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums' as const,
  };
  const trips = roundTrips(rows, t.tiers[0].perpTaker, ROUND_TRIPS);
  return (
    <>
      <div {...tableBox()}>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.9em' }}>
          <thead>
            <tr>
              {['14-day volume', 'Perp taker', 'Perp maker', 'Spot taker', 'Spot maker'].map(
                (h, i) => (
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
                )
              )}
            </tr>
          </thead>
          <tbody>
            {t.tiers.map((x) => (
              <tr key={x.fromUsd}>
                <td style={{ ...td, textAlign: 'left' }}>
                  {x.fromUsd ? `over ${usdCompact(x.fromUsd)}` : 'base'}
                </td>
                <td style={td}>{rate(x.perpTaker)}</td>
                <td style={td}>{rate(x.perpMaker)}</td>
                <td style={td}>{rate(x.spotTaker)}</td>
                <td style={td}>{rate(x.spotMaker)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.85em' }}>
        Maker rebates for the largest makers:{' '}
        {t.rebates.map((r) => `${rate(r.rate)} above ${pct(r.makerShareAbove, 1)}`).join(', ')}.
        Staking discounts:{' '}
        {t.staking
          .map((s) => `${pct(s.discount, 0)} from ${s.fromHype.toLocaleString('en-US')} HYPE`)
          .join(', ')}
        . Referral discount: {pct(t.referralDiscount, 0)}.
      </p>
      <h3 style={{ fontSize: '1em' }}>
        A round trip at the base tier, busiest main-exchange perps
      </h3>
      <BarList
        bars={trips.map((x) => ({
          key: x.row.key,
          label: x.row.name,
          href: x.row.href,
          value: x.totalBps,
          text: `${x.totalBps.toFixed(1)} bp (spread ${x.spreadBps.toFixed(1)} + fees ${x.feesBps.toFixed(1)})`,
        }))}
      />
    </>
  );
}
