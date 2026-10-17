'use client';
/**
 * The home page's market map (plan §3.3): every live perp by 24 h volume and
 * impact spread, bubble area by open interest, colour by exchange. Hover shows
 * the market; a click opens it. Drawn as SVG: a few hundred circles, with
 * layout and hover targeting in tested functions (`lib/map/`).
 */
import { useRouter } from 'next/navigation';
import { type MouseEvent, useRef, useState } from 'react';
import { useWidth } from '@/lib/charts/use-width';
import { CHART_ID } from '@/lib/charts/chart-registry';
import { ChartTable } from '@/lib/charts/to-csv';
import { ChartFrame } from './chart-frame';
import { usdCompact } from '@/lib/format/format';
import { MAIN_DEX } from '@/lib/hl/constants';
import { MapPoint, mapPoints } from '@/lib/map/map-points';
import { nearestPoint } from '@/lib/map/nearest-point';
import { venueColours } from '@/lib/map/venue-colours';
import { MarketRow } from '@/lib/markets/types';

const PAD = { left: 52, right: 16, top: 10, bottom: 28 };
const HOVER_REACH_PX = 10;
const MIN_LABEL_GAP_PX = 52;
const NARROW_PX = 560;
const tickNumber = new Intl.NumberFormat('en-US', { notation: 'compact' });
const venueName = (v: string): string => (v === MAIN_DEX ? 'main' : v);
const spreadText = (s: number): string => `${s.toFixed(s < 10 ? 2 : 0)} bp`;

export function MarketMap({
  rows,
  venues,
}: {
  rows: readonly MarketRow[];
  venues: readonly string[];
}) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const width = useWidth(wrap);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const height = width < NARROW_PX ? 300 : 400;
  const map =
    width > 0
      ? mapPoints(rows, {
          left: PAD.left,
          right: width - PAD.right,
          top: PAD.top,
          bottom: height - PAD.bottom,
        })
      : null;
  const colours = venueColours(venues);
  const hovered = map?.points.find((p) => p.key === hoverKey) ?? null;

  const under = (e: MouseEvent<SVGSVGElement>): MapPoint | null => {
    if (!map) return null;
    const box = e.currentTarget.getBoundingClientRect();
    return nearestPoint(map.points, e.clientX - box.left, e.clientY - box.top, HOVER_REACH_PX);
  };

  const counts = new Map<string, number>();
  for (const p of map?.points ?? []) counts.set(p.venue, (counts.get(p.venue) ?? 0) + 1);
  const xStep = map && (map.x.pos(10) - map.x.pos(1) < MIN_LABEL_GAP_PX ? 2 : 1);

  const table: ChartTable | null = map
    ? {
        columns: [
          'Market',
          'Exchange',
          'Volume 24 h (USD)',
          'Impact spread (bp)',
          'Open interest (USD)',
        ],
        rows: map.points.map((p) => [
          p.name,
          venueName(p.venue),
          p.volume24h,
          p.spreadBps,
          p.oiUsd,
        ]),
      }
    : null;
  return (
    <ChartFrame
      id={CHART_ID.marketsMap}
      title="Market map: 24-hour volume against impact spread"
      table={table}
      legend={venues
        .filter((v) => counts.has(v))
        .map((v) => ({ label: venueName(v), colour: colours.get(v) ?? '#888' }))}
    >
      <section>
        <div ref={wrap} style={{ position: 'relative', width: '100%' }}>
          {width > 0 && !map && (
            <p style={{ color: 'var(--muted-foreground)' }}>No market to place yet.</p>
          )}
          {map && (
            <svg
              width={width}
              height={height}
              role="img"
              aria-label={`Market map: ${map.points.length} perps by 24-hour volume and impact spread`}
              style={{
                display: 'block',
                overflow: 'visible',
                cursor: hovered ? 'pointer' : 'default',
              }}
              onMouseMove={(e) => setHoverKey(under(e)?.key ?? null)}
              onMouseLeave={() => setHoverKey(null)}
              onClick={(e) => {
                const p = under(e);
                if (p) router.push(p.href);
              }}
            >
              {map.x.ticks.map((t, i) => (
                <g key={`x${t}`}>
                  <line
                    x1={map.x.pos(t)}
                    x2={map.x.pos(t)}
                    y1={PAD.top}
                    y2={height - PAD.bottom}
                    stroke="#e6e6e6"
                    className="stroke-border"
                  />
                  {i % (xStep ?? 1) === 0 && (
                    <text
                      x={map.x.pos(t)}
                      y={height - PAD.bottom + 16}
                      textAnchor="middle"
                      fontSize={11}
                      fill="#555"
                      className="fill-muted-foreground"
                    >
                      ${tickNumber.format(t)}
                    </text>
                  )}
                </g>
              ))}
              {map.y.ticks.map((t) => (
                <g key={`y${t}`}>
                  <line
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={map.y.pos(t)}
                    y2={map.y.pos(t)}
                    stroke="#e6e6e6"
                    className="stroke-border"
                  />
                  <text
                    x={PAD.left - 6}
                    y={map.y.pos(t) + 4}
                    textAnchor="end"
                    fontSize={11}
                    fill="#555"
                    className="fill-muted-foreground"
                  >
                    {t} bp
                  </text>
                </g>
              ))}
              {map.points.map((p) => (
                <circle
                  key={p.key}
                  cx={p.x}
                  cy={p.y}
                  r={p.r}
                  fill={colours.get(p.venue) ?? '#888'}
                  fillOpacity={0.45}
                  stroke={p.key === hoverKey ? 'currentColor' : (colours.get(p.venue) ?? '#888')}
                  strokeWidth={p.key === hoverKey ? 2 : 1}
                />
              ))}
            </svg>
          )}
          {map && hovered && (
            <div
              style={{
                position: 'absolute',
                left: Math.min(hovered.x + hovered.r + 8, width - 190),
                top: Math.max(hovered.y - 30, 0),
                pointerEvents: 'none',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: '0.3rem 0.5rem',
                fontSize: '0.8em',
                lineHeight: 1.4,
                boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                width: 180,
              }}
            >
              <b>{hovered.name}</b>{' '}
              <span style={{ color: 'var(--muted-foreground)' }}>{venueName(hovered.venue)}</span>
              <br />
              Volume 24 h {usdCompact(hovered.volume24h)}
              <br />
              Impact spread {spreadText(hovered.spreadBps)}
              <br />
              Open interest {usdCompact(hovered.oiUsd)}
            </div>
          )}
        </div>
        {map && (
          <>
            <p style={{ display: 'flex', flexWrap: 'wrap', gap: '0.9rem', margin: '0.3rem 0' }}>
              {venues
                .filter((v) => counts.has(v))
                .map((v) => (
                  <span key={v} style={{ fontSize: '0.85em' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: colours.get(v),
                        marginRight: 4,
                      }}
                    />
                    {venueName(v)} ({counts.get(v)})
                  </span>
                ))}
            </p>
            <p
              style={{
                fontSize: '0.75em',
                color: 'var(--muted-foreground)',
                maxWidth: '50rem',
                marginTop: 0,
              }}
            >
              Every live perp by 24-hour volume (across) and impact spread (up). The impact spread
              is the gap between the average prices to buy and to sell a set size at once, as a
              share of their midpoint: what buying and immediately selling that size costs, before
              fees. Hyperliquid sets the size at $20,000 for BTC and ETH and $6,000 for other
              main-exchange perps; builder exchanges do not publish theirs, so their spreads may not
              compare exactly with the main exchange&apos;s. Both scales are logarithmic: each
              gridline is ten times the one before. Bubble area is open interest (largest{' '}
              {usdCompact(map.maxOi)}); markets under {usdCompact(map.floorOi)} share the smallest
              dot. Click a bubble to open its market.
              {map.noVolume + map.noSpread > 0 &&
                ` Not shown: ${[
                  map.noVolume ? `${map.noVolume} with no trade in 24 hours` : '',
                  map.noSpread ? `${map.noSpread} without impact prices` : '',
                ]
                  .filter(Boolean)
                  .join(', ')}.`}
            </p>
          </>
        )}
      </section>
    </ChartFrame>
  );
}
