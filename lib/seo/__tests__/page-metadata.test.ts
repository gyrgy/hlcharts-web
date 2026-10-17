/** Every page's head: canonical address, link-preview tags, breadcrumbs. */
import { describe, expect, it } from 'vitest';
import { breadcrumbList } from '../breadcrumbs';
import { OG_IMAGE_PATH, pageMetadata } from '../page-metadata';
import { SITE_URL } from '../../site';

describe('pageMetadata', () => {
  const m = pageMetadata({
    title: 'Funding | hlcharts',
    description: 'Every perp, live.',
    path: '/funding/',
  });

  it('gives an absolute canonical address', () => {
    expect(m.alternates?.canonical).toBe(`${SITE_URL}/funding/`);
  });

  it('gives OpenGraph and Twitter previews with the shared image, absolute', () => {
    expect(m.openGraph).toMatchObject({
      url: `${SITE_URL}/funding/`,
      title: 'Funding | hlcharts',
      description: 'Every perp, live.',
      siteName: 'hlcharts',
    });
    const images = m.openGraph?.images as { url: string; width: number }[];
    expect(images[0]).toMatchObject({ url: `${SITE_URL}${OG_IMAGE_PATH}`, width: 1200 });
    expect(m.twitter).toMatchObject({ card: 'summary_large_image', title: 'Funding | hlcharts' });
  });

  it("keeps the layout's robots rule unless the page sets one", () => {
    expect('robots' in m).toBe(false);
    const noindex = { index: false, follow: true };
    expect(
      pageMetadata({ title: 't', description: 'd', path: '/x/', robots: noindex }).robots
    ).toEqual(noindex);
  });
});

describe('breadcrumbList', () => {
  it('starts at the home page and numbers each step, with absolute addresses', () => {
    const b = breadcrumbList([
      { name: 'Markets', path: '/markets/' },
      { name: 'BTC perpetual', path: '/perps/btc/' },
    ]);
    expect(b['@type']).toBe('BreadcrumbList');
    expect(b.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'hlcharts', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Markets', item: `${SITE_URL}/markets/` },
      { '@type': 'ListItem', position: 3, name: 'BTC perpetual', item: `${SITE_URL}/perps/btc/` },
    ]);
  });
});
