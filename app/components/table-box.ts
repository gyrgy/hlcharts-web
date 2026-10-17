import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/**
 * Props for the scroll box around a table: only as wide as its table, so
 * beside a narrow table the wheel scrolls the page rather than the list; a
 * table wider than the page fills it and scrolls sideways. `maxHeight` makes a
 * long table scroll inside the box from tablet width up; on phones the box
 * never scrolls vertically, so a swipe moves the page instead of trapping the
 * finger in the list.
 */
export function tableBox(
  maxHeight?: string,
  className?: string
): { className: string; style?: CSSProperties } {
  return {
    className: cn(
      'w-fit max-w-full overflow-auto',
      maxHeight && 'md:max-h-(--table-box-max-h)',
      className
    ),
    style: maxHeight ? ({ '--table-box-max-h': maxHeight } as CSSProperties) : undefined,
  };
}
