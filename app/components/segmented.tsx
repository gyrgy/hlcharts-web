'use client';
/**
 * One choice out of a few (a chart's range, a unit, a table's tab): shadcn's
 * toggle group, joined into one control, the current choice filled. It can
 * never be emptied: clicking the current choice keeps it. Many options wrap.
 */
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

/** More options than this wrap onto several lines as separate buttons. */
const JOINED_MAX = 6;

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  /** What is being chosen, for screen readers ("Candle interval"). */
  label: string;
  className?: string;
}) {
  const joined = options.length <= JOINED_MAX;
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={joined ? 0 : 1}
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as T);
      }}
      aria-label={label}
      className={cn(!joined && 'flex-wrap', className)}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
