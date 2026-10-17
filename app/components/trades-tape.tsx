'use client';
/**
 * The latest trades of one market, from the shared per-coin connection.
 * Shows the taker's side ('B' fills at the ask: a taker buy; checked against
 * the live BTC book 2026-10-04, 155 of 155), price, size and time. Each trade
 * also carries both traders' addresses; they are never shown (plan §8).
 */
import { useEffect, useState } from 'react';
import { FEED } from '@/lib/hl/constants';
import { price, usdCompact } from '@/lib/format/format';
import { MarketNotLiveError } from '@/lib/live/live-client';
import { useLiveClient } from '@/lib/live/use-live-client';

const KEEP = 30;

interface Trade {
  side: 'B' | 'A';
  px: string;
  sz: string;
  time: number;
  tid: number;
}

export function TradesTape({ coin }: { coin: string }) {
  const { client } = useLiveClient();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!client) return;
    let off: (() => void) | null = null;
    let stopped = false;
    client
      .start()
      .then(() => {
        if (stopped) return;
        try {
          off = client.subscribeCoin({ type: FEED.trades, coin }, (data) => {
            const fresh = (data as Trade[]).map(({ side, px, sz, time, tid }) => ({
              side,
              px,
              sz,
              time,
              tid,
            }));
            setTrades((prev) => {
              const byTid = new Map([...prev, ...fresh].map((t) => [t.tid, t]));
              return [...byTid.values()]
                .sort((a, b) => b.time - a.time || b.tid - a.tid)
                .slice(0, KEEP);
            });
          });
        } catch (e) {
          setNote(e instanceof MarketNotLiveError ? 'Not trading: no live trades.' : String(e));
        }
      })
      .catch((e: unknown) => setNote(String(e)));
    return () => {
      stopped = true;
      off?.();
    };
  }, [client, coin]);

  if (note) return <p style={{ color: 'var(--muted-foreground)' }}>{note}</p>;
  if (!trades.length)
    return <p style={{ color: 'var(--muted-foreground)' }}>Waiting for trades…</p>;
  const td = {
    padding: '0.15rem 0.6rem',
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums' as const,
  };
  return (
    <table style={{ borderCollapse: 'collapse', fontSize: '0.85em' }}>
      <thead>
        <tr>
          {['Time (UTC)', 'Taker', 'Price', 'Size', 'Value'].map((h) => (
            <th key={h} style={{ ...td, borderBottom: '1px solid var(--border)' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {trades.map((t) => (
          <tr key={t.tid}>
            <td style={td}>{new Date(t.time).toISOString().slice(11, 19)}</td>
            <td style={{ ...td, color: t.side === 'B' ? 'var(--positive)' : 'var(--destructive)' }}>
              {t.side === 'B' ? 'buy' : 'sell'}
            </td>
            <td style={td}>{price(Number(t.px))}</td>
            <td style={td}>{t.sz}</td>
            <td style={td}>{usdCompact(Number(t.px) * Number(t.sz))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
