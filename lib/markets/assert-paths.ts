/**
 * The build's check on market page addresses: each must be a usable slug and
 * no two markets may share one. Throws (failing the build) rather than let one
 * page silently replace another.
 */
import { isSafePath } from './market-paths';

export function assertPaths(entries: readonly (readonly [path: string, market: string])[]): void {
  const seen = new Map<string, string>();
  for (const [path, market] of entries) {
    if (!isSafePath(path)) throw new Error(`build: ${market} gets an unusable address ${path}`);
    const other = seen.get(path);
    if (other) throw new Error(`build: ${market} and ${other} would share ${path}`);
    seen.set(path, market);
  }
}
