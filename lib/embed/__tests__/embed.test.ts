/** Embeds: the address and code a chart gives out, and what an embed accepts. */
import { describe, expect, it } from 'vitest';
import { CHART_ID } from '../../charts/chart-registry';
import { embedPath, embedSnippet } from '../embed-snippet';
import { parseEmbed } from '../parse-embed';

describe('embed address and code', () => {
  it('puts the settings in the address, leaving out empty ones', () => {
    expect(embedPath(CHART_ID.marketFunding, { m: 'xyz:NVDA', r: '21d' })).toBe(
      '/embed/market.funding/?m=xyz%3ANVDA&r=21d'
    );
    expect(embedPath(CHART_ID.oiTreemap, {})).toBe('/embed/oi.treemap/');
    expect(embedPath(CHART_ID.marketPrice, { m: 'BTC', r: '' })).toBe('/embed/market.price/?m=BTC');
  });

  it('gives an iframe and a credit link outside it, with every attribute escaped', () => {
    const code = embedSnippet({
      id: CHART_ID.marketFunding,
      params: { m: 'BTC', r: '7d' },
      title: 'BTC funding "and" premium',
      pagePath: '/perps/btc/',
    });
    expect(code).toBe(
      '<iframe src="https://hlcharts.com/embed/market.funding/?m=BTC&amp;r=7d" title="BTC funding &quot;and&quot; premium (hlcharts)" width="100%" height="420" style="border:0" loading="lazy"></iframe>\n' +
        '<p><a href="https://hlcharts.com/perps/btc/">BTC funding &quot;and&quot; premium</a>, live on hlcharts (CC BY)</p>'
    );
  });
});

describe('what an embed accepts', () => {
  it('reads a market chart with its range, or its default range', () => {
    const p = parseEmbed(CHART_ID.marketPrice, '?m=BTC&r=1h');
    expect(
      'error' in p ? p.error : p.chart === 'market.price' && [p.market, p.interval.id]
    ).toEqual(['BTC', '1h']);
    const f = parseEmbed(CHART_ID.marketFunding, '?m=xyz%3ANVDA');
    expect('error' in f ? f.error : f.chart === 'market.funding' && [f.market, f.range.id]).toEqual(
      ['xyz:NVDA', '7d']
    );
  });

  it('reads several markets, days and unit for the comparison', () => {
    const c = parseEmbed(CHART_ID.fundingCompare, '?m=BTC,ETH,xyz:NVDA&r=21&u=hour');
    expect(
      'error' in c ? c.error : c.chart === 'funding.compare' && [c.markets, c.days, c.unit]
    ).toEqual([['BTC', 'ETH', 'xyz:NVDA'], 21, 'hour']);
  });

  it('refuses what a chart does not offer, with a reason', () => {
    expect(parseEmbed(CHART_ID.marketPrice, '?r=1h')).toEqual({ error: 'No market given (?m=…).' });
    expect(parseEmbed(CHART_ID.marketPrice, '?m=BTC&r=5m')).toEqual({
      error: 'Unknown interval "5m".',
    });
    expect(parseEmbed(CHART_ID.fundingCompare, '?m=BTC&r=30')).toEqual({
      error: 'Unknown range "30".',
    });
    expect(parseEmbed(CHART_ID.fundingCompare, '?m=BTC&u=day')).toEqual({
      error: 'Unknown unit "day".',
    });
    expect(
      parseEmbed(
        CHART_ID.fundingCompare,
        `?m=${Array.from({ length: 11 }, (_, i) => `C${i}`).join(',')}`
      )
    ).toEqual({
      error: 'At most 10 markets.',
    });
  });

  it('takes no settings for the overview charts', () => {
    expect(parseEmbed(CHART_ID.oiTreemap, '?m=anything')).toEqual({ chart: 'oi.treemap' });
  });
});
