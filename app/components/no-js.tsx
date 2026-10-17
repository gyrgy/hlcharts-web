import type { ReactNode } from 'react';

/**
 * In place of a page's live tables and charts for readers that run no
 * JavaScript (most AI crawlers, and a search engine's first read): what does
 * not change from hour to hour, written at build time, and never a figure,
 * which would go stale in the HTML (owner, 2026-10-16). Browsers with
 * JavaScript never show it.
 */
export function NoJs({ live, children }: { live: string; children?: ReactNode }) {
  return (
    <noscript>
      <p>
        {live} They load in the browser from Hyperliquid&apos;s public API, so without JavaScript
        they are not shown{children ? '. What does not change from hour to hour:' : '.'}
      </p>
      {children}
    </noscript>
  );
}
