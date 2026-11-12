/**
 * Pure helpers for GET /api/admin/hackathon/analytics. The daily view is read
 * newest first (so `limit(days)` keeps the latest days), then flipped back to
 * oldest first for the chart.
 */

export const ANALYTICS_DEFAULT_DAYS = 30;
export const ANALYTICS_MAX_DAYS = 365;

export function parseAnalyticsDays(raw: string | null): number {
  if (!raw || !/^\d+$/.test(raw.trim())) return ANALYTICS_DEFAULT_DAYS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return ANALYTICS_DEFAULT_DAYS;
  return Math.min(n, ANALYTICS_MAX_DAYS);
}

/**
 * Keep the latest `days` rows and return them oldest first. Sorting here (not
 * just reversing) keeps the result right whatever order the rows arrive in.
 */
export function latestDaysAscending<T extends { date: string | null }>(rows: readonly T[], days: number): T[] {
  const dated = rows.filter((row): row is T & { date: string } => typeof row.date === "string");
  const newestFirst = [...dated].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return newestFirst.slice(0, Math.max(0, days)).reverse();
}
