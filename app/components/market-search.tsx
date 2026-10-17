'use client';
/**
 * The header search (plan §3.1): finds any market by name from `/markets.json`,
 * which is fetched once, the first time the box is used. Arrow keys move,
 * Enter opens, Escape closes.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type KeyboardEvent, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { searchMarkets } from '@/lib/search/search-markets';
import { loadIndex } from '@/lib/search/load-index';
import { SearchEntry } from '@/lib/search/types';

/** `fullWidth`: fills its container (the phone menu); `onNavigate`: a market was opened. */
export function MarketSearch({
  fullWidth = false,
  onNavigate,
}: {
  fullWidth?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = entries ? searchMarkets(entries, query) : [];

  const load = (): void => {
    if (entries) return;
    loadIndex().then(
      (e) => {
        setEntries(e);
        setFailed(false);
      },
      () => setFailed(true)
    );
  };
  const go = (e: SearchEntry): void => {
    setOpen(false);
    setQuery('');
    onNavigate?.();
    router.push(e.path);
  };
  const onKey = (k: KeyboardEvent<HTMLInputElement>): void => {
    if (k.key === 'Escape') setOpen(false);
    else if (k.key === 'ArrowDown') {
      k.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (k.key === 'ArrowUp') {
      k.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (k.key === 'Enter' && results[active]) go(results[active]);
  };

  return (
    <div className="relative">
      <Input
        type="search"
        placeholder="Find a market"
        aria-label="Find a market"
        value={query}
        onFocus={() => {
          load();
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKey}
        className={fullWidth ? 'w-full' : 'w-48'}
      />
      {open && query.trim() !== '' && (
        <ul
          role="listbox"
          className={cn(
            'absolute top-full z-50 mt-1 min-w-64 rounded-md border bg-popover py-1 text-sm text-popover-foreground shadow-md',
            fullWidth ? 'inset-x-0' : 'right-0'
          )}
        >
          {failed && <li className="px-3 py-1.5">Search is unavailable right now.</li>}
          {!failed && !entries && <li className="px-3 py-1.5 text-muted-foreground">Loading…</li>}
          {entries && !results.length && (
            <li className="px-3 py-1.5 text-muted-foreground">No market by that name.</li>
          )}
          {results.map((r, i) => (
            <li
              key={r.path}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'bg-muted' : undefined}
            >
              <Link
                href={r.path}
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                className="flex gap-3 px-3 py-1.5 text-foreground hover:no-underline"
              >
                <span>{r.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {r.kind === 'perp' ? `${r.venue} perp` : 'spot'}
                  {r.delisted ? ', delisted' : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
