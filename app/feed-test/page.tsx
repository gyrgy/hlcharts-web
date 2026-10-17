import type { Metadata } from 'next';
import { DEV_PAGE_ROBOTS } from '@/lib/seo/indexable';
import { FeedTest } from './feed-test';

export const metadata: Metadata = {
  title: 'Feed test (development) | hlcharts',
  robots: DEV_PAGE_ROBOTS,
};

/**
 * The first build task in docs/hlcharts-website.md §3.2: every phase-1 page
 * rests on these feeds working from a visitor's browser, and they had only
 * been tested from Node.
 */
export default function FeedTestPage() {
  return (
    <main>
      <h1>Feed test</h1>
      <p>
        Opens the feeds every page of the site depends on, from this browser, the way the site will:
        one connection for the all-market feeds, a second for a single market&apos;s book. Leave it
        open for a minute; every line should turn to <b>live</b>.
      </p>
      <FeedTest />
    </main>
  );
}
