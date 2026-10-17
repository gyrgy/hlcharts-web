'use client';
/**
 * Back and forward return the visitor to where they were on the page. Pages
 * draw their live content after the first render, so on a return the page is
 * at first too short and the browser's own restore lands at the top. Instead
 * the position is kept per address (lib/nav/scroll-positions.ts) and applied
 * once the returned-to page is tall enough. The visitor scrolling first, or
 * the page not growing that far within GIVE_UP_MS, ends the attempt where it is.
 */
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { StorageLike } from '@/lib/live/snapshot-cache';
import { ScrollPositions } from '@/lib/nav/scroll-positions';

const GIVE_UP_MS = 10_000;
/** Page loads on which the visitor expects their old position back. */
const RETURNS = new Set(['reload', 'back_forward']);
/** Input that means the visitor has started moving on their own. */
const TAKE_OVER = ['touchmove', 'keydown', 'mousedown'] as const;

const address = (): string => location.pathname + location.search + location.hash;

export function ScrollRestore() {
  const path = usePathname();
  const restore = useRef<((y: number) => void) | null>(null);
  /** A return to another page: the position to apply once that page has rendered. */
  const pending = useRef<number | null>(null);
  /** `location.pathname` of the page on screen. */
  const shown = useRef('');

  useEffect(() => {
    let storage: StorageLike | null = null;
    try {
      storage = window.sessionStorage;
    } catch {
      storage = null; // blocked site data: positions last as long as the page
    }
    const positions = new ScrollPositions(storage);
    const browserMode = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    let stop: (() => void) | null = null;

    const start = (y: number): void => {
      stop?.();
      const until = Date.now() + GIVE_UP_MS;
      let frame = 0;
      const onWheel = (e: WheelEvent): void => {
        if (e.deltaY !== 0) end(); // sideways wheel is a trackpad's back swipe
      };
      const end = (): void => {
        cancelAnimationFrame(frame);
        removeEventListener('wheel', onWheel);
        for (const t of TAKE_OVER) removeEventListener(t, end);
        stop = null;
      };
      const step = (): void => {
        if (document.documentElement.scrollHeight - innerHeight >= y) {
          scrollTo(0, y);
          end();
        } else if (Date.now() > until) end();
        else frame = requestAnimationFrame(step);
      };
      addEventListener('wheel', onWheel, { passive: true });
      for (const t of TAKE_OVER) addEventListener(t, end, { passive: true });
      stop = end;
      step();
    };
    restore.current = start;

    // While a return is being applied, scrolling is ours, not the visitor's.
    const onScroll = (): void => {
      if (!stop && pending.current === null) positions.set(address(), scrollY);
    };
    const onPop = (): void => {
      const y = positions.get(address()) ?? 0;
      // Same page, another section (#…): nothing to wait for.
      if (location.pathname === shown.current) start(y);
      else pending.current = y;
    };
    const onHide = (): void => positions.save();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('popstate', onPop);
    addEventListener('pagehide', onHide);

    const load = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    const saved = positions.get(address());
    if (load && RETURNS.has(load.type) && saved !== undefined) start(saved);

    return () => {
      stop?.();
      removeEventListener('scroll', onScroll);
      removeEventListener('popstate', onPop);
      removeEventListener('pagehide', onHide);
      positions.save();
      history.scrollRestoration = browserMode;
      restore.current = null;
    };
  }, []);

  useEffect(() => {
    shown.current = location.pathname;
    if (pending.current === null) return;
    const y = pending.current;
    pending.current = null;
    restore.current?.(y);
  }, [path]);

  return null;
}
