'use client';
/**
 * The worked example on /methodology (plan §3.3): trade.xyz's open interest,
 * counted by the definition above it, live, so the definition and the number
 * can be checked against each other.
 */
import { usdCompact } from '@/lib/format/format';
import { useMarketRows } from '@/lib/markets/use-market-rows';

const EXAMPLE_DEX = 'xyz';
const SHOWN = 5;

export function WorkedExample() {
  const { client, rows, ready } = useMarketRows();
  if (!client) return null;
  if (!ready)
    return (
      <p style={{ color: 'var(--muted-foreground)' }}>Waiting for Hyperliquid&apos;s live data…</p>
    );
  const live = rows
    .filter((r) => r.kind === 'perp' && !r.delisted && r.venue === EXAMPLE_DEX)
    .sort((a, b) => (b.oiUsd ?? 0) - (a.oiUsd ?? 0));
  const total = live.reduce((s, r) => s + (r.oiUsd ?? 0), 0);
  if (!live.length) return <p>xyz has no live markets right now.</p>;
  const td = {
    padding: '0.15rem 0.6rem',
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums' as const,
  };
  return (
    <div style={{ background: 'var(--muted)', padding: '0.6rem 0.9rem', maxWidth: '46rem' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: '0.9em' }}>
        <thead>
          <tr>
            {['Market', 'openInterest (contracts)', '× mark price', '= open interest'].map(
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
          {live.slice(0, SHOWN).map((r) => (
            <tr key={r.key}>
              <td style={{ ...td, textAlign: 'left' }}>{r.name}</td>
              <td style={td}>
                {(r.oiCoins ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </td>
              <td style={td}>{r.markPx.toLocaleString('en-US', { maximumFractionDigits: 4 })}</td>
              <td style={td}>{usdCompact(r.oiUsd)}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...td, textAlign: 'left' }} colSpan={3}>
              … and {live.length - Math.min(SHOWN, live.length)} more live markets; total
            </td>
            <td style={{ ...td, fontWeight: 700 }}>{usdCompact(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
