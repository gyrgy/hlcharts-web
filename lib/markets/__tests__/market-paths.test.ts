/**
 * Market page addresses are frozen once published (dev.to and Medium copies
 * link to them forever, plan §2): these tests pin the rules, and the build's
 * refusal to let two markets share an address.
 */
import { describe, expect, it } from 'vitest';
import { assertPaths } from '../assert-paths';
import { perpPath, slugify, spotPath } from '../market-paths';

describe('market page addresses', () => {
  it('main perps take one segment, builder-exchange perps two, all lowercase', () => {
    expect(perpPath('', 'BTC')).toBe('/perps/btc/');
    expect(perpPath('', 'kPEPE')).toBe('/perps/kpepe/');
    expect(perpPath('xyz', 'xyz:NVDA')).toBe('/perps/xyz/nvda/');
    expect(perpPath('xyz', 'xyz:XYZ100')).toBe('/perps/xyz/xyz100/');
  });

  it('spot pairs by token names, with the pair index only when two pairs share them', () => {
    expect(spotPath('HYPE', 'USDC', 107, false)).toBe('/spot/hype-usdc/');
    expect(spotPath('HYPE', 'USDC', 230, true)).toBe('/spot/hype-usdc-230/');
  });

  it('turns characters outside a-z, 0-9 and "-" into "-"', () => {
    expect(slugify('A.B C')).toBe('a-b-c');
    expect(slugify('--X--')).toBe('x');
  });

  it('fails the build when two markets would share an address, or one has no usable address', () => {
    expect(() =>
      assertPaths([
        ['/perps/btc/', 'BTC'],
        ['/perps/eth/', 'ETH'],
      ])
    ).not.toThrow();
    expect(() =>
      assertPaths([
        ['/perps/kpepe/', 'kPEPE'],
        ['/perps/kpepe/', 'KPEPE'],
      ])
    ).toThrow(/share/);
    expect(() => assertPaths([['/perps//', '%%%']])).toThrow(/unusable/);
  });
});
