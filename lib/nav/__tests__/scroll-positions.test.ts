/** Back and forward find where the visitor was, and bad storage never breaks a page. */
import { describe, expect, it } from 'vitest';
import { StorageLike } from '../../live/snapshot-cache';
import { MAX_POSITIONS, ScrollPositions } from '../scroll-positions';

function memoryStorage(): StorageLike & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (k) => items.get(k) ?? null,
    setItem: (k, v) => void items.set(k, v),
  };
}

describe('ScrollPositions', () => {
  it('keeps a position per address, across a reload once saved', () => {
    const storage = memoryStorage();
    const before = new ScrollPositions(storage);
    before.set('/funding/', 1840.4);
    before.set('/methodology/#oi', 900);
    before.save();
    const after = new ScrollPositions(storage);
    expect(after.get('/funding/')).toBe(1840);
    expect(after.get('/methodology/#oi')).toBe(900);
    expect(after.get('/markets/')).toBeUndefined();
  });

  it('keeps only the latest position of an address', () => {
    const p = new ScrollPositions(null);
    p.set('/funding/', 100);
    p.set('/funding/', 2500);
    expect(p.get('/funding/')).toBe(2500);
  });

  it('drops the least recently scrolled address past the cap', () => {
    const p = new ScrollPositions(null);
    p.set('/first/', 1);
    for (let i = 0; i < MAX_POSITIONS - 1; i++) p.set(`/page-${i}/`, i);
    p.set('/first/', 2); // scrolled again: now the newest
    p.set('/one-more/', 3);
    expect(p.get('/first/')).toBe(2);
    expect(p.get('/page-0/')).toBeUndefined();
    expect(p.get('/page-1/')).toBe(1);
  });

  it('starts empty on storage holding something else', () => {
    for (const held of ['not json', '{"a":1}', '[["/x/","10"],["/y/",-5],[3,4]]']) {
      const storage = memoryStorage();
      storage.items.set('hlcharts:scroll', held);
      const p = new ScrollPositions(storage);
      expect([p.get('/x/'), p.get('/y/')]).toEqual([undefined, undefined]);
    }
  });

  it('works without storage, and survives storage that throws', () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    for (const storage of [null, throwing]) {
      const p = new ScrollPositions(storage);
      p.set('/funding/', 300);
      expect(() => p.save()).not.toThrow();
      expect(p.get('/funding/')).toBe(300);
    }
  });
});
