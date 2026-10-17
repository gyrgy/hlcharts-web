/**
 * schema.org data for search engines (lib/seo/breadcrumbs.ts), in the page's
 * HTML. "<" is escaped so no value can close the script element early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
