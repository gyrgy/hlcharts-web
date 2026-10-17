/**
 * A labelled horizontal bar per item, longest bar = largest absolute value;
 * negative values grow left of a centre line when any item is negative.
 */
import Link from 'next/link';

export interface Bar {
  key: string;
  label: string;
  href?: string;
  value: number;
  text: string;
}

const POSITIVE = '#1c64d1';
const NEGATIVE = '#d9480f';

export function BarList({ bars }: { bars: readonly Bar[] }) {
  if (!bars.length)
    return <p style={{ color: 'var(--muted-foreground)' }}>Nothing to show right now.</p>;
  const max = Math.max(...bars.map((b) => Math.abs(b.value)), Number.MIN_VALUE);
  const signed = bars.some((b) => b.value < 0);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(6rem, max-content) 1fr max-content',
        gap: '0.2rem 0.6rem',
        alignItems: 'center',
        maxWidth: '44rem',
        fontSize: '0.9em',
      }}
    >
      {bars.map((b) => {
        const share = (Math.abs(b.value) / max) * (signed ? 50 : 100);
        const left = signed ? (b.value < 0 ? 50 - share : 50) : 0;
        return [
          <span key={`${b.key}-l`}>{b.href ? <Link href={b.href}>{b.label}</Link> : b.label}</span>,
          <span
            key={`${b.key}-b`}
            style={{ position: 'relative', height: '0.9rem', background: 'var(--muted)' }}
          >
            {signed && (
              <span
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: 'var(--muted-foreground)',
                }}
              />
            )}
            <span
              style={{
                position: 'absolute',
                left: `${left}%`,
                width: `${share}%`,
                top: 0,
                bottom: 0,
                background: b.value < 0 ? NEGATIVE : POSITIVE,
              }}
            />
          </span>,
          <span
            key={`${b.key}-t`}
            style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}
          >
            {b.text}
          </span>,
        ];
      })}
    </div>
  );
}
