/** `/llms.txt` for AI readers (plan §3.6). */
import { LEARN_TERMS } from '@/lib/learn/terms';
import { llmsTxt } from '@/lib/seo/llms-txt';
import { SITE_PAGES } from '@/lib/site-pages';

export const dynamic = 'force-static';

export function GET(): Response {
  return new Response(llmsTxt(SITE_PAGES, LEARN_TERMS), {
    headers: { 'Content-Type': 'text/plain' },
  });
}
