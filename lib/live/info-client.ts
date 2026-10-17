/**
 * REST requests to Hyperliquid's info endpoint through the tab's weight queue
 * and snapshot cache. On a 429 the whole queue pauses (10 s, doubling up to
 * 120 s) and the request waits its turn again; after REST_MAX_ATTEMPTS refusals
 * it fails. Never a tight retry loop: shared IPs (VPNs, mobile carriers) put
 * many visitors on one budget.
 */
import { HL_INFO_URL } from '../hl/constants';
import { RATE_LIMIT_PAUSE_MAX_MS, RATE_LIMIT_PAUSE_MIN_MS, REST_MAX_ATTEMPTS } from './constants';
import { infoWeight } from './info-weight';
import { SnapshotCache } from './snapshot-cache';
import { WeightQueue } from './weight-queue';

export type FetchLike = (
  url: string,
  init: RequestInit
) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

export class InfoClient {
  private pauseMs = RATE_LIMIT_PAUSE_MIN_MS;
  /** Set while Hyperliquid is refusing our requests; cleared by the next success. */
  limited = false;

  constructor(
    private readonly queue: WeightQueue,
    private readonly cache: SnapshotCache,
    private readonly fetchFn: FetchLike = (url, init) => fetch(url, init)
  ) {}

  /** When the next queued request goes, for a countdown; 0 when none is waiting (weight-queue.ts). */
  get resumesAt(): number {
    return this.queue.resumesAt;
  }

  /** `cache: true` reuses a reply younger than SNAPSHOT_TTL_MS (same body). */
  async request<T>(body: Record<string, unknown>, opts: { cache?: boolean } = {}): Promise<T> {
    const key = JSON.stringify(body);
    if (opts.cache) {
      const hit = this.cache.get<T>(key);
      if (hit !== undefined) return hit;
    }
    const { upfront } = infoWeight(body);
    for (let attempt = 1; ; attempt++) {
      const res = await this.queue.run(upfront, () =>
        this.fetchFn(HL_INFO_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: key,
        })
      );
      if (res.status === 429) {
        this.limited = true;
        this.queue.pause(this.pauseMs);
        this.pauseMs = Math.min(this.pauseMs * 2, RATE_LIMIT_PAUSE_MAX_MS);
        if (attempt >= REST_MAX_ATTEMPTS)
          throw new Error(`Hyperliquid ${String(body.type)}: refused (429) ${attempt} times`);
        continue;
      }
      if (!res.ok) throw new Error(`Hyperliquid ${String(body.type)}: HTTP ${res.status}`);
      const json = (await res.json()) as T;
      this.queue.charge(infoWeight(body, json).extra);
      this.limited = false;
      this.pauseMs = RATE_LIMIT_PAUSE_MIN_MS;
      if (opts.cache) this.cache.set(key, json);
      return json;
    }
  }
}
