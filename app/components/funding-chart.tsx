'use client';
/**
 * Hourly funding (bars) and that hour's premium (line) from fundingHistory
 * (plan §3.3): 7 days by default, 21 and 90 on request, paged forward through
 * the tab's queue with progress shown.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type uPlot from 'uplot';
import { FundingRow } from '@/lib/hl/types';
import { fetchFundingHistory } from '@/lib/charts/fetch-funding-history';
import { DOWN_COLOUR, UP_COLOUR } from '@/lib/charts/candles-plugin';
import { useUPlot } from '@/lib/charts/use-uplot';
import { useLiveClient } from '@/lib/live/use-live-client';
import { waitNote } from '@/lib/live/wait-note';
import { CHART_ID } from '@/lib/charts/chart-registry';
import { DEFAULT_FUNDING_RANGE, FUNDING_RANGES, FundingRange } from '@/lib/charts/ranges';
import { ChartTable, utcIso } from '@/lib/charts/to-csv';
import { ChartFrame } from './chart-frame';
import { Segmented } from './segmented';

const DAY = 86_400_000;
const HEIGHT = 220;

/** `label`: the market's display name, for the chart's title and file names. */
export function FundingChart({
  coin,
  label,
  initialRange = DEFAULT_FUNDING_RANGE,
}: {
  coin: string;
  label?: string;
  initialRange?: FundingRange;
}) {
  const { client } = useLiveClient();
  const [range, setRange] = useState<FundingRange>(initialRange);
  const [rows, setRows] = useState<FundingRow[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState('');
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!client) return;
    let stopped = false;
    setRows(null);
    setProgress(0);
    setNote('');
    const now = Date.now();
    client
      .start()
      .then(() =>
        fetchFundingHistory(
          (body) => client.info.request(body),
          coin,
          now - range.days * DAY,
          now,
          (n) => !stopped && setProgress(n)
        )
      )
      .then((r) => !stopped && (r.length ? setRows(r) : setNote('No funding history.')))
      .catch((e: unknown) => !stopped && setNote(`Could not load funding history: ${String(e)}`));
    return () => {
      stopped = true;
    };
  }, [client, coin, range]);

  const data = useMemo<uPlot.AlignedData | null>(
    () =>
      rows && rows.length
        ? [
            rows.map((r) => Math.floor(r.time / 1000)),
            rows.map((r) => Number(r.fundingRate) * 100),
            rows.map((r) => Number(r.premium) * 100),
          ]
        : null,
    [rows]
  );

  useUPlot(
    box,
    (width, lib) => ({
      width,
      height: HEIGHT,
      legend: { live: true },
      scales: { x: { time: true } },
      series: [
        { label: 'UTC' },
        {
          label: 'Funding %/h',
          scale: 'f',
          paths: lib.paths.bars?.({ size: [0.8, 6] }),
          fill: 'rgba(22, 163, 74, 0.55)',
          stroke: UP_COLOUR,
          value: (_u: uPlot, v: number | null) => (v === null ? '' : `${v.toFixed(4)}%`),
        },
        {
          label: 'Premium %',
          scale: 'p',
          stroke: DOWN_COLOUR,
          width: 1,
          value: (_u: uPlot, v: number | null) => (v === null ? '' : `${v.toFixed(4)}%`),
        },
      ],
      axes: [
        {},
        {
          scale: 'f',
          size: 70,
          values: (_u: uPlot, t: number[]) => t.map((v) => `${v.toFixed(4)}%`),
        },
        {
          scale: 'p',
          side: 1,
          size: 70,
          grid: { show: false },
          values: (_u: uPlot, t: number[]) => t.map((v) => `${v.toFixed(3)}%`),
        },
      ],
    }),
    data,
    HEIGHT,
    range.id
  );

  const name = label ?? coin;
  const table: ChartTable | null = rows
    ? {
        columns: ['Hour (UTC)', 'Funding per hour', 'Premium'],
        rows: rows.map((r) => [utcIso(r.time), Number(r.fundingRate), Number(r.premium)]),
      }
    : null;
  return (
    <div style={{ margin: '0.5rem 0 0' }}>
      <Segmented
        label="Funding history range"
        value={range.id}
        options={FUNDING_RANGES.map((r) => ({ value: r.id, label: r.label }))}
        onChange={(id) => setRange(FUNDING_RANGES.find((r) => r.id === id) ?? range)}
        className="mb-2"
      />
      {!data && note && <p style={{ color: 'var(--muted-foreground)' }}>{note}</p>}
      <ChartFrame
        id={CHART_ID.marketFunding}
        title={`${name} funding and premium, last ${range.days} days`}
        fileTag={`${name}-${range.id}`}
        table={table}
        legend={[
          { label: 'Funding per hour (bars)', colour: UP_COLOUR },
          { label: 'Premium (line)', colour: DOWN_COLOUR },
        ]}
        embedParams={{ m: coin, r: range.id }}
        loading={
          rows === null && !note
            ? `Loading funding history…${progress ? ` ${progress} hours so far.` : ''}${waitNote(client?.info.resumesAt ?? 0, Date.now())}`
            : ''
        }
        height={HEIGHT}
      >
        <div ref={box} style={{ width: '100%' }} />
        <p style={{ fontSize: '0.8em', color: 'var(--muted-foreground)', margin: '0.2rem 0 0' }}>
          Hourly funding rate applied (bars, left axis) and that hour&apos;s premium (line, right
          axis), UTC, last {range.days} days.
        </p>
      </ChartFrame>
    </div>
  );
}
