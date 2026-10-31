/** @jest-environment node */
import {
  addDays,
  bangkokDayKey,
  bangkokDayKeys,
  bangkokDayStart,
  bucketByBangkokDay,
  daysBetween,
  distinctByBangkokDay,
  kpiWindows,
  windowDistinct,
  windowStartIso,
  windowTotals,
} from "@/lib/admin/overview/time";

describe("Bangkok day keys", () => {
  test("an instant belongs to the Bangkok calendar day, not the UTC one", () => {
    // 16:59 UTC is 23:59 in Bangkok; 17:00 UTC is already the next Bangkok day.
    expect(bangkokDayKey("2026-10-25T16:59:59.999Z")).toBe("2026-10-25");
    expect(bangkokDayKey("2026-10-25T17:00:00.000Z")).toBe("2026-10-26");
    expect(bangkokDayKey(new Date("2026-10-26T00:30:00+07:00"))).toBe("2026-10-26");
  });

  test("unreadable timestamps are null, not a wrong day", () => {
    expect(bangkokDayKey(null)).toBeNull();
    expect(bangkokDayKey("")).toBeNull();
    expect(bangkokDayKey("not a date")).toBeNull();
  });

  test("a Bangkok day starts at 17:00 UTC the day before", () => {
    expect(bangkokDayStart("2026-10-26").toISOString()).toBe("2026-10-25T17:00:00.000Z");
    expect(() => bangkokDayStart("26/10/2026")).toThrow();
  });

  test("day arithmetic crosses month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(daysBetween("2026-10-26", "2026-11-07")).toBe(12);
    expect(daysBetween("2026-11-07", "2026-10-26")).toBe(-12);
  });

  test("consecutive days end today in Bangkok, oldest first", () => {
    const now = new Date("2026-10-25T18:00:00Z"); // 01:00 on the 26th in Bangkok
    expect(bangkokDayKeys(3, now)).toEqual(["2026-10-24", "2026-10-25", "2026-10-26"]);
    expect(windowStartIso(3, now)).toBe("2026-10-23T17:00:00.000Z");
  });
});

describe("bucketing", () => {
  const days = ["2026-10-24", "2026-10-25", "2026-10-26"];

  test("counts and sums per Bangkok day, ignoring points outside the days", () => {
    expect(
      bucketByBangkokDay(
        [
          "2026-10-23T17:00:00Z", // 24th 00:00 Bangkok
          "2026-10-24T16:59:00Z", // 24th 23:59 Bangkok
          "2026-10-24T17:00:00Z", // 25th
          "2026-10-22T00:00:00Z", // before the range
          null,
          "garbage",
        ],
        days,
      ),
    ).toEqual([2, 1, 0]);
    expect(
      bucketByBangkokDay(
        [
          { at: "2026-10-26T03:00:00Z", amount: 690 },
          { at: "2026-10-26T04:00:00Z", amount: 1490 },
          { at: "2026-10-25T04:00:00Z", amount: Number.NaN },
        ],
        days,
      ),
    ).toEqual([0, 0, 2180]);
  });

  test("distinct ids per day drop repeats and missing ids", () => {
    const sets = distinctByBangkokDay(
      [
        { id: "a", at: "2026-10-25T01:00:00Z" },
        { id: "a", at: "2026-10-25T02:00:00Z" },
        { id: "b", at: "2026-10-25T03:00:00Z" },
        { id: null, at: "2026-10-25T03:00:00Z" },
        { id: "a", at: "2026-10-26T03:00:00Z" },
      ],
      days,
    );
    expect(sets.map((s) => s.size)).toEqual([0, 2, 1]);
  });
});

describe("KPI windows", () => {
  const now = new Date("2026-10-26T05:00:00Z");

  test("a 7-day KPI with a 30-day sparkline reads 30 days", () => {
    const w = kpiWindows(7, 30, now);
    expect(w.days).toHaveLength(30);
    expect(w.days[29]).toBe("2026-10-26");
    expect(w.since).toBe(bangkokDayStart(w.days[0]).toISOString());
  });

  test("a 30-day KPI reads 60 days so the previous window is complete", () => {
    const w = kpiWindows(30, 30, now);
    expect(w.days).toHaveLength(60);
    expect(w.days[0]).toBe("2026-08-28");
  });

  test("value is the last window, previous the one before, series the last N days", () => {
    const w = kpiWindows(7, 10, now);
    // 14 days (2 x 7 > 10): days 0-6 are previous, 7-13 current.
    const buckets = Array.from({ length: 14 }, (_, i) => i + 1);
    const totals = windowTotals(buckets, w);
    expect(totals.value).toBe(8 + 9 + 10 + 11 + 12 + 13 + 14);
    expect(totals.previous).toBe(1 + 2 + 3 + 4 + 5 + 6 + 7);
    expect(totals.series).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });

  test("distinct windows count a person once across days", () => {
    const w = kpiWindows(2, 4, now);
    const sets = [new Set(["a"]), new Set(["a", "b"]), new Set(["a"]), new Set(["a", "c"])];
    expect(windowDistinct(sets, w)).toEqual({ value: 2, previous: 2, series: [1, 2, 1, 2] });
  });
});
