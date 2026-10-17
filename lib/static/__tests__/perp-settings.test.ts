/**
 * What pages write into their <noscript> tables: a market's settings from the
 * build's market list, read with the same rules as the live pages.
 */
import { describe, expect, it } from 'vitest';
import { PerpPage } from '../../build/build-markets';
import { PerpDex } from '../../hl/types';
import { perpSettings } from '../perp-settings';

const xyz: PerpDex = {
  name: 'xyz',
  fullName: 'XYZ',
  deployer: '0xdeployer',
  oracleUpdater: null,
  feeRecipient: null,
  assetToStreamingOiCap: [['xyz:TSLA', '750000000.0']],
  assetToFundingMultiplier: [['xyz:TSLA', '0.5']],
  assetToFundingInterestRate: [],
  assetToFundingClamp: [],
};
const page = (
  p: Partial<PerpPage['market']> & { name: string; dex: string },
  dex: PerpDex | null
) =>
  ({
    path: `/perps/${p.name.toLowerCase().replace(':', '/')}/`,
    market: { szDecimals: 0, maxLeverage: 10, ...p },
    dex,
  }) as PerpPage;

describe('perpSettings', () => {
  it("reads a builder market's cap and funding overrides by its full name, defaults where unset", () => {
    const s = perpSettings(page({ name: 'xyz:TSLA', dex: 'xyz', deployerFeeScale: '1.0' }, xyz));
    expect(s.coin).toBe('TSLA');
    expect(s.oiCapUsd).toBe(750_000_000);
    expect(s.funding.multiplier).toBe(0.5);
    expect(s.funding.documented.multiplier).toBe(true);
    expect(s.funding.interest8h).toBe(0.0001);
    expect(s.funding.documented.interest).toBe(false);
    expect(s.impactSizeUsd).toBeNull();
    expect(s.deployerFeeScale).toBe('1.0');
  });

  it("gives the main exchange's fixed parameters, its impact sizes and no cap", () => {
    const btc = perpSettings(page({ name: 'BTC', dex: '', maxLeverage: 40 }, null));
    expect(btc).toMatchObject({ coin: 'BTC', dex: '', maxLeverage: 40, oiCapUsd: null });
    expect(btc.impactSizeUsd).toBe(20_000);
    expect(btc.funding.clamp8h).toBe(0.0005);
    expect(btc.deployerFeeScale).toBeNull();
    expect(perpSettings(page({ name: 'SOL', dex: '' }, null)).impactSizeUsd).toBe(6_000);
  });

  it('marks isolated-only markets however Hyperliquid says it, and delisted ones', () => {
    expect(perpSettings(page({ name: 'A', dex: '', onlyIsolated: true }, null)).isolatedOnly).toBe(
      true
    );
    expect(
      perpSettings(page({ name: 'B', dex: '', marginMode: 'noCross' }, null)).isolatedOnly
    ).toBe(true);
    expect(
      perpSettings(page({ name: 'C', dex: '', marginMode: 'strictIsolated' }, null)).isolatedOnly
    ).toBe(true);
    expect(perpSettings(page({ name: 'D', dex: '' }, null)).isolatedOnly).toBe(false);
    expect(perpSettings(page({ name: 'E', dex: '', isDelisted: true }, null)).delisted).toBe(true);
  });
});
