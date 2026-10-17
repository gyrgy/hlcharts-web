'use client';
/**
 * The site's header and footer around every page, except embeds
 * (`/embed/…`), which show the chart and its credit only, with a small margin
 * to fit inside someone else's page. Wide screens get the sections as a row
 * of tabs under the header; phones and narrow windows a menu button.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { MarketSearch } from './components/market-search';
import { MobileNav } from './components/mobile-nav';
import { NavLinks } from './components/nav-links';
import { ThemeToggle } from './components/theme-toggle';
import { LiveStatus } from './live-status';
import { ScrollRestore } from './scroll-restore';
import { CONTACT_EMAIL } from '@/lib/site';

export const EMBED_PREFIX = '/embed/';
/** The page's width and side margins, shared by the header, the content and the footer. */
const FRAME = 'mx-auto w-full max-w-[1600px] px-4 md:px-8';

export function SiteChrome({ children }: { children: ReactNode }) {
  const path = usePathname() ?? '';
  if (path.startsWith(EMBED_PREFIX)) return <div className="m-1.5">{children}</div>;
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollRestore />
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur md:static md:bg-background">
        <div className={`${FRAME} flex h-14 items-center gap-3`}>
          <Link
            href="/"
            className="shrink-0 text-lg font-semibold tracking-tight text-foreground hover:no-underline"
          >
            hlcharts
          </Link>
          <div className="ml-auto flex min-w-0 items-center gap-2 md:gap-4">
            <div className="hidden md:block">
              <MarketSearch />
            </div>
            <LiveStatus />
            <ThemeToggle />
            <div className="lg:hidden">
              <MobileNav />
            </div>
          </div>
        </div>
        <nav className={`${FRAME} hidden overflow-x-auto lg:flex`} aria-label="Sections">
          <NavLinks layout="tabs" />
        </nav>
      </header>
      {/* Each page brings its own <main>. */}
      <div className={`${FRAME} flex-1 pb-12`}>{children}</div>
      <footer className="border-t">
        <div
          className={`${FRAME} flex flex-wrap gap-x-5 gap-y-1 py-4 text-xs text-muted-foreground`}
        >
          <Link href="/about/">About</Link>
          <Link href="/methodology/">Methodology</Link>
          <Link href="/legal/">Legal and privacy</Link>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <span>Live data from Hyperliquid&apos;s public API.</span>
          <span>
            Not affiliated with Hyperliquid, trade.xyz or any other exchange; names and marks belong
            to their owners.
          </span>
        </div>
      </footer>
    </div>
  );
}
