/** The open-interest board: shares within each exchange, OI against volume, and published caps. */
import { describe, expect, it } from 'vitest';
import { PerpDex } from '../../hl/types';
import { ENRICHED_DEFAULTS, MarketRow } from '../../markets/types';
import { oiBoard } from '../oi-board';

const row = (o: Partial<MarketRow> & Pick<MarketRow, 'key'>): MarketRow => ({
  kind: 'perp',
  venue: '',
  name: o.key,
  href: '/',
  base: o.key,
  markPx: 1,
  change24h: 0,
  volume24h: 100,
  oiCoins: 1,
  oiUsd: 300,
  fundingHourly: 0,
  premium: 0,
  basisBps: 0,
  impactSpreadBps: 1,
  maxLeverage: 10,
  capUse: null,
  atCap: false,
  delisted: false,
  isolatedOnly: false,
  ...ENRICHED_DEFAULTS,
  alsoOn: [],
  ...o,
});
const XYZ: PerpDex = {
  name: 'xyz',
  fullName: 'XYZ',
  deployer: '0x0',
  oracleUpdater: null,
  feeRecipient: null,
  assetToStreamingOiCap: [['xyz:TSLA', '25000000.0']],
  assetToFundingMultiplier: [],
  assetToFundingInterestRate: [],
  assetToFundingClamp: [],
};

describe('open-interest board', () => {
  const board = oiBoard(
    [
      row({ key: 'BTC', oiUsd: 750 }),
      row({ key: 'ETH', oiUsd: 250, volume24h: 0 }),
      row({ key: 'OLD', delisted: true, oiUsd: 1e6 }),
      row({ key: '@1', kind: 'spot', oiUsd: null }),
      row({ key: 'xyz:TSLA', venue: 'xyz', oiUsd: 500 }),
    ],
    new Map([
      ['', null],
      ['xyz', XYZ],
    ])
  );
  const by = new Map(board.map((r) => [r.key, r]));

  it('keeps live perps only', () => {
    expect(board.map((r) => r.key)).toEqual(['BTC', 'ETH', 'xyz:TSLA']);
  });

  it("shares each market's open interest within its own exchange, delisted ones not counted", () => {
    expect(by.get('BTC')?.venueShare).toBe(0.75);
    expect(by.get('ETH')?.venueShare).toBe(0.25);
    expect(by.get('xyz:TSLA')?.venueShare).toBe(1);
  });

  it('divides open interest by volume, and leaves it missing without volume', () => {
    expect(by.get('BTC')?.oiPerVolume).toBe(7.5);
    expect(by.get('ETH')?.oiPerVolume).toBeNull();
  });

  it('reads builder caps in USD, and has none for the main exchange', () => {
    expect(by.get('xyz:TSLA')?.capUsd).toBe(25_000_000);
    expect(by.get('BTC')?.capUsd).toBeNull();
  });
});
