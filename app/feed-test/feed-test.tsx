'use client';

import { useEffect, useRef, useState } from 'react';
import { BOOK_COARSE_N_SIG_FIGS, FEED, HL_WS_URL, INFO, MAIN_DEX } from '@/lib/hl/constants';
import { decodeFastAssetCtxs } from '@/lib/hl/decode-fast-asset-ctxs';
import { postInfo } from '@/lib/hl/post-info';
import { AllDexsAssetCtxs, L2Book, MetaAndAssetCtxs, WsMessage } from '@/lib/hl/types';

const BOOK_COIN = 'BTC';
/** A live row and the REST snapshot taken seconds earlier agree within this when they are the same market. */
const SAME_MARKET_TOLERANCE = 0.005;

type Status = 'connecting' | 'live' | 'error' | 'closed';
interface Check {
  label: string;
  status: Status;
  messages: number;
  firstAt: number | null;
  lastAt: number | null;
  detail: string;
}
type CheckKey = 'rest' | 'allDexs' | 'fast' | 'book';

const fresh = (label: string): Check => ({
  label,
  status: 'connecting',
  messages: 0,
  firstAt: null,
  lastAt: null,
  detail: '',
});

const pct = (x: number, digits = 2): string => `${(x * 100).toFixed(digits)}%`;

export function FeedTest() {
  const checks = useRef<Record<CheckKey, Check>>({
    rest: fresh('REST snapshot (metaAndAssetCtxs)'),
    allDexs: fresh('All-market contexts (allDexsAssetCtxs)'),
    fast: fresh('Price ticks (fastAssetCtxs, compressed)'),
    book: fresh(`Wide order book (l2Book ${BOOK_COIN}, nSigFigs ${BOOK_COARSE_N_SIG_FIGS})`),
  });
  const snapshot = useRef<MetaAndAssetCtxs | null>(null);
  const orderMatch = useRef<{ matched: number; total: number } | null>(null);
  const bookRange = useRef<{ below: number; above: number } | null>(null);
  const [now, setNow] = useState(0);
  const [browser, setBrowser] = useState('');

  useEffect(() => {
    const c = checks.current;
    let stopped = false;
    setBrowser(navigator.userAgent);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const seen = (k: CheckKey, detail: string): void => {
      const t = Date.now();
      c[k].status = 'live';
      c[k].messages += 1;
      c[k].firstAt ??= t;
      c[k].lastAt = t;
      c[k].detail = detail;
    };
    const fail = (k: CheckKey, detail: string): void => {
      c[k].status = 'error';
      c[k].detail = detail;
    };

    const t0 = performance.now();
    postInfo<MetaAndAssetCtxs>({ type: INFO.metaAndAssetCtxs })
      .then((r) => {
        snapshot.current = r;
        seen(
          'rest',
          `${r[0].universe.length} main-exchange markets in ${Math.round(performance.now() - t0)} ms`
        );
      })
      .catch((e: unknown) => fail('rest', String(e)));

    const onAllDexs = (data: AllDexsAssetCtxs): void => {
      const rows = data.ctxs.reduce((n, [, r]) => n + r.length, 0);
      const main = data.ctxs.find(([dex]) => dex === MAIN_DEX)?.[1] ?? [];
      let order = 'waiting for the REST snapshot to check row order';
      const snap = snapshot.current;
      if (snap) {
        const [meta, ctxs] = snap;
        let matched = 0;
        main.forEach((row, i) => {
          const a = Number(row.markPx);
          const b = Number(ctxs[i]?.markPx);
          if (b > 0 && Math.abs(a / b - 1) <= SAME_MARKET_TOLERANCE) matched += 1;
        });
        orderMatch.current = { matched, total: main.length };
        const btc = meta.universe.findIndex((u) => u.name === 'BTC');
        const row = main[btc];
        order =
          `rows in market-list order: ${matched} of ${main.length} match the snapshot` +
          (main.length === meta.universe.length ? '' : ` (list has ${meta.universe.length})`) +
          (row
            ? `; BTC mark ${row.markPx}, funding ${pct(Number(row.funding), 4)}/h, open interest ${Number(row.openInterest).toFixed(0)} BTC`
            : '');
      }
      seen('allDexs', `${data.ctxs.length} exchanges, ${rows} markets; ${order}`);
    };

    const onFast = (data: unknown): void => {
      decodeFastAssetCtxs(data)
        .then((ticks) => {
          const coins = Object.keys(ticks).length;
          const btc = ticks.BTC?.markPx;
          seen('fast', `${coins} markets in the last message${btc ? `; BTC mark ${btc}` : ''}`);
        })
        .catch((e: unknown) => fail('fast', `could not decode: ${String(e)}`));
    };

    const onBook = (data: L2Book): void => {
      const [bids, asks] = data.levels;
      const bestBid = Number(bids[0]?.px);
      const bestAsk = Number(asks[0]?.px);
      const mid = (bestBid + bestAsk) / 2;
      const below = (mid - Number(bids[bids.length - 1]?.px)) / mid;
      const above = (Number(asks[asks.length - 1]?.px) - mid) / mid;
      bookRange.current = { below, above };
      seen(
        'book',
        `${bids.length} bid and ${asks.length} ask levels; best ${bestBid} / ${bestAsk}; reaches ${pct(below)} below and ${pct(above)} above the mid`
      );
    };

    const open = (keys: CheckKey[], subs: Record<string, unknown>[]): WebSocket => {
      const ws = new WebSocket(HL_WS_URL);
      ws.onopen = () =>
        subs.forEach((s) => ws.send(JSON.stringify({ method: 'subscribe', subscription: s })));
      ws.onmessage = (ev: MessageEvent<string>) => {
        const m = JSON.parse(ev.data) as WsMessage;
        if (m.channel === FEED.allDexsAssetCtxs) onAllDexs(m.data as AllDexsAssetCtxs);
        else if (m.channel === FEED.fastAssetCtxs) onFast(m.data);
        else if (m.channel === FEED.l2Book) onBook(m.data as L2Book);
        else if (m.channel === 'error')
          keys.forEach((k) => fail(k, `Hyperliquid refused: ${JSON.stringify(m.data)}`));
      };
      ws.onerror = () => keys.forEach((k) => fail(k, 'connection error'));
      ws.onclose = (ev) => {
        if (stopped) return;
        keys.forEach((k) => {
          c[k].status = 'closed';
          c[k].detail =
            `connection closed (code ${ev.code}${ev.reason ? `, ${ev.reason}` : ''}); ${c[k].detail}`;
        });
      };
      return ws;
    };
    const markets = open(
      ['allDexs', 'fast'],
      [{ type: FEED.allDexsAssetCtxs }, { type: FEED.fastAssetCtxs }]
    );
    const book = open(
      ['book'],
      [{ type: FEED.l2Book, coin: BOOK_COIN, nSigFigs: BOOK_COARSE_N_SIG_FIGS }]
    );

    return () => {
      stopped = true;
      clearInterval(timer);
      markets.close();
      book.close();
    };
  }, []);

  const c = checks.current;
  const order = orderMatch.current;
  const range = bookRange.current;
  const verdicts: [string, boolean | null][] = [
    [
      'Hyperliquid answers this page from the browser (REST)',
      c.rest.status === 'live' ? true : c.rest.status === 'error' ? false : null,
    ],
    [
      'All-market contexts arrive',
      c.allDexs.messages > 0 ? true : c.allDexs.status === 'connecting' ? null : false,
    ],
    [
      'Their unnamed rows follow the market list (needed to label every number)',
      order ? order.matched >= order.total * 0.95 : null,
    ],
    [
      'Price ticks arrive and decode in this browser',
      c.fast.messages > 0 ? true : c.fast.status === 'connecting' ? null : false,
    ],
    [
      'The wide book reaches at least 1% on each side',
      range ? range.below >= 0.01 && range.above >= 0.01 : null,
    ],
  ];

  return (
    <>
      <table style={{ borderCollapse: 'collapse', margin: '1rem 0' }}>
        <thead>
          <tr>
            {['Feed', 'Status', 'Messages', 'Last update', 'Every', 'What arrived'].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: 'left',
                  padding: '0.3rem 0.8rem',
                  borderBottom: '1px solid #999',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(Object.keys(c) as CheckKey[]).map((k) => {
            const x = c[k];
            const every =
              x.messages > 1 && x.firstAt && x.lastAt
                ? `${((x.lastAt - x.firstAt) / 1000 / (x.messages - 1)).toFixed(1)} s`
                : '';
            return (
              <tr key={k} style={{ verticalAlign: 'top' }}>
                <td style={{ padding: '0.3rem 0.8rem' }}>{x.label}</td>
                <td
                  style={{
                    padding: '0.3rem 0.8rem',
                    fontWeight: 600,
                    color:
                      x.status === 'live'
                        ? 'green'
                        : x.status === 'connecting'
                          ? '#a60'
                          : 'crimson',
                  }}
                >
                  {x.status}
                </td>
                <td style={{ padding: '0.3rem 0.8rem' }}>{x.messages}</td>
                <td style={{ padding: '0.3rem 0.8rem' }}>
                  {x.lastAt && now
                    ? `${Math.max(0, Math.round((now - x.lastAt) / 1000))} s ago`
                    : ''}
                </td>
                <td style={{ padding: '0.3rem 0.8rem' }}>{every}</td>
                <td style={{ padding: '0.3rem 0.8rem', maxWidth: '40rem' }}>{x.detail}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h2>Verdict</h2>
      <ul>
        {verdicts.map(([text, ok]) => (
          <li key={text}>
            {ok === null ? '… ' : ok ? '✅ ' : '❌ '}
            {text}
          </li>
        ))}
      </ul>
      <p style={{ color: '#666', fontSize: '0.9em' }}>Browser: {browser}</p>
    </>
  );
}
