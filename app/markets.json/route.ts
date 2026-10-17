/** `/markets.json`, written once per build (plan §3.1, §3.6). */
import { buildMarkets } from '@/lib/build/build-markets';
import { searchIndex } from '@/lib/search/search-index';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
  return Response.json(searchIndex(await buildMarkets(), new Date().toISOString()));
}
