/**
 * A page's head for search engines and link previews (plan §3.6): title and
 * description, its canonical address, and the OpenGraph and Twitter tags that
 * X, Telegram and Discord read to draw a preview. Every page shares one
 * generic image (OG_IMAGE_PATH) with no figures in it: a preview can be
 * cached for weeks, so a number there would go stale (owner, 2026-10-16).
 */
import type { Metadata } from 'next';
import { SITE_URL } from '../site';

export const SITE_NAME = 'hlcharts';
/** Written by the build (app/og.png/route.tsx). */
export const OG_IMAGE_PATH = '/og.png';
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;
const OG_IMAGE_ALT = 'hlcharts: Hyperliquid markets, funding and open interest, live';

export function pageMetadata({
  title,
  description,
  path,
  robots,
}: {
  title: string;
  description: string;
  /** The page's address on the site, with its trailing slash ("/funding/"). */
  path: string;
  robots?: Metadata['robots'];
}): Metadata {
  const url = `${SITE_URL}${path}`;
  const image = `${SITE_URL}${OG_IMAGE_PATH}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url,
      title,
      description,
      images: [{ url: image, ...OG_IMAGE_SIZE, alt: OG_IMAGE_ALT }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    ...(robots === undefined ? {} : { robots }),
  };
}
