import type { Metadata } from 'next';
import { DEV_PAGE_ROBOTS } from '@/lib/seo/indexable';
import { LiveClientCheck } from './live-client-check';

export const metadata: Metadata = {
  title: 'Live client check (development) | hlcharts',
  robots: DEV_PAGE_ROBOTS,
};

/** Development page: the shared live-data client (web/lib/live/) running in this browser. */
export default function LiveClientPage() {
  return (
    <main>
      <h1>Live client check</h1>
      <p>
        The client every page will use: one request queue, two connections, the dead-market guard
        and the row-order check. Leave it open a minute.
      </p>
      <LiveClientCheck />
    </main>
  );
}
