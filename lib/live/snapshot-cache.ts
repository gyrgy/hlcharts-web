/**
 * REST snapshots kept for SNAPSHOT_TTL_MS, in sessionStorage when the browser
 * allows it (so moving between pages does not re-fetch), else in memory.
 * Storage can be missing or throw (private windows, blocked site data); that
 * only costs a re-fetch, never an error.
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const PREFIX = 'hl:snap:';

export class SnapshotCache {
  private memory = new Map<string, { at: number; value: unknown }>();

  constructor(
    private readonly ttlMs: number,
    private readonly storage: StorageLike | null,
    private readonly now: () => number = Date.now
  ) {}

  get<T>(key: string): T | undefined {
    const hit = this.memory.get(key) ?? this.read(key);
    if (!hit || this.now() - hit.at > this.ttlMs) return undefined;
    return hit.value as T;
  }

  set(key: string, value: unknown): void {
    const entry = { at: this.now(), value };
    this.memory.set(key, entry);
    try {
      this.storage?.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
      // Full or blocked storage: the memory copy still serves this page.
    }
  }

  private read(key: string): { at: number; value: unknown } | undefined {
    try {
      const raw = this.storage?.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as { at: number; value: unknown }) : undefined;
    } catch {
      return undefined;
    }
  }
}
