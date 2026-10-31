/** Days are Bangkok days, the clock SHIFT and its ads run on. */
const BANGKOK_OFFSET = "+07:00";
const DAY_MS = 86_400_000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDay(value: unknown): value is string {
  return typeof value === "string" && ISO_DAY.test(value) && !Number.isNaN(Date.parse(value));
}

/** "2026-10-22" for the Bangkok calendar day containing `at`. */
export function bangkokDay(at: Date = new Date()): string {
  return at.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Every day from `since` to `until`, both inclusive. */
export function daysBetween(since: string, until: string): string[] {
  const days: string[] = [];
  for (let day = since; day <= until; day = addDays(day, 1)) days.push(day);
  return days;
}

/** Unix seconds at Bangkok midnight starting `day`. */
export function bangkokDayStartUnix(day: string): number {
  return Math.floor(Date.parse(`${day}T00:00:00${BANGKOK_OFFSET}`) / 1000);
}

export interface DayRange {
  since: string;
  until: string;
}

/**
 * The range a scheduled run refreshes: the last `days` complete days. Meta
 * keeps revising insights for about two days, so the cron overlaps runs.
 */
export function trailingRange(days: number, now: Date = new Date()): DayRange {
  const until = addDays(bangkokDay(now), -1);
  return { since: addDays(until, -(days - 1)), until };
}
