/**
 * The analytics route used to sort oldest first and then limit, which kept
 * the OLDEST N days. These pin the fix: latest N days, returned oldest first.
 */

import {
  ANALYTICS_DEFAULT_DAYS,
  ANALYTICS_MAX_DAYS,
  latestDaysAscending,
  parseAnalyticsDays,
} from "../admin-hackathon-analytics";

const day = (date: string, unique_visitors = 1) => ({ date, unique_visitors });

describe("latestDaysAscending", () => {
  test("keeps the latest N days, oldest first, from newest-first rows", () => {
    const newestFirst = [day("2026-10-26"), day("2026-10-25"), day("2026-10-24"), day("2026-10-23")];
    expect(latestDaysAscending(newestFirst, 3).map((d) => d.date)).toEqual([
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
    ]);
  });

  test("gives the same answer whatever order the rows arrive in", () => {
    const shuffled = [day("2026-10-23"), day("2026-10-26"), day("2026-10-24"), day("2026-10-25")];
    expect(latestDaysAscending(shuffled, 2).map((d) => d.date)).toEqual(["2026-10-25", "2026-10-26"]);
  });

  test("never returns the oldest days when there are more rows than asked for", () => {
    const start = Date.UTC(2026, 7, 1);
    const rows = Array.from({ length: 60 }, (_, i) => day(new Date(start + i * 86_400_000).toISOString().slice(0, 10)));
    const result = latestDaysAscending(rows, 30);
    expect(result).toHaveLength(30);
    expect(result[0].date > rows[29].date).toBe(true);
    expect(result[29].date).toBe(rows[59].date);
  });

  test("drops rows without a date and handles empty input", () => {
    expect(latestDaysAscending([{ date: null, unique_visitors: 5 }, day("2026-10-01")], 30)).toEqual([day("2026-10-01")]);
    expect(latestDaysAscending([], 30)).toEqual([]);
    expect(latestDaysAscending([day("2026-10-01")], 0)).toEqual([]);
  });
});

describe("parseAnalyticsDays", () => {
  test("defaults, clamps and rejects junk", () => {
    expect(parseAnalyticsDays(null)).toBe(ANALYTICS_DEFAULT_DAYS);
    expect(parseAnalyticsDays("7")).toBe(7);
    expect(parseAnalyticsDays("0")).toBe(ANALYTICS_DEFAULT_DAYS);
    expect(parseAnalyticsDays("-5")).toBe(ANALYTICS_DEFAULT_DAYS);
    expect(parseAnalyticsDays("abc")).toBe(ANALYTICS_DEFAULT_DAYS);
    expect(parseAnalyticsDays("100000")).toBe(ANALYTICS_MAX_DAYS);
  });
});
