import type { Counts } from "@/lib/shift/feedbackSummary";
import { cn } from "@/lib/utils";

/**
 * One multiple-choice question as horizontal bars, in the form's option
 * order. Values no longer in the form still show, after the current ones.
 */

export type Option = { value: string; label: string };

export function optionLabel(options: readonly Option[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function FeedbackCountBars({
  title,
  options,
  counts,
  total,
  highlight,
  note,
}: {
  title: string;
  options: readonly Option[];
  counts: Counts;
  /** Denominator for the bar width: responses that answered this question. */
  total: number;
  highlight?: string;
  note?: string;
}) {
  const known = new Set(options.map((o) => o.value));
  const rows = [
    ...options,
    ...Object.keys(counts)
      .filter((value) => !known.has(value))
      .map((value) => ({ value, label: `${value} (old option)` })),
  ];

  return (
    <section className="space-y-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </div>
      <ul className="space-y-1.5">
        {rows.map(({ value, label }) => {
          const n = counts[value] ?? 0;
          const width = total > 0 ? `${(n / total) * 100}%` : "0%";
          return (
            <li key={value} className="grid grid-cols-[minmax(0,11rem)_1fr_2rem] items-center gap-3 text-sm">
              <span className={cn("truncate", value === highlight && "font-semibold")} title={label}>
                {label}
              </span>
              <span className="h-2.5 overflow-hidden rounded-full bg-muted">
                <span
                  className={cn("block h-full rounded-full", value === highlight ? "bg-amber-500" : "bg-foreground/60")}
                  style={{ width }}
                />
              </span>
              <span className="text-right tabular-nums text-muted-foreground">{n}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
