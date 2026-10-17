/**
 * One websocket to Hyperliquid that stays up: it re-subscribes after every
 * reconnect, gradually (WS_SUBSCRIBE_GAP_MS apart); pings every 30 s; treats
 * 90 s of silence as dead; reconnects after 1 s doubling to 60 s, and resets
 * that delay only after the connection has stayed up 60 s. Each rule is one
 * the collectors learned from a reconnect storm (src/hlcharts/clients/ws-feed.ts).
 */
import {
  WS_PING_INTERVAL_MS,
  WS_RECONNECT_MAX_MS,
  WS_RECONNECT_MIN_MS,
  WS_SILENCE_LIMIT_MS,
  WS_STABLE_AFTER_MS,
  WS_SUBSCRIBE_GAP_MS,
} from './constants';
import { ConnectLimiter } from './connect-limiter';

export interface SocketLike {
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: { code: number }) => void) | null;
  onerror: (() => void) | null;
}
export type SocketFactory = (url: string) => SocketLike;

export type SocketState = 'connecting' | 'open' | 'backoff' | 'stopped';
export type Subscription = Record<string, unknown> & { type: string };

export interface LiveSocketEvents {
  onMessage(channel: string, data: unknown): void;
  onState(state: SocketState, detail: string): void;
  /** Hyperliquid rejected something we sent (e.g. a subscription). */
  onRefused(detail: string): void;
}

export class LiveSocket {
  private ws: SocketLike | null = null;
  private readonly subs = new Map<string, Subscription>();
  private outbox: string[] = [];
  private draining = false;
  private delay = WS_RECONNECT_MIN_MS;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private ping: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  state: SocketState = 'connecting';
  lastMessageAt = 0;
  /** Closes not asked for, since start. */
  drops = 0;

  constructor(
    private readonly url: string,
    private readonly events: LiveSocketEvents,
    private readonly limiter: ConnectLimiter,
    private readonly create: SocketFactory
  ) {}

  start(): void {
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
    this.setState('stopped', 'stopped');
    this.ws?.close();
    this.ws = null;
  }

  subscribe(sub: Subscription): void {
    const key = JSON.stringify(sub);
    if (this.subs.has(key)) return;
    this.subs.set(key, sub);
    if (this.state === 'open') this.enqueue({ method: 'subscribe', subscription: sub });
  }

  unsubscribe(sub: Subscription): void {
    const key = JSON.stringify(sub);
    if (!this.subs.delete(key)) return;
    if (this.state === 'open') this.enqueue({ method: 'unsubscribe', subscription: sub });
  }

  get subscriptions(): Subscription[] {
    return [...this.subs.values()];
  }

  private connect(): void {
    if (this.stopped) return;
    const wait = this.limiter.take();
    if (wait > 0) {
      this.setState('backoff', `waiting ${Math.ceil(wait / 1000)} s for the connection limit`);
      this.later(() => this.connect(), wait);
      return;
    }
    this.setState('connecting', 'connecting');
    const ws = this.create(this.url);
    this.ws = ws;
    ws.onopen = () => {
      if (ws !== this.ws) return;
      this.lastMessageAt = Date.now();
      this.outbox = [];
      // Open first: the outbox sends only while open.
      this.setState('open', `${this.subs.size} subscriptions`);
      for (const sub of this.subs.values())
        this.enqueue({ method: 'subscribe', subscription: sub });
      this.ping = setInterval(() => this.heartbeat(ws), WS_PING_INTERVAL_MS);
      this.later(() => {
        if (ws === this.ws) this.delay = WS_RECONNECT_MIN_MS;
      }, WS_STABLE_AFTER_MS);
    };
    ws.onmessage = (ev) => {
      if (ws !== this.ws) return;
      this.lastMessageAt = Date.now();
      let m: { channel?: string; data?: unknown };
      try {
        m = JSON.parse(String(ev.data)) as { channel?: string; data?: unknown };
      } catch {
        return;
      }
      if (m.channel === 'error') this.events.onRefused(JSON.stringify(m.data));
      else if (m.channel && m.channel !== 'pong' && m.channel !== 'subscriptionResponse') {
        this.events.onMessage(m.channel, m.data);
      }
    };
    ws.onerror = () => ws.close();
    ws.onclose = (ev) => {
      if (ws !== this.ws) return;
      this.ws = null;
      this.clearTimers();
      if (this.stopped) return;
      this.drops += 1;
      const wait = this.delay * (0.8 + Math.random() * 0.4);
      this.delay = Math.min(this.delay * 2, WS_RECONNECT_MAX_MS);
      this.setState(
        'backoff',
        `closed (code ${ev.code}); retrying in ${Math.round(wait / 1000)} s`
      );
      this.later(() => this.connect(), wait);
    };
  }

  private heartbeat(ws: SocketLike): void {
    if (Date.now() - this.lastMessageAt > WS_SILENCE_LIMIT_MS) {
      ws.close(); // onclose schedules the reconnect
      return;
    }
    ws.send(JSON.stringify({ method: 'ping' }));
  }

  private enqueue(msg: Record<string, unknown>): void {
    this.outbox.push(JSON.stringify(msg));
    if (!this.draining) this.drain();
  }

  private drain(): void {
    const next = this.outbox.shift();
    if (next === undefined || !this.ws || this.state !== 'open') {
      this.draining = false;
      return;
    }
    this.draining = true;
    this.ws.send(next);
    this.later(() => this.drain(), WS_SUBSCRIBE_GAP_MS);
  }

  private later(fn: () => void, ms: number): void {
    const t = setTimeout(() => {
      this.timers = this.timers.filter((x) => x !== t);
      fn();
    }, ms);
    this.timers.push(t);
  }

  private clearTimers(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    if (this.ping) clearInterval(this.ping);
    this.ping = null;
    this.draining = false;
  }

  private setState(state: SocketState, detail: string): void {
    this.state = state;
    this.events.onState(state, detail);
  }
}
