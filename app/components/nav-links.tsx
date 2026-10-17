'use client';
/**
 * The header's section links (lib/site-pages.ts), the current section marked:
 * a row of tabs on wide screens, a list in the phone menu.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navActive } from '@/lib/nav/nav-active';
import { SITE_PAGES } from '@/lib/site-pages';

const LINKS = SITE_PAGES.filter((p) => p.nav);

export function NavLinks({
  layout,
  onNavigate,
}: {
  layout: 'tabs' | 'list';
  /** Called when a link is followed (the phone menu closes). */
  onNavigate?: () => void;
}) {
  const path = usePathname() ?? '';
  return LINKS.map((p) => {
    const active = navActive(p, path);
    return (
      <Link
        key={p.path}
        href={p.path}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground hover:no-underline',
          layout === 'tabs'
            ? '-mb-px border-b-2 border-transparent px-3 py-2.5 text-sm'
            : 'rounded-md px-3 py-2.5 text-base hover:bg-muted',
          active &&
            (layout === 'tabs'
              ? 'border-foreground font-medium text-foreground'
              : 'bg-muted font-medium text-foreground')
        )}
      >
        {p.nav}
      </Link>
    );
  });
}
