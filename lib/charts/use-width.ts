'use client';
/** A container's width in pixels, kept current as it resizes; 0 until measured in the browser. */
import { RefObject, useEffect, useState } from 'react';

export function useWidth(container: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, [container]);
  return width;
}
