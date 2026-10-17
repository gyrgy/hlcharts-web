/** Site-wide settings. */
export const SITE_URL = 'https://hlcharts.com';
/**
 * False until the first public deploy: every page carries noindex. Pages still
 * compute whether they WOULD be indexed (spot pairs under the volume floor are
 * not), so switching this on is the only change at release.
 */
export const SITE_PUBLIC = false;
/** The site's contact address (owner, 2026-10-16), routed by Cloudflare Email Routing once the domain is set up. */
export const CONTACT_EMAIL = 'hello@hlcharts.com';
/**
 * Who runs the site, as the privacy statement must name them (GDPR art. 13:
 * "the identity and the contact details of the controller"): the owner's own
 * name, operating as hlcharts, since there is no company behind it. Null until
 * the owner fills it in; the site cannot be made public without it (a test and
 * the /legal page's build both refuse).
 */
export const OPERATOR_NAME: string | null = null;
/** A spot pair's page is indexed once its 24 h volume reaches this (plan §2). */
export const SPOT_INDEX_MIN_VOLUME_USD = 10_000;
