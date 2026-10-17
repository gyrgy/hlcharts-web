/**
 * The build's parallel workers load Hyperliquid's market list once between them,
 * not once each (13 × 80 weight a build, measured 2026-10-16).
 */
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { LOCK_STALE_MS, sharedAcrossWorkers } from '../shared-across-workers';

const dirs: string[] = [];
const freshDir = (): string => {
  const d = mkdtempSync(join(process.cwd(), '.tmp', 'shared-'));
  dirs.push(d);
  return d;
};
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
const MINUTE = 60_000;

describe('sharedAcrossWorkers', () => {
  it('loads once for callers that start together, and all get the same result', async () => {
    const dir = freshDir();
    let loads = 0;
    const load = async () => {
      loads++;
      await new Promise((r) => setTimeout(r, 50));
      return { markets: ['BTC', 'ETH'] };
    };
    const got = await Promise.all(
      Array.from({ length: 5 }, () => sharedAcrossWorkers(dir, 'm', MINUTE, load))
    );
    expect(loads).toBe(1);
    for (const g of got) expect(g).toEqual({ markets: ['BTC', 'ETH'] });
  });

  it('reuses a recent result and loads again once it is too old', async () => {
    const dir = freshDir();
    let loads = 0;
    const load = async () => ++loads;
    await sharedAcrossWorkers(dir, 'm', MINUTE, load);
    expect(await sharedAcrossWorkers(dir, 'm', MINUTE, load)).toBe(1);
    const old = new Date(Date.now() - 2 * MINUTE);
    utimesSync(join(dir, 'm.json'), old, old);
    expect(await sharedAcrossWorkers(dir, 'm', MINUTE, load)).toBe(2);
  });

  it("takes over a dead process's lock", async () => {
    const dir = freshDir();
    const lock = join(dir, 'm.json.lock');
    writeFileSync(lock, '');
    const old = new Date(Date.now() - LOCK_STALE_MS - 1000);
    utimesSync(lock, old, old);
    expect(await sharedAcrossWorkers(dir, 'm', MINUTE, async () => 'loaded')).toBe('loaded');
  });

  it('writes nothing when loading fails, so the next caller tries for itself', async () => {
    const dir = freshDir();
    await expect(
      sharedAcrossWorkers(dir, 'm', MINUTE, async () => {
        throw new Error('Hyperliquid refused');
      })
    ).rejects.toThrow('Hyperliquid refused');
    expect(await sharedAcrossWorkers(dir, 'm', MINUTE, async () => 'second try')).toBe(
      'second try'
    );
  });
});
