'use client';
/**
 * Open interest as a treemap (plan §3.3): one block per exchange, sized by its
 * open interest, split into one tile per live market. Hover names the market,
 * a click opens it. Layout: lib/oi/squarify.ts.
 */
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useWidth } from '@/lib/charts/use-width';
import { CHART_ID } from '@/lib/charts/chart-registry';
import { ChartTable } from '@/lib/charts/to-csv';
import { ChartFrame } from './chart-frame';
import { pct, usdCompact } from '@/lib/format/format';
import { MAIN_DEX } from '@/lib/hl/constants';
import { venueColours } from '@/lib/map/venue-colours';
import { OiRow } from '@/lib/oi/oi-board';
import { squarify } from '@/lib/oi/squarify';

const NARROW_PX = 560;
const HEADER_PX = 18;
const CHAR_PX = 7;
const venueName = (v: string): string => (v === MAIN_DEX ? 'main' : v);

export function OiTreemap({ rows, venues }: { rows: readonly OiRow[]; venues: readonly string[] }) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const width = useWidth(wrap);
  const height = width < NARROW_PX ? 360 : 480;
  const colours = venueColours(venues);
  const groups = venues
    .map((v) => ({ venue: v, rows: rows.filter((r) => r.venue === v && (r.oiUsd ?? 0) > 0) }))
    .filter((g) => g.rows.length);
  const blocks = squarify(
    groups.map((g) => g.rows.reduce((s, r) => s + (r.oiUsd ?? 0), 0)),
    { x: 0, y: 0, w: width, h: height }
  );

  const table: ChartTable = {
    columns: ['Exchange', 'Market', 'Open interest (USD)', 'Share of the exchange'],
    rows: groups.flatMap((g) =>
      g.rows.map((r) => [venueName(g.venue), r.name, r.oiUsd, r.venueShare])
    ),
  };
  return (
    <ChartFrame
      id={CHART_ID.oiTreemap}
      title="Open interest by exchange and market"
      table={table}
      legend={groups.map((g) => ({
        label: venueName(g.venue),
        colour: colours.get(g.venue) ?? '#888',
      }))}
    >
      <div ref={wrap} style={{ width: '100%' }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label="Open interest by exchange and market"
            style={{ display: 'block' }}
          >
            {groups.map((g, gi) => {
              const b = blocks[gi];
              const header = b.h > 3 * HEADER_PX && b.w > 60 ? HEADER_PX : 0;
              const tiles = squarify(
                g.rows.map((r) => r.oiUsd ?? 0),
                { x: b.x + 1, y: b.y + header + 1, w: b.w - 2, h: b.h - header - 2 }
              );
              const colour = colours.get(g.venue) ?? '#888';
              return (
                <g key={g.venue}>
                  <rect
                    x={b.x}
                    y={b.y}
                    width={b.w}
                    height={b.h}
                    fill="#fff"
                    stroke="#333"
                    className="fill-background stroke-foreground/40"
                  />
                  {header > 0 && (
                    <text x={b.x + 4} y={b.y + 13} fontSize={12} fontWeight={600}>
                      {venueName(g.venue)}{' '}
                      {usdCompact(g.rows.reduce((s, r) => s + (r.oiUsd ?? 0), 0))}
                    </text>
                  )}
                  {g.rows.map((r, i) => {
                    const t = tiles[i];
                    const fits = t.w > r.name.length * CHAR_PX + 6 && t.h > 16;
                    return (
                      <g
                        key={r.key}
                        style={{ cursor: 'pointer' }}
                        onClick={() => router.push(r.href)}
                      >
                        <title>
                          {`${r.name} (${venueName(r.venue)}): open interest ${usdCompact(r.oiUsd)}, ${pct(r.venueShare, 1)} of the exchange`}
                        </title>
                        <rect
                          x={t.x}
                          y={t.y}
                          width={Math.max(0, t.w)}
                          height={Math.max(0, t.h)}
                          fill={colour}
                          fillOpacity={0.8}
                          stroke="#fff"
                        />
                        {fits && (
                          <text x={t.x + 4} y={t.y + 13} fontSize={11} fill="#fff">
                            {r.name}
                          </text>
                        )}
                        {fits && t.h > 32 && (
                          <text x={t.x + 4} y={t.y + 26} fontSize={10} fill="#fff">
                            {usdCompact(r.oiUsd)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </ChartFrame>
  );
}
