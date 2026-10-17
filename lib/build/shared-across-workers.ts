/**
 * One result shared by every process of a build. Next.js renders the static
 * pages in parallel worker processes (13 on the owner's laptop), and each one
 * that asked Hyperliquid for the market list asked again: 13 × 80 weight, most
 * of the IP's 1,200 a minute, for one build (measured 2026-10-16). Here the
 * first process takes a lock file and loads; the others wait for the file it
 * writes. A result younger than `maxAgeMs` is reused as it is; a lock older
 * than LOCK_STALE_MS belonged to a process that died and is taken over. A
 * failed load leaves no file, so the next process tries for itself and the
 * build fails loudly if Hyperliquid keeps refusing.
 */
import {
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';

export const LOCK_STALE_MS = 60_000;
const POLL_MS = 200;

const ageMs = (file: string): number | null => {
  try {
    return Date.now() - statSync(file).mtimeMs;
  } catch {
    return null;
  }
};

export async function sharedAcrossWorkers<T>(
  dir: string,
  name: string,
  maxAgeMs: number,
  load: () => Promise<T>
): Promise<T> {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${name}.json`);
  const lock = `${file}.lock`;
  for (;;) {
    const age = ageMs(file);
    if (age !== null && age < maxAgeMs) return JSON.parse(readFileSync(file, 'utf8')) as T;
    let fd: number | null = null;
    try {
      fd = openSync(lock, 'wx');
    } catch {
      // Another process is loading: wait for its file, or take over a dead one's lock.
      const lockAge = ageMs(lock);
      if (lockAge !== null && lockAge > LOCK_STALE_MS) rmSync(lock, { force: true });
      await new Promise((r) => setTimeout(r, POLL_MS));
      continue;
    }
    try {
      const value = await load();
      const tmp = `${file}.${process.pid}.tmp`;
      writeFileSync(tmp, JSON.stringify(value));
      renameSync(tmp, file);
      return value;
    } finally {
      closeSync(fd);
      rmSync(lock, { force: true });
    }
  }
}
