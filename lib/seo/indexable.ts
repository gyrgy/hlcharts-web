/**
 * Which pages search engines may index (plan §2, §3.6), in one place: the
 * pages' robots tags and the sitemap both read these, so a page is never in
 * the sitemap while telling search engines to stay away, or the other way
 * round. Nothing is indexed until SITE_PUBLIC.
 */
import type { Metadata } from 'next';
import { SITE_PUBLIC, SPOT_INDEX_MIN_VOLUME_USD } from '../site';

/** A perp page: live markets now; delisted ones from launch, when their pages carry history. */
export const perpIndexable = (delisted: boolean, isPublic = SITE_PUBLIC): boolean =>
  isPublic && !delisted;

/** A spot pair's page: once its 24 h volume at a build reaches SPOT_INDEX_MIN_VOLUME_USD. */
export const spotIndexable = (volume24h: number, isPublic = SITE_PUBLIC): boolean =>
  isPublic && volume24h >= SPOT_INDEX_MIN_VOLUME_USD;

/** An exchange's page: when it has live markets; the others from launch. */
export const exchangeIndexable = (live: number, isPublic = SITE_PUBLIC): boolean =>
  isPublic && live > 0;

/** The site's own pages (home, overviews, methodology). */
export const pageIndexable = (isPublic = SITE_PUBLIC): boolean => isPublic;

/**
 * The development pages (feed test, live client check): kept on the site to
 * check the live connection from the real domain, never indexed or followed,
 * public or not, and linked from the home page only before SITE_PUBLIC.
 */
export const DEV_PAGE_ROBOTS: Metadata['robots'] = { index: false, follow: false };

export const robotsFor = (indexable: boolean): Metadata['robots'] =>
  indexable ? { index: true, follow: true } : { index: false, follow: true };
