'use client';
/**
 * A container's width in pixels, kept current as it resizes; 0 until measured in the browser.
 * Measured before the browser paints, so a chart is drawn at its size in the first frame
 * instead of empty and then full size, which pushed the page below it down (Cloudflare's
 * layout-shift report, 2026-10-18).
 */
import { RefObject, useEffect, useLayoutEffect, useState } from 'react';

/** useLayoutEffect in the browser; on the server, where nothing is measured, useEffect. */
const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function useWidth(container: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useBeforePaint(() => {
    const el = container.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, [container]);
  return width;
}
