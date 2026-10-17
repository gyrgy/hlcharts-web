/**
 * Every REST request of the tab goes through one queue that spends at most
 * `budget` weight in any rolling window. Requests wait their turn in order; a
 * pause (after a 429) holds them all. Weight known only from the reply (items
 * returned) is charged afterwards with `charge`.
 */
export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

export class WeightQueue {
  private spent: { at: number; weight: number }[] = [];
  private tail: Promise<void> = Promise.resolve();
  private pausedUntil = 0;
  /** When the request at the head of the line goes; 0 while nothing waits. */
  private waitingUntil = 0;

  constructor(
    private readonly budget: number,
    private readonly windowMs: number,
    private readonly clock: Clock = realClock
  ) {}

  /** Runs `fn` once `weight` fits in the window; requests run in the order they were queued. */
  run<T>(weight: number, fn: () => Promise<T>): Promise<T> {
    if (!(weight > 0 && weight <= this.budget))
      throw new Error(`weight ${weight} outside 1..${this.budget}`);
    const turn = this.tail.then(() => this.waitFor(weight));
    this.tail = turn.catch(() => undefined);
    return turn.then(fn);
  }

  /** Weight learned from a reply. */
  charge(weight: number): void {
    if (weight > 0) this.spent.push({ at: this.clock.now(), weight });
  }

  /** Holds every request until `ms` from now (longer pauses win). */
  pause(ms: number): void {
    this.pausedUntil = Math.max(this.pausedUntil, this.clock.now() + ms);
  }

  get paused(): boolean {
    return this.clock.now() < this.pausedUntil;
  }

  /**
   * When the next waiting request will go (out of budget, or paused after a
   * 429); 0 when none is waiting. A page shows it so a long load counts down
   * instead of looking frozen.
   */
  get resumesAt(): number {
    return this.waitingUntil > this.clock.now() ? this.waitingUntil : 0;
  }

  /** Weight spent in the current window. */
  used(): number {
    this.expire();
    return this.spent.reduce((s, x) => s + x.weight, 0);
  }

  private expire(): void {
    const from = this.clock.now() - this.windowMs;
    while (this.spent.length && this.spent[0].at <= from) this.spent.shift();
  }

  private async waitFor(weight: number): Promise<void> {
    for (;;) {
      const now = this.clock.now();
      if (now < this.pausedUntil) {
        this.waitingUntil = this.pausedUntil;
        await this.clock.sleep(this.pausedUntil - now);
        continue;
      }
      this.expire();
      let used = this.spent.reduce((s, x) => s + x.weight, 0);
      if (used + weight <= this.budget) {
        this.spent.push({ at: now, weight });
        this.waitingUntil = 0;
        return;
      }
      // Wait until enough of the window has expired to fit this request.
      let freeAt = now;
      for (const x of this.spent) {
        used -= x.weight;
        freeAt = x.at + this.windowMs;
        if (used + weight <= this.budget) break;
      }
      this.waitingUntil = Math.max(now + 1, freeAt);
      await this.clock.sleep(Math.max(1, freeAt - now));
    }
  }
}
