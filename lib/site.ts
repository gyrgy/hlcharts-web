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
 * "the identity and the contact details of the controller"): the owner,
 * operating as hlcharts, since there is no company behind it. The first name
 * only, lowercase, is the owner's choice (2026-10-17), made after being told it
 * gives a contact but arguably not an identity. Null would block the public
 * site (a test and the /legal page's build both refuse).
 */
export const OPERATOR_NAME: string | null = 'gyorgy';
/** A spot pair's page is indexed once its 24 h volume reaches this (plan §2). */
export const SPOT_INDEX_MIN_VOLUME_USD = 10_000;
