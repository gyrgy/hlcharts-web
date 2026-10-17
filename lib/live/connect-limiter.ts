/**
 * New websocket connections from this tab, at most `perMinute` in any rolling
 * minute, shared by all its connections (Hyperliquid allows 30 per IP, and an
 * IP can hold several tabs and several people).
 */
export class ConnectLimiter {
  private opened: number[] = [];

  constructor(
    private readonly perMinute: number,
    private readonly now: () => number = Date.now
  ) {}

  /** Milliseconds to wait before the next connection may open; 0 records one now. */
  take(): number {
    const t = this.now();
    this.opened = this.opened.filter((x) => t - x < 60_000);
    if (this.opened.length < this.perMinute) {
      this.opened.push(t);
      return 0;
    }
    return this.opened[0] + 60_000 - t;
  }
}
