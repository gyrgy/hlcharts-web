/**
 * The market list the static build writes pages for, read from Hyperliquid
 * at build time (owner's decision, 2026-10-02: public data, one indexable page
 * per market) and checked: exchange lists aligned (LiveUniverse), no reserved
 * exchange slug, every address a usable slug, no two markets on one address.
 * Any failure stops the build: a silently missing or mislabelled page is worse
 * than no deploy. Read once per build.
 */
import { join } from 'path';
import { HL_INFO_URL, INFO, MAIN_DEX } from '../hl/constants';
import { PerpDex, SpotMetaAndAssetCtxs } from '../hl/types';
import { LiveUniverse, PerpMarket, UniverseSource } from '../live/live-universe';
import { assertPaths } from '../markets/assert-paths';
import { SpotPage, spotPages } from '../markets/spot-pages';
import { exchangePath, perpPath, RESERVED_EXCHANGE_SLUGS, slugify } from '../markets/market-paths';
import { sharedAcrossWorkers } from './shared-across-workers';

export interface PerpPage {
  path: string;
  market: PerpMarket;
  dex: PerpDex | null;
}

export type { SpotPage } from '../markets/spot-pages';

/** An exchange page (`/exchanges/<dex>/`): every exchange in perpDexs, the main one included. */
export interface ExchangePage {
  dex: string;
  path: string;
  fullName: string | null;
  live: number;
}

export interface BuildMarkets {
  perps: PerpPage[];
  spot: SpotPage[];
  exchanges: ExchangePage[];
}

const ATTEMPTS = 3;

async function post<T>(body: Record<string, unknown>): Promise<T> {
  let last: unknown;
  for (let i = 0; i < ATTEMPTS; i++) {
    try {
      const res = await fetch(HL_INFO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw new Error(
    `build: Hyperliquid ${String(body.type)} failed ${ATTEMPTS} times: ${String(last)}`
  );
}

let memo: Promise<BuildMarkets> | null = null;
/** Shared by the build's worker processes (shared-across-workers.ts); kept out of git. */
const SHARED_DIR = join(process.cwd(), '.tmp');
/** A list this recent is the same build's, or one minutes before it: the pages are no older. */
const SHARED_MAX_AGE_MS = 10 * 60_000;

export function buildMarkets(): Promise<BuildMarkets> {
  memo ??= sharedAcrossWorkers(SHARED_DIR, 'build-markets', SHARED_MAX_AGE_MS, load);
  return memo;
}

async function load(): Promise<BuildMarkets> {
  const src: UniverseSource = { request: (body) => post(body) };
  const universe = new LiveUniverse();
  await universe.load(src);
  const [spotMeta, spotCtxs] = await post<SpotMetaAndAssetCtxs>({
    type: INFO.spotMetaAndAssetCtxs,
  });

  const perps: PerpPage[] = [];
  for (const [dex, markets] of universe.perps) {
    if (dex !== MAIN_DEX && RESERVED_EXCHANGE_SLUGS.has(slugify(dex))) {
      throw new Error(`build: exchange "${dex}" uses a reserved slug`);
    }
    for (const market of markets) {
      perps.push({
        path: perpPath(dex, market.name),
        market,
        dex: universe.dexes.get(dex) ?? null,
      });
    }
  }

  let spot: SpotPage[];
  try {
    spot = spotPages(
      spotMeta.universe,
      new Map(spotMeta.tokens.map((t) => [t.index, t.name])),
      new Map(spotCtxs.map((c) => [c.coin, Number(c.dayNtlVlm)]))
    );
  } catch (e) {
    throw new Error(`build: ${String(e)}`);
  }

  const exchanges: ExchangePage[] = [...universe.perps].map(([dex, markets]) => ({
    dex,
    path: exchangePath(dex),
    fullName: universe.dexes.get(dex)?.fullName ?? null,
    live: markets.filter((m) => !m.isDelisted).length,
  }));

  assertPaths([
    ...perps.map((p) => [p.path, p.market.name] as const),
    ...spot.map((s) => [s.path, s.coin] as const),
    ...exchanges.map((e) => [e.path, `exchange ${e.dex || 'main'}`] as const),
  ]);
  return { perps, spot, exchanges };
}
