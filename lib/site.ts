/** Site-wide settings. */
export const SITE_URL = 'https://hlcharts.com';
/**
 * True since 2026-10-17 (owner): pages may be indexed. Each page still decides
 * for itself (spot pairs under the volume floor, embeds and the development
 * pages stay noindex). False puts noindex on every page.
 */
export const SITE_PUBLIC = true;
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
