/** `/llms-full.txt`: every definition, as on /methodology (plan §3.6). */
import { LEARN_TERMS } from '@/lib/learn/terms';
import { CHANGELOG, METRICS } from '@/lib/methodology/metrics';
import { llmsFullTxt } from '@/lib/seo/llms-full-txt';

export const dynamic = 'force-static';

export function GET(): Response {
  return new Response(llmsFullTxt(METRICS, CHANGELOG, LEARN_TERMS), {
    headers: { 'Content-Type': 'text/plain' },
  });
}
