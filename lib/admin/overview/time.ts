/**
 * Bangkok calendar maths for the admin overview. Every count, series and
 * window is bucketed by the Bangkok day, the only calendar the team and the
 * programs run on. Asia/Bangkok has no daylight saving, so a fixed +07:00
 * offset is exact. Pure and client-safe; covered by
 * lib/admin/__tests__/time.test.ts.
 */

export const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** The Bangkok calendar day (YYYY-MM-DD) of an instant, or null if unreadable. */
export function bangkokDayKey(input: Date | string | number | null | undefined): string | null {
  if (input === null || input === undefined || input === "") return null;
  const ms = input instanceof Date ? input.getTime() : new Date(input).getTime();
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

/** The instant a Bangkok day starts (00:00 +07:00). */
export function bangkokDayStart(dayKey: string): Date {
  if (!DAY_KEY.test(dayKey)) throw new Error(`Not a day key: ${dayKey}`);
  return new Date(Date.parse(`${dayKey}T00:00:00.000Z`) - BANGKOK_OFFSET_MS);
}

/** Shift a day key by whole days. */
export function addDays(dayKey: string, days: number): string {
  const ms = Date.parse(`${dayKey}T00:00:00.000Z`) + days * DAY_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Whole days from one day key to another (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS,
  );
}

/** `count` consecutive Bangkok days ending today, oldest first. */
export function bangkokDayKeys(count: number, now: Date = new Date()): string[] {
  const today = bangkokDayKey(now) as string;
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) keys.push(addDays(today, -i));
  return keys;
}

/** ISO instant at which the first of `days` Bangkok days ending today begins. */
export function windowStartIso(days: number, now: Date = new Date()): string {
  return bangkokDayStart(bangkokDayKeys(days, now)[0]).toISOString();
}

/** ISO instant `hours` before now. */
export function hoursAgoIso(hours: number, now: Date = new Date()): string {
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
}

export interface DayPoint {
  at: string | null | undefined;
  amount?: number;
}

/**
 * Sum points into one bucket per day key (amount defaults to 1). Points
 * outside the days, or with unreadable timestamps, are ignored.
 */
export function bucketByBangkokDay(
  points: Iterable<DayPoint | string | null | undefined>,
  days: readonly string[],
): number[] {
  const index = new Map(days.map((day, i) => [day, i]));
  const buckets = days.map(() => 0);
  for (const point of points) {
    const at = typeof point === "object" && point !== null ? point.at : point;
    const amount = typeof point === "object" && point !== null ? (point.amount ?? 1) : 1;
    const i = index.get(bangkokDayKey(at) ?? "");
    if (i !== undefined && Number.isFinite(amount)) buckets[i] += amount;
  }
  return buckets;
}

/** Distinct ids per day key. */
export function distinctByBangkokDay(
  points: Iterable<{ id: string | null | undefined; at: string | null | undefined }>,
  days: readonly string[],
): Set<string>[] {
  const index = new Map(days.map((day, i) => [day, i]));
  const sets = days.map(() => new Set<string>());
  for (const { id, at } of points) {
    if (!id) continue;
    const i = index.get(bangkokDayKey(at) ?? "");
    if (i !== undefined) sets[i].add(id);
  }
  return sets;
}

export interface KpiWindows {
  /** Every day the KPI needs, oldest first: max(series, 2 x window). */
  days: string[];
  /** ISO instant to read rows from. */
  since: string;
  /** Length of the KPI window in days. */
  window: number;
  /** Length of the sparkline in days. */
  seriesDays: number;
}

/**
 * The days a KPI needs: a `window`-day value ending today, the same-length
 * window before it for the delta, and a `seriesDays` sparkline.
 */
export function kpiWindows(window: number, seriesDays: number, now: Date = new Date()): KpiWindows {
  const span = Math.max(seriesDays, window * 2);
  const days = bangkokDayKeys(span, now);
  return { days, since: bangkokDayStart(days[0]).toISOString(), window, seriesDays };
}

export interface WindowedTotals {
  value: number;
  previous: number;
  series: number[];
}

/** Value, previous window and sparkline from daily buckets over `kpiWindows().days`. */
export function windowTotals(buckets: readonly number[], windows: KpiWindows): WindowedTotals {
  const n = buckets.length;
  const sum = (from: number, to: number) =>
    buckets.slice(Math.max(0, from), Math.max(0, to)).reduce((total, v) => total + v, 0);
  return {
    value: sum(n - windows.window, n),
    previous: sum(n - 2 * windows.window, n - windows.window),
    series: buckets.slice(n - windows.seriesDays),
  };
}

/** Same as windowTotals, for distinct ids: a person active on 3 days counts once. */
export function windowDistinct(sets: readonly Set<string>[], windows: KpiWindows): WindowedTotals {
  const n = sets.length;
  const union = (from: number, to: number) => {
    const all = new Set<string>();
    for (const set of sets.slice(Math.max(0, from), Math.max(0, to))) {
      for (const id of set) all.add(id);
    }
    return all.size;
  };
  return {
    value: union(n - windows.window, n),
    previous: union(n - 2 * windows.window, n - windows.window),
    series: sets.slice(n - windows.seriesDays).map((s) => s.size),
  };
}
