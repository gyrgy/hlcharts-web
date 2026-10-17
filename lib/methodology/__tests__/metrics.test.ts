/** /methodology: anchors are unique and usable, the changelog is in order, and no page links to a missing anchor. */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { CHANGELOG, METRICS } from '../metrics';

const ids = METRICS.map((m) => m.id);

function pageFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? pageFiles(p) : /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

describe('methodology', () => {
  it('gives every metric a unique anchor made of safe characters', () => {
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
    expect(ids).not.toContain('changelog');
  });

  it('keeps the changelog newest first, with real dates', () => {
    for (const e of CHANGELOG)
      expect(new Date(`${e.date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(e.date);
    const dates = CHANGELOG.map((e) => e.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('has every methodology link on the site point at an anchor that exists', () => {
    const app = path.join(__dirname, '../../../app');
    const links = pageFiles(app).flatMap((f) =>
      [...fs.readFileSync(f, 'utf8').matchAll(/\/methodology\/#([a-z0-9-]+)/g)].map((m) => [
        f,
        m[1],
      ])
    );
    expect(links.length).toBeGreaterThan(0);
    for (const [file, anchor] of links)
      expect([file, [...ids, 'changelog'].includes(anchor)]).toEqual([file, true]);
  });
});
