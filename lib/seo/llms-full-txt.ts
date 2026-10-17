/** `/llms-full.txt`: the methodology as plain Markdown, from the same entries as /methodology. */
import { LearnTerm } from '../learn/terms';
import { ChangelogEntry, Metric } from '../methodology/metrics';
import { SITE_URL } from '../site';
import { SITE_SUMMARY } from './llms-txt';

export function llmsFullTxt(
  metrics: readonly Metric[],
  changelog: readonly ChangelogEntry[],
  terms: readonly LearnTerm[]
): string {
  return [
    '# hlcharts: how every number is defined',
    '',
    `> ${SITE_SUMMARY}`,
    '',
    `The same text, with live examples: ${SITE_URL}/methodology/`,
    '',
    ...metrics.flatMap((m) => [
      `## ${m.name}`,
      '',
      m.what,
      '',
      ...(m.formula ? [`- Formula: ${m.formula}`] : []),
      `- Source: ${m.source}`,
      `- Updates: ${m.refresh}`,
      `- Covers: ${m.span}`,
      ...m.traps.map((t) => `- Note: ${t}`),
      '',
    ]),
    '# Learn: the terms in plain words',
    '',
    ...terms.flatMap((t) => [`## ${t.term}`, '', t.summary, '', ...t.body.flatMap((p) => [p, ''])]),
    '## Changelog',
    '',
    ...changelog.map((e) => `- ${e.date}: ${e.change}`),
    '',
  ].join('\n');
}
