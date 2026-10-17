'use client';
/**
 * Price candles (plan §3.3): history from candleSnapshot through the tab's
 * queue, then the live candle feed on the shared per-coin connection. A market
 * that is not live (delisted) shows its history without live updates.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type uPlot from 'uplot';
import { FEED, INFO } from '@/lib/hl/constants';
import { Candle } from '@/lib/hl/types';
import { candlesPlugin } from '@/lib/charts/candles-plugin';
import { mergeCandle } from '@/lib/charts/merge-candle';
import { useUPlot } from '@/lib/charts/use-uplot';
import { price } from '@/lib/format/format';
import { MarketNotLiveError } from '@/lib/live/live-client';
import { useLiveClient } from '@/lib/live/use-live-client';
import { waitNote } from '@/lib/live/wait-note';
import { CHART_ID } from '@/lib/charts/chart-registry';
import { DEFAULT_PRICE_INTERVAL, PRICE_INTERVALS, PriceInterval } from '@/lib/charts/ranges';
import { ChartTable, utcIso } from '@/lib/charts/to-csv';
import { ChartFrame } from './chart-frame';
import { Segmented } from './segmented';

const HEIGHT = 340;

/** `label`: the market's display name (spot pairs are "@107" to the API). */
export function PriceChart({
  coin,
  label,
  initialInterval = DEFAULT_PRICE_INTERVAL,
}: {
  coin: string;
  label?: string;
  initialInterval?: PriceInterval;
}) {
  const { client } = useLiveClient();
  const [interval, setInterval_] = useState<PriceInterval>(initialInterval);
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [note, setNote] = useState('');
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!client) return;
    let stopped = false;
    let off: (() => void) | null = null;
    setCandles(null);
    setNote('');
    const now = Date.now();
    client
      .start()
      .then(() =>
        client.info.request<Candle[]>({
          type: INFO.candleSnapshot,
          req: { coin, interval: interval.id, startTime: now - interval.span, endTime: now },
        })
      )
      .then((history) => {
        if (stopped) return;
        setCandles(history);
        try {
          off = client.subscribeCoin({ type: FEED.candle, coin, interval: interval.id }, (c) =>
            setCandles((prev) => (prev ? mergeCandle(prev, c as Candle) : prev))
          );
        } catch (e) {
          if (e instanceof MarketNotLiveError) setNote('History only: the market is not live.');
          else throw e;
        }
      })
      .catch((e: unknown) => !stopped && setNote(`Could not load candles: ${String(e)}`));
    return () => {
      stopped = true;
      off?.();
    };
  }, [client, coin, interval]);

  const data = useMemo<uPlot.AlignedData | null>(
    () =>
      candles && candles.length
        ? [
            candles.map((c) => c.t / 1000),
            candles.map((c) => Number(c.o)),
            candles.map((c) => Number(c.h)),
            candles.map((c) => Number(c.l)),
            candles.map((c) => Number(c.c)),
          ]
        : null,
    [candles]
  );

  useUPlot(
    box,
    (width) => ({
      width,
      height: HEIGHT,
      plugins: [candlesPlugin()],
      legend: { live: true },
      cursor: { drag: { x: true, y: false } },
      scales: { x: { time: true } },
      series: [
        { label: 'UTC' },
        ...['Open', 'High', 'Low', 'Close'].map((label) => ({
          label,
          paths: () => null,
          points: { show: false },
          value: (_u: uPlot, v: number | null) => (v === null ? '' : price(v)),
        })),
      ],
      axes: [{}, { values: (_u: uPlot, ticks: number[]) => ticks.map((t) => price(t)), size: 70 }],
    }),
    data,
    HEIGHT,
    interval.id
  );

  const name = label ?? coin;
  const table: ChartTable | null = candles
    ? {
        columns: ['Time (UTC)', 'Open', 'High', 'Low', 'Close', 'Volume'],
        rows: candles.map((c) => [
          utcIso(c.t),
          Number(c.o),
          Number(c.h),
          Number(c.l),
          Number(c.c),
          Number(c.v),
        ]),
      }
    : null;
  return (
    <div style={{ margin: '0.5rem 0 0' }}>
      <Segmented
        label="Candle interval"
        value={interval.id}
        options={PRICE_INTERVALS.map((iv) => ({ value: iv.id, label: iv.label }))}
        onChange={(id) => setInterval_(PRICE_INTERVALS.find((iv) => iv.id === id) ?? interval)}
        className="mb-2"
      />
      {!data && (note || candles) && (
        <p style={{ color: 'var(--muted-foreground)' }}>{note || 'No trades in this range.'}</p>
      )}
      <ChartFrame
        id={CHART_ID.marketPrice}
        title={`${name} price, ${interval.axis}`}
        fileTag={`${name}-${interval.id}`}
        table={table}
        embedParams={{ m: coin, r: interval.id }}
        loading={
          candles === null && !note
            ? `Loading candles…${waitNote(client?.info.resumesAt ?? 0, Date.now())}`
            : ''
        }
        height={HEIGHT}
      >
        <div ref={box} style={{ width: '100%' }} />
        <p style={{ fontSize: '0.8em', color: 'var(--muted-foreground)', margin: '0.2rem 0 0' }}>
          {interval.axis}, trade prices, UTC. {note && data ? note : ''}
        </p>
      </ChartFrame>
    </div>
  );
}
