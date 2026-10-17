import { StorageLike } from '../live/snapshot-cache';

const KEY = 'hlcharts:scroll';
/** Addresses kept per tab; the least recently scrolled go first. */
export const MAX_POSITIONS = 200;

/**
 * How far down each address the visitor was in this tab, for back and
 * forward (app/scroll-restore.tsx). Kept in session storage so a reload or a
 * return from another site finds it too; storage that is blocked, full or
 * holds something else only loses the positions, never breaks the page.
 */
export class ScrollPositions {
  private readonly positions: Map<string, number>;

  constructor(private readonly storage: StorageLike | null) {
    this.positions = new Map(this.read());
  }

  get(address: string): number | undefined {
    return this.positions.get(address);
  }

  set(address: string, y: number): void {
    this.positions.delete(address);
    this.positions.set(address, Math.round(y));
    if (this.positions.size > MAX_POSITIONS) {
      const oldest = this.positions.keys().next().value;
      if (oldest !== undefined) this.positions.delete(oldest);
    }
  }

  save(): void {
    try {
      this.storage?.setItem(KEY, JSON.stringify([...this.positions]));
    } catch {
      // full or blocked: the positions last as long as the page
    }
  }

  private read(): [string, number][] {
    try {
      const parsed: unknown = JSON.parse(this.storage?.getItem(KEY) ?? '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (e): e is [string, number] =>
          Array.isArray(e) &&
          typeof e[0] === 'string' &&
          typeof e[1] === 'number' &&
          Number.isFinite(e[1]) &&
          e[1] >= 0
      );
    } catch {
      return [];
    }
  }
}
