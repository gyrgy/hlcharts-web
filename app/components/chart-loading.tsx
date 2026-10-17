/**
 * Over a chart's area while its data is on its way (ChartFrame's `loading`):
 * a spinner and what is being fetched. Over an earlier chart (another range
 * picked) it dims it; clicks and hovers pass through to it.
 */
export function ChartLoading({ text }: { text: string }) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-muted/80 px-4 text-center text-sm text-muted-foreground"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="shrink-0">
        <circle
          cx="9"
          cy="9"
          r="7"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="2"
        />
        <path
          d="M9 2a7 7 0 0 1 7 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 9 9"
            to="360 9 9"
            dur="0.8s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
      <span>{text}</span>
    </div>
  );
}
