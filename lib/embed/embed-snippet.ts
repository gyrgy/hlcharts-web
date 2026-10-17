/**
 * The embed code (plan §3.2, §3.3): an iframe of `/embed/<chart-id>/` with the
 * chart's settings in the address, and a plain credit link outside the
 * iframe, in addition to the credit inside the chart. CC BY for charts and
 * embeds (owner's decision 7).
 */
import { CHART_SPECS, ChartId } from '../charts/chart-registry';
import { SITE_URL } from '../site';

const attr = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** `/embed/market.funding/?m=BTC&r=7d`; parameters with an empty value are left out. */
export function embedPath(id: ChartId, params: Readonly<Record<string, string>>): string {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== ''));
  const s = q.toString();
  return `/embed/${id}/${s ? `?${s}` : ''}`;
}

export function embedSnippet(o: {
  id: ChartId;
  params: Readonly<Record<string, string>>;
  title: string;
  /** The page the chart lives on, credited outside the iframe. */
  pagePath: string;
}): string {
  const src = `${SITE_URL}${embedPath(o.id, o.params)}`;
  return [
    `<iframe src="${attr(src)}" title="${attr(`${o.title} (hlcharts)`)}" width="100%" height="${CHART_SPECS[o.id].embedHeight}" style="border:0" loading="lazy"></iframe>`,
    `<p><a href="${attr(`${SITE_URL}${o.pagePath}`)}">${attr(o.title)}</a>, live on hlcharts (CC BY)</p>`,
  ].join('\n');
}
