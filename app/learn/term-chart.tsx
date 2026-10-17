'use client';
/** Each Learn term's live chart, drawn from the same data and components as the rest of the site. */
import { INFO, MAIN_DEX } from '@/lib/hl/constants';
import { AllBorrowLendReserveStates } from '@/lib/hl/types';
import { pct, usdCompact } from '@/lib/format/format';
import { fundingBoard } from '@/lib/funding/funding-board';
import { fundingHistogram } from '@/lib/funding/funding-histogram';
import { venueSummary } from '@/lib/home/venue-summary';
import { spotPerpBasis } from '@/lib/learn/spot-perp-basis';
import { TermChart as TermChartId } from '@/lib/learn/terms';
import { lendingRows } from '@/lib/lending/lending-rows';
import { usePolledInfo } from '@/lib/live/use-polled-info';
import { exchangePath } from '@/lib/markets/market-paths';
import { siblingVenue } from '@/lib/markets/sibling-rules';
import { sortBy } from '@/lib/markets/sort-by';
import { useMarketRows } from '@/lib/markets/use-market-rows';
import { oiBoard } from '@/lib/oi/oi-board';
import { BarList } from '../components/bar-list';
import { BookPanel } from '../components/book-panel';
import { FundingChart } from '../components/funding-chart';
import { FundingHistogramChart } from '../components/funding-histogram-chart';
import { MarketMap } from '../components/market-map';
import { OiTreemap } from '../components/oi-treemap';
import { RateCurveChart } from '../components/rate-curve-chart';
import { BuilderFeeChart } from './builder-fee-chart';
import { FeeScheduleChart } from './fee-schedule-chart';
import { TwapExample } from './twap-example';

/** How many markets a bar chart shows. */
const BARS = 12;
/** On /learn the lending curve refreshes every 5 min, as on the home page. */
const LENDING_POLL_MS = 5 * 60_000;

export function TermChart({ chart }: { chart: TermChartId }) {
  const { client, rows, ready, startError } = useMarketRows();
  const lending = usePolledInfo<AllBorrowLendReserveStates>(
    chart === 'lending-curve' ? client : null,
    { type: INFO.allBorrowLendReserveStates },
    LENDING_POLL_MS
  );
  if (!client) return null;
  if (startError)
    return <p style={{ color: 'var(--destructive)' }}>Could not reach Hyperliquid: {startError}</p>;
  if (!ready)
    return (
      <p style={{ color: 'var(--muted-foreground)' }}>Waiting for Hyperliquid&apos;s live data…</p>
    );

  const perps = rows.filter((r) => r.kind === 'perp' && !r.delisted);
  const largest = sortBy(perps, (r) => r.oiUsd, true)[0];
  const label = (r: (typeof rows)[number]): string => `${r.name} (${siblingVenue(r)})`;

  switch (chart) {
    case 'funding-histogram':
      return (
        <FundingHistogramChart bins={fundingHistogram(fundingBoard(rows, client.universe.dexes))} />
      );
    case 'premium-history':
      return largest ? (
        <>
          <p style={{ margin: '0 0 0.3rem' }}>{label(largest)}</p>
          <FundingChart coin={largest.key} label={label(largest)} />
        </>
      ) : null;
    case 'market-map':
      return <MarketMap rows={perps} venues={client.universe.liveDexes()} />;
    case 'mark-oracle':
      return (
        <BarList
          bars={sortBy(
            perps.filter((r) => r.basisBps !== null),
            (r) => Math.abs(r.basisBps ?? 0),
            true
          )
            .slice(0, BARS)
            .map((r) => ({
              key: r.key,
              label: label(r),
              href: r.href,
              value: r.basisBps ?? 0,
              text: `${(r.basisBps ?? 0).toFixed(1)} bp`,
            }))}
        />
      );
    case 'oi-treemap':
      return (
        <OiTreemap
          rows={oiBoard(rows, client.universe.dexes)}
          venues={client.universe.liveDexes()}
        />
      );
    case 'cap-use':
      return (
        <BarList
          bars={sortBy(
            perps.filter((r) => r.capUse !== null),
            (r) => r.capUse,
            true
          )
            .slice(0, BARS)
            .map((r) => ({
              key: r.key,
              label: label(r),
              href: r.href,
              value: r.capUse ?? 0,
              text: pct(r.capUse, 1),
            }))}
        />
      );
    case 'exchange-share':
      return (
        <BarList
          bars={venueSummary(rows)
            .filter((v) => v.venue !== MAIN_DEX && v.oiUsd !== null)
            .map((v) => ({
              key: v.venue,
              label: v.label,
              href: exchangePath(v.venue),
              value: v.oiUsd ?? 0,
              text: usdCompact(v.oiUsd),
            }))}
        />
      );
    case 'spot-perp-basis':
      return (
        <BarList
          bars={spotPerpBasis(rows).map((b) => ({
            key: `${b.spot.key}|${b.perp.key}`,
            label: `${b.spot.name} vs ${b.perp.name} (${siblingVenue(b.perp)})`,
            href: b.spot.href,
            value: b.basisBps,
            text: `${b.basisBps.toFixed(1)} bp`,
          }))}
        />
      );
    case 'book':
      return largest ? (
        <>
          <p style={{ margin: '0 0 0.3rem' }}>{label(largest)}</p>
          <BookPanel coin={largest.key} />
        </>
      ) : null;
    case 'fee-schedule':
      return <FeeScheduleChart client={client} rows={rows} />;
    case 'builder-fee':
      return <BuilderFeeChart client={client} />;
    case 'twap':
      return largest ? (
        <TwapExample client={client} coin={largest.key} label={label(largest)} />
      ) : null;
    case 'lending-curve': {
      if (!lending.data)
        return (
          <p style={{ color: 'var(--muted-foreground)' }}>
            {lending.error || 'Loading the lending market…'}
          </p>
        );
      const stable = lendingRows(lending.data, client.universe.tokenNames).filter(
        (r) => !r.collateral && r.borrowFollowsModel && r.supplyFollowsModel
      );
      return <RateCurveChart rows={stable} />;
    }
  }
}
