import { formatDistanceStrict } from "date-fns";

import type { AdminActivityItem, AdminKpi } from "@/lib/admin/console";
import { addDays, bangkokDayKey, daysBetween } from "@/lib/admin/overview/time";

/**
 * Formatting for the admin overview. Pure and client-safe. Every calendar
 * question is answered in Bangkok time, the clock the team and the cohorts
 * run on, so the server and the browser always agree. Day-key arithmetic is
 * shared with the data layer (lib/admin/overview/time.ts).
 */

export { addDays, bangkokDayKey, daysBetween };

export const BANGKOK_TZ = "Asia/Bangkok";

const MINUS = "\u2212";

const wholeNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

/** 12340 -> "12,340". */
export function formatNumber(value: number): string {
  return wholeNumber.format(value);
}

/** 1234 -> "1.2K", 12 -> "12". For tight spaces only. */
export function formatCompact(value: number): string {
  return compactNumber.format(value);
}

/** 12340 -> "฿12,340"; negatives keep a true minus sign. */
export function formatBaht(value: number): string {
  const amount = `฿${wholeNumber.format(Math.abs(value))}`;
  return value < 0 ? `${MINUS}${amount}` : amount;
}

export interface FormattedKpiValue {
  /** What sighted users read, e.g. "12/30". */
  text: string;
  /** Spoken alternative when the visible text is terse, e.g. "12 of 30". */
  spoken?: string;
}

/** The big number on a KPI, or null when the source could not be read. */
export function formatKpiValue(
  kpi: Pick<AdminKpi, "value" | "format" | "total">,
): FormattedKpiValue | null {
  if (kpi.value === null || !Number.isFinite(kpi.value)) return null;
  if (kpi.format === "baht") return { text: formatBaht(kpi.value) };
  if (kpi.format === "ratio" && typeof kpi.total === "number") {
    const value = formatNumber(kpi.value);
    const total = formatNumber(kpi.total);
    return { text: `${value}/${total}`, spoken: `${value} of ${total}` };
  }
  return { text: formatNumber(kpi.value) };
}

/** Share of a total as a 0-100 bar width, clamped. */
export function percentOf(part: number, whole: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return 0;
  return Math.min(100, Math.max(0, (part / whole) * 100));
}

// ---------------------------------------------------------------------------
// Deltas
// ---------------------------------------------------------------------------

export type DeltaDirection = "up" | "down" | "flat";

export interface KpiDelta {
  direction: DeltaDirection;
  /** Visible label with its sign, e.g. "+12%" or "−3%". */
  label: string;
  /** Full sentence for screen readers. */
  description: string;
}

function percentText(percent: number): string {
  if (percent === 0) return "0";
  if (percent < 0.1) return "<0.1";
  if (percent < 1) return percent.toFixed(1);
  return wholeNumber.format(Math.round(percent));
}

function amountText(amount: number, format: AdminKpi["format"]): string {
  return format === "baht" ? formatBaht(amount) : formatNumber(amount);
}

/**
 * Change against the previous window. A previous value of 0 has no
 * meaningful percentage, so the absolute change is shown instead.
 */
export function kpiDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
  format: AdminKpi["format"] = "number",
): KpiDelta | null {
  if (current == null || previous == null) return null;
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;

  const diff = current - previous;
  const direction: DeltaDirection = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  if (direction === "flat") {
    return {
      direction,
      label: "0%",
      description: "No change from the previous period",
    };
  }

  const sign = direction === "up" ? "+" : MINUS;
  const verb = direction === "up" ? "Up" : "Down";

  if (previous === 0) {
    const amount = amountText(Math.abs(diff), format);
    return {
      direction,
      label: `${sign}${amount}`,
      description: `${verb} ${amount} from zero in the previous period`,
    };
  }

  const percent = percentText(Math.abs((diff / Math.abs(previous)) * 100));
  return {
    direction,
    label: `${sign}${percent}%`,
    description: `${verb} ${percent}% from the previous period`,
  };
}

// ---------------------------------------------------------------------------
// Bangkok calendar
// ---------------------------------------------------------------------------

function toDate(input: Date | string): Date | null {
  const date = typeof input === "string" ? new Date(input) : input;
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Monday 26 October" for the page eyebrow. */
export function formatBangkokLongDate(now: Date): string {
  return now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: BANGKOK_TZ,
  });
}

/** "Sat 7 Nov" for a YYYY-MM-DD key. */
export function formatDayKey(key: string): string {
  // Noon in Bangkok can never fall on a neighbouring day.
  return new Date(`${key}T12:00:00+07:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: BANGKOK_TZ,
  });
}

/** "14:05" in Bangkok. */
export function formatBangkokTime(input: Date | string): string {
  const date = toDate(input);
  if (!date) return "";
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: BANGKOK_TZ,
  });
}

/** "Mon 26 Oct, 14:05" in Bangkok. */
export function formatBangkokDateTime(input: Date | string): string {
  const date = toDate(input);
  const key = date ? bangkokDayKey(date) : null;
  if (!date || !key) return "";
  return `${formatDayKey(key)}, ${formatBangkokTime(date)}`;
}

/** "just now", "5 minutes ago", "3 hours ago". Future times read as now. */
export function relativeTime(input: Date | string, now: Date): string {
  const date = toDate(input);
  if (!date) return "";
  if (now.getTime() - date.getTime() < 60_000) return "just now";
  return formatDistanceStrict(date, now, { addSuffix: true, roundingMethod: "floor" });
}

// ---------------------------------------------------------------------------
// Activity grouping
// ---------------------------------------------------------------------------

export type ActivityDayKey = "today" | "yesterday" | "earlier";

export interface ActivityGroup {
  key: ActivityDayKey;
  label: string;
  items: AdminActivityItem[];
}

const ACTIVITY_GROUP_LABEL: Record<ActivityDayKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier",
};

/** Which Bangkok-day bucket an instant falls in, relative to now. */
export function activityDayOf(at: string, now: Date): ActivityDayKey {
  const today = bangkokDayKey(now);
  const day = bangkokDayKey(at);
  if (!today || !day) return "earlier";
  if (day >= today) return "today";
  return day === addDays(today, -1) ? "yesterday" : "earlier";
}

/** Newest first, grouped Today / Yesterday / Earlier; empty groups dropped. */
export function groupActivityByDay(
  items: readonly AdminActivityItem[],
  now: Date,
): ActivityGroup[] {
  const sorted = [...items].sort(
    (a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0),
  );
  const buckets: Record<ActivityDayKey, AdminActivityItem[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };
  for (const item of sorted) buckets[activityDayOf(item.at, now)].push(item);
  return (Object.keys(buckets) as ActivityDayKey[])
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({ key, label: ACTIVITY_GROUP_LABEL[key], items: buckets[key] }));
}

/** The time shown on a feed row; the group heading already names the day. */
export function activityTimeLabel(at: string, group: ActivityDayKey, now: Date): string {
  if (group === "today") return relativeTime(at, now);
  if (group === "yesterday") return formatBangkokTime(at);
  return formatBangkokDateTime(at);
}
