'use client';

import { useEffect, useState } from 'react';
import { FEED } from '@/lib/hl/constants';
import { L2Book } from '@/lib/hl/types';
import { getLiveClient } from '@/lib/live/get-live-client';
import { MarketNotLiveError } from '@/lib/live/live-client';

const BOOK_COIN = 'BTC';

export function LiveClientCheck() {
  const [, setTick] = useState(0);
  const [startError, setStartError] = useState('');
  const [book, setBook] = useState<{ messages: number; bid: string; ask: string } | null>(null);
  const [guard, setGuard] = useState('');
  // Rendered only after mounting: there is no client during the static build.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const client = getLiveClient();
    const offStore = client.store.subscribe(() => setTick((t) => t + 1));
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    let offBook: (() => void) | null = null;
    let messages = 0;
    client
      .start()
      .then(() => {
        offBook = client.subscribeCoin({ type: FEED.l2Book, coin: BOOK_COIN }, (data) => {
          const b = data as L2Book;
          messages += 1;
          setBook({ messages, bid: b.levels[0][0]?.px ?? '', ask: b.levels[1][0]?.px ?? '' });
        });
        const dead = [...client.universe.perps.values()].flat().find((m) => m.isDelisted);
        if (dead) {
          try {
            client.subscribeCoin({ type: FEED.l2Book, coin: dead.name }, () => undefined);
            setGuard(`❌ ${dead.name} (delisted) was subscribed`);
          } catch (e) {
            setGuard(
              e instanceof MarketNotLiveError
                ? `✅ ${dead.name} (delisted) was refused before reaching Hyperliquid`
                : `❌ ${String(e)}`
            );
          }
        }
      })
      .catch((e: unknown) => setStartError(String(e)));
    // The client lives as long as the tab (shared by every page); only this page's interest ends.
    return () => {
      offStore();
      clearInterval(timer);
      offBook?.();
    };
  }, []);

  if (!mounted) return null;
  const client = getLiveClient();
  const perps = client.store.perps();
  const btc = client.store.perp('BTC');
  const btcTick = client.store.tick('BTC');
  const dexes = client.universe.liveDexes();

  return (
    <>
      {startError && <p style={{ color: 'crimson' }}>Could not start: {startError}</p>}
      <p>
        Status: <b>{client.status()}</b> (what the header will show)
      </p>
      <h2>Exchanges with live markets</h2>
      <ul>
        {dexes.map((d) => {
          const rows = perps.filter((r) => r.dex === d);
          return (
            <li key={d || 'main'}>
              {d || 'main exchange'}: row check{' '}
              <b>{client.store.dexState.get(d) ?? 'not started'}</b>,{' '}
              {rows.filter((r) => !r.market.isDelisted).length} live markets labelled
            </li>
          );
        })}
      </ul>
      <h2>BTC</h2>
      <p>
        {btc
          ? `context: mark ${btc.ctx.markPx}, funding ${(Number(btc.ctx.funding) * 100).toFixed(4)}%/h, open interest ${Number(btc.ctx.openInterest).toFixed(0)} BTC, ${Math.round((Date.now() - btc.ctxAt) / 1000)} s ago`
          : 'context: waiting for the row check'}
        <br />
        {btcTick
          ? `price tick: mark ${btcTick.markPx}, ${Math.round((Date.now() - btcTick.at) / 1000)} s ago`
          : 'price tick: waiting'}
        <br />
        {book
          ? `book (shared per-coin connection): best ${book.bid} / ${book.ask}, ${book.messages} updates`
          : 'book: waiting'}
      </p>
      <h2>Dead-market guard</h2>
      <p>{guard || 'waiting for the market list'}</p>
      <h2>Problems</h2>
      {client.problems.length ? (
        <ul>
          {client.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : (
        <p>none</p>
      )}
    </>
  );
}
