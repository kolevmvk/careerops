import type { ReactNode } from "react";

/**
 * The page is laid out as an instrument, not as a document.
 *
 * A narrow rail carries a monotonic counter; the content sits beside it. That
 * is the same shape as the event log the work is about — a sequence down the
 * left, the payload to its right — so the structure argues rather than
 * decorates.
 *
 * The counter is `aria-hidden` and the heading appears exactly once. An
 * earlier version had the label twice, visually hidden on one side, which a
 * screen reader would have read out both times.
 *
 * Below `sm` the rail folds onto one line with the heading, because a
 * two-column instrument on a 375px screen is a worse instrument.
 */
export function Section({
  index,
  label,
  children,
  className = "",
}: {
  index: number;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`reveal mt-24 grid gap-x-6 gap-y-4 sm:grid-cols-[3.5rem_minmax(0,1fr)] ${className}`}
    >
      <div
        aria-hidden
        className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2 sm:pt-0.5"
      >
        <span className="font-mono text-xs tabular-nums text-(--color-accent)">
          {String(index).padStart(2, "0")}
        </span>
        <span className="h-px w-6 bg-(--color-border-strong) sm:w-5" />
      </div>

      <div className="min-w-0">
        <h2 className="font-mono text-xs tracking-widest text-(--color-ink-muted) uppercase">
          {label}
        </h2>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}
