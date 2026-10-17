/**
 * What the 404 page does with an address (plan §2): send a raw or mistyped
 * form of an existing page to it; show a market listed since the last build
 * live (noindex, like every 404); otherwise say there is nothing here. A
 * redirect happens only when the normalized address differs from the one
 * asked for, so it can never loop.
 */
import { LiveTarget } from './live-targets';
import { normalizePath } from './normalize-path';

export type Resolution = { kind: 'redirect'; to: string } | LiveTarget | { kind: 'none' };

export function resolveMissing(
  pathname: string,
  built: ReadonlySet<string>,
  live: ReadonlyMap<string, LiveTarget>
): Resolution {
  const n = normalizePath(pathname);
  if (n !== pathname && built.has(n)) return { kind: 'redirect', to: n };
  return live.get(n) ?? { kind: 'none' };
}
