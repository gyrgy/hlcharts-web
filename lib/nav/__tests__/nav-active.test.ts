/** The header shows the section of the page being read, and only that one. */
import { describe, expect, it } from 'vitest';
import { SITE_PAGES } from '../../site-pages';
import { navActive } from '../nav-active';

const active = (path: string): string[] =>
  SITE_PAGES.filter((p) => p.nav && navActive(p, path)).map((p) => p.nav as string);

describe('navActive', () => {
  it('marks the page itself, with or without the trailing slash', () => {
    expect(active('/funding/')).toEqual(['Funding']);
    expect(active('/funding')).toEqual(['Funding']);
  });

  it('marks the section for the pages under it', () => {
    expect(active('/exchanges/compare/')).toEqual(['Exchanges']);
    expect(active('/exchanges/xyz/')).toEqual(['Exchanges']);
    expect(active('/learn/funding-rate/')).toEqual(['Learn']);
  });

  it('counts market pages under Markets', () => {
    expect(active('/perps/btc/')).toEqual(['Markets']);
    expect(active('/perps/xyz/tsla/')).toEqual(['Markets']);
    expect(active('/spot/hype-usdc/')).toEqual(['Markets']);
  });

  it('marks nothing on the home page or an unknown address', () => {
    expect(active('/')).toEqual([]);
    expect(active('/no-such-page/')).toEqual([]);
  });

  it('does not match a section by a shared word', () => {
    const page = { path: '/fund/', nav: 'Fund', title: 'Fund', summary: '' };
    expect(navActive(page, '/funding/')).toBe(false);
  });
});
