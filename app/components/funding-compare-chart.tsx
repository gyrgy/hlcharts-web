'use client';
/**
 * Funding history for up to 10 markets on one chart (plan §3.3, `/funding`):
 * 7 days by default, 21 or 90 on request. Each market's history goes through
 * the tab's weight queue (a 7-day market is one request; 90 days is five), is
 * drawn as soon as it arrives, and is kept for the visit so switching units or
 * re-adding a market costs nothing.
 */
import { XIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type uPlot from 'uplot';
import { fetchFundingWindow } from '@/lib/charts/fetch-funding-window';
import { nextFundingWindow } from '@/lib/charts/funding-window';
import { useUPlot } from '@/lib/charts/use-uplot';
import { MISSING, pctSigned } from '@/lib/format/format';
import { alignHourly } from '@/lib/funding/align-hourly';
import { fundingStats } from '@/lib/funding/funding-stats';
import { FundingRow } from '@/lib/hl/types';
import { useLiveClient } from '@/lib/live/use-live-client';
import { waitNote } from '@/lib/live/wait-note';
import { CHART_ID } from '@/lib/charts/chart-registry';
import { COMPARE_DAYS, CompareDays, CompareUnit, MAX_COMPARE_MARKETS } from '@/lib/charts/ranges';
import { ChartTable, utcIso } from '@/lib/charts/to-csv';
import { ChartFrame } from './chart-frame';
import { Segmented } from './segmented';
import { tableBox } from './table-box';

export const MAX_PICKS = MAX_COMPARE_MARKETS;
const DAY_MS = 86_400_000;
const HOURS_PER_YEAR = 24 * 365;
const HEIGHT = 300;
const COLOURS = [
  '#1c64d1',
  '#d9480f',
  '#2b8a3e',
  '#862e9c',
  '#c2255c',
  '#0b7285',
  '#5c940d',
  '#e67700',
  '#495057',
  '#a61e4d',
];
/** The line colour of the market picked `index`-th (the funding table ticks its box in it). */
export const pickColour = (index: number): string => COLOURS[index % COLOURS.length];

export interface Pick {
  key: string;
  label: string;
}

/** One market's history loaded so far: rows oldest first, covering `from` to the time of the first request. */
interface History {
  rows: FundingRow[];
  /** The oldest time covered; 0 when the market has nothing older. */
  from: number;
}

export function FundingCompareChart({
  picks,
  unit,
  onRemove,
  initialDays = COMPARE_DAYS[0],
}: {
  picks: readonly Pick[];
  unit: CompareUnit;
  onRemove: (key: string) => void;
  initialDays?: CompareDays;
}) {
  const { client } = useLiveClient();
  const [days, setDays] = useState<CompareDays>(initialDays);
  /** Each market's history so far, kept across ranges: a shorter range reuses it. */
  const histories = useRef(new Map<string, History>());
  const failed = useRef(new Map<string, string>());
  /** Markets with a loader running. */
  const running = useRef(new Set<string>());
  /** What the loaders work towards; read before every request, so a change of range or picks takes effect at once. */
  const want = useRef<{ since: number; keys: string[] }>({ since: 0, keys: [] });
  const [version, setVersion] = useState(0);
  const box = useRef<HTMLDivElement | null>(null);
  const picksKey = picks.map((p) => p.key).join(',');

  useEffect(() => {
    if (!client) return;
    const keys = picksKey ? picksKey.split(',') : [];
    want.current = { since: Date.now() - days * DAY_MS, keys };
    // One loader per market, newest piece first (lib/charts/funding-window.ts);
    // each piece is drawn as it arrives. A market taken off the chart stops
    // after its current request.
    const load = async (key: string): Promise<void> => {
      await client.start();
      for (;;) {
        const { since, keys: wanted } = want.current;
        if (!wanted.includes(key)) return;
        const had = histories.current.get(key);
        const w = nextFundingWindow(had ? had.from : null, since, Date.now());
        if (!w) return;
        const rows = await fetchFundingWindow((b) => client.info.request(b), key, w);
        const before = histories.current.get(key);
        histories.current.set(key, {
          rows: [...rows, ...(before?.rows ?? [])],
          // An empty piece: the market has nothing older (listed later).
          from: rows.length ? w.startTime : 0,
        });
        setVersion((v) => v + 1);
      }
    };
    for (const key of keys) {
      if (running.current.has(key)) continue;
      running.current.add(key);
      failed.current.delete(key);
      load(key)
        .catch((e: unknown) => failed.current.set(key, String(e)))
        .finally(() => {
          running.current.delete(key);
          setVersion((v) => v + 1);
        });
    }
  }, [client, picksKey, days]);

  const since = Date.now() - days * DAY_MS;
  const inRange = (key: string): FundingRow[] =>
    (histories.current.get(key)?.rows ?? []).filter((r) => r.time >= since);
  const complete = (key: string): boolean => {
    const h = histories.current.get(key);
    return h !== undefined && h.from <= since;
  };
  const loaded = picks.filter((p) => inRange(p.key).length > 0);
  const scale = unit === 'year' ? HOURS_PER_YEAR * 100 : 100;
  const loadedKey = loaded.map((p) => p.key).join(',');
  const data = useMemo<uPlot.AlignedData | null>(() => {
    if (!loaded.length) return null;
    const a = alignHourly(loaded.map((p) => inRange(p.key)));
    return [a.times, ...a.values.map((v) => v.map((x) => (x === null ? null : x * scale)))];
    // The histories are a ref: loadedKey, days and version are what change when their contents do.
  }, [loadedKey, days, scale, version]);

  const table: ChartTable | null = data
    ? {
        columns: [
          'Hour (UTC)',
          ...loaded.map((p) => `${p.label} (% ${unit === 'year' ? 'per year' : 'per hour'})`),
        ],
        rows: (data[0] as number[]).map((t, i) => [
          utcIso(t * 1000),
          ...data.slice(1).map((series) => (series as (number | null)[])[i] ?? null),
        ]),
      }
    : null;
  const digits = unit === 'year' ? 1 : 5;
  useUPlot(
    box,
    (width) => ({
      width,
      height: HEIGHT,
      legend: { live: true },
      scales: { x: { time: true } },
      series: [
        { label: 'UTC' },
        ...loaded.map((p) => ({
          label: p.label,
          stroke: pickColour(picks.indexOf(p)),
          width: 1.5,
          points: { show: false },
          value: (_u: uPlot, v: number | null) => (v === null ? '' : `${v.toFixed(digits)}%`),
        })),
      ],
      axes: [
        {},
        {
          size: 70,
          values: (_u: uPlot, t: number[]) =>
            t.map((v) => `${v.toFixed(unit === 'year' ? 0 : 4)}%`),
        },
      ],
    }),
    data,
    HEIGHT,
    `${loadedKey}|${days}|${unit}`
  );

  const errors = picks.filter((p) => failed.current.has(p.key));
  const pending = picks.filter((p) => !complete(p.key) && !failed.current.has(p.key));
  /** Whole days of the range loaded so far for one market. */
  const daysLoaded = (key: string): number => {
    const h = histories.current.get(key);
    if (!h) return 0;
    if (h.from <= since) return days;
    return Math.min(days, Math.floor((Date.now() - h.from) / DAY_MS));
  };
  // The page re-renders every second (useLiveClient), so the wait counts down.
  const progress =
    `Loading ${days} days: ${pending.map((p) => `${p.label} ${daysLoaded(p.key)}`).join(', ')} days so far.` +
    waitNote(client?.info.resumesAt ?? 0, Date.now());
  const rate = (h: number): string =>
    unit === 'year' ? pctSigned(h * HOURS_PER_YEAR, 1) : pctSigned(h, 5);

  return (
    <figure style={{ margin: '0.5rem 0 1.5rem' }}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Segmented
          label="History range"
          value={String(days)}
          options={COMPARE_DAYS.map((d) => ({ value: String(d), label: `${d} days` }))}
          onChange={(d) => setDays(COMPARE_DAYS.find((x) => String(x) === d) ?? days)}
        />
        {picks.map((p, i) => (
          <span
            key={p.key}
            className="inline-flex h-7 items-center gap-1 rounded-full border-2 pr-1 pl-2.5 text-xs font-medium"
            style={{ borderColor: pickColour(i) }}
          >
            {p.label}
            <button
              onClick={() => onRemove(p.key)}
              aria-label={`Remove ${p.label}`}
              className="size-5 rounded-full border-0 bg-transparent p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
      {!picks.length && (
        <p style={{ color: 'var(--muted-foreground)' }}>
          Tick markets in the table above to chart them.
        </p>
      )}
      {errors.map((p) => (
        <p key={p.key} style={{ color: 'var(--destructive)' }}>
          Could not load {p.label}: {failed.current.get(p.key)}
        </p>
      ))}
      {loaded.length > 0 && pending.length > 0 && (
        <p className="my-1 text-sm text-muted-foreground" role="status">
          {progress} The chart fills in from the left as it arrives.
        </p>
      )}
      {/* useUPlot keeps the last chart when there is no data: hide it rather than show removed markets. */}
      <ChartFrame
        id={CHART_ID.fundingCompare}
        title={`Funding history, ${unit === 'year' ? 'per year' : 'per hour'}, last ${days} days`}
        fileTag={loaded.map((p) => p.label).join('-')}
        table={table}
        embedParams={{ m: picks.map((p) => p.key).join(','), r: String(days), u: unit }}
        legend={loaded.map((p) => ({
          label: p.label,
          colour: pickColour(picks.indexOf(p)),
        }))}
        loading={!loaded.length && pending.length ? progress : ''}
        height={HEIGHT}
      >
        <div ref={box} style={{ width: '100%' }} hidden={!loaded.length} />
      </ChartFrame>
      {loaded.length > 0 && (
        <div {...tableBox()}>
          <table
            style={{
              borderCollapse: 'collapse',
              fontSize: '0.9em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <thead>
              <tr>
                {[
                  'Market',
                  'Average',
                  'Paid by a long over the period',
                  'Highest hour',
                  'Lowest hour',
                  'Hours',
                ].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: '0.2rem 0.6rem',
                      textAlign: i === 0 ? 'left' : 'right',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loaded.map((p) => {
                // While a market is still loading, its figures cover what has arrived,
                // and say so: the row is never empty, never mislabelled.
                const s = fundingStats(inRange(p.key));
                const cells = s
                  ? [
                      rate(s.averageHourly),
                      pctSigned(s.total, 3),
                      rate(s.highest),
                      rate(s.lowest),
                      String(s.hours),
                    ]
                  : [MISSING, MISSING, MISSING, MISSING, '0'];
                return (
                  <tr key={p.key}>
                    <td
                      style={{
                        padding: '0.2rem 0.6rem',
                        color: pickColour(picks.indexOf(p)),
                      }}
                    >
                      {p.label}
                      {!complete(p.key) && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {daysLoaded(p.key)} of {days} days so far
                        </span>
                      )}
                    </td>
                    {cells.map((c, i) => (
                      <td key={i} style={{ padding: '0.2rem 0.6rem', textAlign: 'right' }}>
                        {c}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <figcaption
        style={{ fontSize: '0.8em', color: 'var(--muted-foreground)', maxWidth: '50rem' }}
      >
        Hourly funding rate applied, {unit === 'year' ? 'per year (× 24 × 365)' : 'per hour'}, UTC,
        last {days} days. &quot;Paid by a long over the period&quot; is the sum of the hourly rates:
        the share of a long position&apos;s value paid in funding over those {days} days, if its
        value stayed the same (negative: received). A market listed during the period has fewer
        hours.
      </figcaption>
    </figure>
  );
}
