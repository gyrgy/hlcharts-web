import type { Metadata } from 'next';
import { MissingPage } from './missing-page';

/** Never indexed: a page shown here is a redirect, a market listed since the build, or nothing (plan §3.6). */
export const metadata: Metadata = {
  title: 'Not found | hlcharts',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <MissingPage />;
}
