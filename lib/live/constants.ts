/**
 * Limits of the live-data client (docs/hlcharts-website.md §3.2). The
 * websocket figures restate the collectors' (src/hlcharts/constants.ts), which
 * were learned the hard way; the site cannot import them, as it will move to
 * its own repository.
 */

/** Hyperliquid allows 1,200 weight a minute per IP; one tab spends at most half, leaving room for other tabs and other people behind the same IP. */
export const REST_WEIGHT_BUDGET = 600;
export const REST_WINDOW_MS = 60_000;
/** Weight of an info request (Hyperliquid's docs); a few cheap ones are 2. */
export const INFO_WEIGHT_DEFAULT = 20;
export const INFO_WEIGHT_CHEAP: Readonly<Record<string, number>> = {
  l2Book: 2,
  allMids: 2,
  clearinghouseState: 2,
  orderStatus: 2,
  spotClearinghouseState: 2,
  exchangeStatus: 2,
};
/** Extra weight charged after the reply: one unit per this many items returned. */
export const INFO_EXTRA_PER_ITEMS: Readonly<Record<string, number>> = {
  candleSnapshot: 60,
  fundingHistory: 20,
};
/** After a 429 every request waits this long, doubling on each further 429. */
export const RATE_LIMIT_PAUSE_MIN_MS = 10_000;
export const RATE_LIMIT_PAUSE_MAX_MS = 120_000;
/** A request refused this many times in a row fails, instead of retrying forever. */
export const REST_MAX_ATTEMPTS = 4;

/** REST snapshots are reused for this long, also across pages (sessionStorage). */
export const SNAPSHOT_TTL_MS = 60_000;

/** Ping well inside the server's 60 s idle timeout. */
export const WS_PING_INTERVAL_MS = 30_000;
/** A connection silent this long is treated as dead and rebuilt. */
export const WS_SILENCE_LIMIT_MS = 90_000;
export const WS_RECONNECT_MIN_MS = 1_000;
export const WS_RECONNECT_MAX_MS = 60_000;
/** The reconnect delay resets only after a connection has stayed up this long (resetting on open let flapping connections hammer the limits, 2026-09-28). */
export const WS_STABLE_AFTER_MS = 60_000;
/** Pause between subscribe messages, so a reconnect re-subscribes gradually. */
export const WS_SUBSCRIBE_GAP_MS = 100;
/** New connections per minute from one tab; Hyperliquid allows 30 per IP. */
export const WS_CONNECT_CAP_PER_MIN = 10;

/** A live context row and the REST snapshot agree within this when they are the same market. */
export const ROW_ORDER_TOLERANCE = 0.005;
/** Share of an exchange's rows that must agree, or its rows are not labelled at all. */
export const ROW_ORDER_MIN_MATCH = 0.95;

/** The market list is re-read this often (listings, delistings, caps). */
export const UNIVERSE_REFRESH_MS = 5 * 60_000;
/** While the all-market connection is down this long, contexts are polled over REST instead. */
export const FALLBACK_AFTER_MS = 30_000;
export const FALLBACK_POLL_MS = 60_000;
/** Listeners are told about market changes at most this often (rendering more is wasted). */
export const NOTIFY_INTERVAL_MS = 1_000;

export const LIVE_STATUS = {
  connecting: 'connecting',
  live: 'live',
  /** Hyperliquid refused us (429 or refused sockets): slow polling, said in the header. */
  limited: 'limited',
  offline: 'offline',
} as const;
export type LiveStatus = (typeof LIVE_STATUS)[keyof typeof LIVE_STATUS];
