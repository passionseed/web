import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A thin progress bar with its numbers, for the Elemental progress page.
 * No client code, so server and client components both use it.
 */

export type MeterTick = { value: number; label: string; sub?: string };

function pct(value: number, target: number): number {
  if (target <= 0) return value > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, (value / target) * 100));
}

export function ProgressBar({
  value,
  target,
  extra,
  ticks,
  marker,
  tone = "default",
  size = "sm",
  label,
}: {
  value: number;
  target: number;
  /** A lighter segment right after the fill: promised, not yet in. */
  extra?: number;
  ticks?: MeterTick[];
  /** A thin line where we should be by now. */
  marker?: number;
  tone?: "default" | "behind" | "done" | "quiet";
  size?: "sm" | "lg";
  label: string;
}) {
  const fill = pct(value, target);
  const extraFill = extra ? Math.max(0, pct(value + extra, target) - fill) : 0;
  return (
    <div className="w-full">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(value, target)}
        className={cn("relative w-full overflow-hidden rounded-full bg-muted", size === "lg" ? "h-2" : "h-1.5")}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-[width] duration-500",
            tone === "behind" && "bg-destructive/80",
            tone === "done" && "bg-emerald-400/80",
            tone === "quiet" && "bg-muted-foreground/50",
            tone === "default" && "bg-primary",
          )}
          style={{ width: `${fill}%` }}
        />
        {extraFill > 0 && (
          <div
            aria-hidden="true"
            className={cn(
              "absolute inset-y-0 transition-[width] duration-500",
              tone === "behind" ? "bg-destructive/25" : "bg-primary/30",
            )}
            style={{ left: `${fill}%`, width: `${extraFill}%` }}
          />
        )}
        {ticks?.map((t) => (
          <span
            key={t.value}
            aria-hidden="true"
            className="absolute inset-y-0 w-px bg-background/80"
            style={{ left: `${pct(t.value, target)}%` }}
          />
        ))}
        {marker !== undefined && marker > 0 && marker < target && (
          <span
            aria-hidden="true"
            className="absolute inset-y-0 w-0.5 bg-foreground/80"
            style={{ left: `${pct(marker, target)}%` }}
          />
        )}
      </div>
      {ticks && ticks.length > 0 && (
        <div className="relative mt-1.5 h-8 text-[11px] leading-tight text-muted-foreground">
          {ticks.map((t, i) => {
            const left = pct(t.value, target);
            const last = i === ticks.length - 1 && left >= 99;
            return (
              <div
                key={t.value}
                className={cn("absolute whitespace-nowrap tabular-nums", last ? "right-0 text-right" : "-translate-x-1/2 text-center")}
                style={last ? undefined : { left: `${left}%` }}
              >
                <div className={cn(value >= t.value && "text-foreground")}>{t.label}</div>
                {t.sub && <div>{t.sub}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** A labelled bar: name on the left, "done / total" on the right. */
export function ProgressRow({
  label,
  value,
  target,
  extra,
  suffix,
  hint,
  tone,
  href,
  format = (n: number) => n.toLocaleString("en-US"),
}: {
  label: ReactNode;
  value: number;
  target: number;
  extra?: number;
  suffix?: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "behind" | "done" | "quiet";
  href?: string;
  format?: (n: number) => string;
}) {
  const done = target > 0 && value >= target;
  const name = href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="truncate hover:text-primary hover:underline">
      {label}
    </a>
  ) : (
    <span className="truncate">{label}</span>
  );
  return (
    <div className="space-y-1.5 py-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <div className="flex min-w-0 items-baseline gap-2">
          {name}
          {hint && <span className="shrink-0 text-xs text-muted-foreground">{hint}</span>}
        </div>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">{format(value)}</span>
          {" / "}
          {format(target)}
          {suffix}
        </span>
      </div>
      <ProgressBar
        value={value}
        target={target}
        extra={extra}
        tone={tone ?? (done ? "done" : "default")}
        label={typeof label === "string" ? label : "Progress"}
      />
    </div>
  );
}

/** A section card on the progress page. */
export function DashSection({
  id,
  title,
  meta,
  children,
}: {
  id: string;
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="min-w-0 rounded-lg border bg-card/60 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id={`${id}-title`} className="text-base font-medium tracking-tight">
          {title}
        </h2>
        {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
      </div>
      {children}
    </section>
  );
}

/** A small titled block inside a section. */
export function SubBlock({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-baseline justify-between gap-2 border-b pb-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {aside && <span className="text-xs tabular-nums text-muted-foreground">{aside}</span>}
      </div>
      {children}
    </div>
  );
}

/** One big number with a label, for the stat row. */
export function Stat({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border bg-background/40 px-3 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xl font-medium tabular-nums tracking-tight">{value}</div>
      {detail && <div className="mt-0.5 text-xs text-muted-foreground">{detail}</div>}
    </div>
  );
}

/** Calm notice used when a source is missing or not set up. */
export function QuietNotice({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">{children}</p>;
}
