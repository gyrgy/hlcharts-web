/**
 * The one LiveClient of this tab, created on first use in the browser and kept
 * across page navigations (Next.js client-side navigation keeps the module).
 * Never call during server rendering: there is no browser to connect from.
 */
import { HL_WS_URL } from '../hl/constants';
import { ConnectLimiter } from './connect-limiter';
import {
  REST_WEIGHT_BUDGET,
  REST_WINDOW_MS,
  SNAPSHOT_TTL_MS,
  WS_CONNECT_CAP_PER_MIN,
} from './constants';
import { InfoClient } from './info-client';
import { LiveClient } from './live-client';
import { SocketLike } from './live-socket';
import { SnapshotCache, StorageLike } from './snapshot-cache';
import { WeightQueue } from './weight-queue';

let client: LiveClient | null = null;

export function getLiveClient(): LiveClient {
  if (typeof window === 'undefined') throw new Error('getLiveClient: browser only');
  if (client) return client;
  let storage: StorageLike | null = null;
  try {
    storage = window.sessionStorage;
  } catch {
    storage = null; // blocked site data: snapshots stay in memory
  }
  const info = new InfoClient(
    new WeightQueue(REST_WEIGHT_BUDGET, REST_WINDOW_MS),
    new SnapshotCache(SNAPSHOT_TTL_MS, storage)
  );
  client = new LiveClient(
    info,
    HL_WS_URL,
    new ConnectLimiter(WS_CONNECT_CAP_PER_MIN),
    (url) => new WebSocket(url) as unknown as SocketLike
  );
  return client;
}
