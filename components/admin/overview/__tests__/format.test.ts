import type { AdminActivityItem } from "@/lib/admin/console";

import {
  activityDayOf,
  activityTimeLabel,
  addDays,
  bangkokDayKey,
  daysBetween,
  formatBaht,
  formatBangkokDateTime,
  formatBangkokLongDate,
  formatCompact,
  formatDayKey,
  formatKpiValue,
  formatNumber,
  groupActivityByDay,
  kpiDelta,
  percentOf,
  relativeTime,
} from "../format";

// Monday 26 October 2026, 12:00 in Bangkok.
const NOW = new Date("2026-10-26T05:00:00Z");

describe("numbers", () => {
  it("groups thousands and formats baht", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatBaht(12340)).toBe("฿12,340");
    expect(formatBaht(-500)).toBe("−฿500");
    expect(formatCompact(1234)).toBe("1.2K");
    expect(formatCompact(12)).toBe("12");
  });

  it("formats KPI values by kind", () => {
    expect(formatKpiValue({ value: 12340, format: "baht" })).toEqual({ text: "฿12,340" });
    expect(formatKpiValue({ value: 12, format: "ratio", total: 30 })).toEqual({
      text: "12/30",
      spoken: "12 of 30",
    });
    expect(formatKpiValue({ value: 4321, format: "number" })).toEqual({ text: "4,321" });
    expect(formatKpiValue({ value: null, format: "number" })).toBeNull();
  });

  it("clamps bar widths", () => {
    expect(percentOf(12, 30)).toBe(40);
    expect(percentOf(40, 30)).toBe(100);
    expect(percentOf(3, 0)).toBe(0);
  });
});

describe("kpiDelta", () => {
  it("shows a signed percentage against the previous window", () => {
    expect(kpiDelta(112, 100)).toEqual({
      direction: "up",
      label: "+12%",
      description: "Up 12% from the previous period",
    });
    expect(kpiDelta(97, 100)).toMatchObject({ direction: "down", label: "−3%" });
    expect(kpiDelta(100.4, 100)).toMatchObject({ label: "+0.4%" });
  });

  it("calls an unchanged value flat", () => {
    expect(kpiDelta(5, 5)).toMatchObject({ direction: "flat", label: "0%" });
  });

  it("uses the absolute change when the previous window was zero", () => {
    expect(kpiDelta(5, 0)).toEqual({
      direction: "up",
      label: "+5",
      description: "Up 5 from zero in the previous period",
    });
    expect(kpiDelta(1200, 0, "baht")).toMatchObject({ label: "+฿1,200" });
  });

  it("has nothing to say without both values", () => {
    expect(kpiDelta(5, null)).toBeNull();
    expect(kpiDelta(5, undefined)).toBeNull();
    expect(kpiDelta(null, 5)).toBeNull();
  });
});

describe("Bangkok calendar", () => {
  it("buckets instants by the Bangkok day, not UTC", () => {
    expect(bangkokDayKey("2026-10-25T17:30:00Z")).toBe("2026-10-26"); // 00:30 Bangkok
    expect(bangkokDayKey("2026-10-25T16:30:00Z")).toBe("2026-10-25"); // 23:30 Bangkok
    expect(bangkokDayKey("not a date")).toBeNull();
  });

  it("does day arithmetic on keys", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-10-26", "2026-11-07")).toBe(12);
    expect(daysBetween("2026-10-26", "2026-10-20")).toBe(-6);
  });

  it("labels dates for people", () => {
    expect(formatBangkokLongDate(NOW)).toBe("Monday 26 October");
    expect(formatDayKey("2026-11-07")).toBe("Sat 7 Nov");
    expect(formatBangkokDateTime("2026-10-25T16:30:00Z")).toBe("Sun 25 Oct, 23:30");
  });

  it("describes recent times relatively", () => {
    expect(relativeTime("2026-10-26T04:59:30Z", NOW)).toBe("just now");
    expect(relativeTime("2026-10-26T05:00:30Z", NOW)).toBe("just now");
    expect(relativeTime("2026-10-26T04:55:00Z", NOW)).toBe("5 minutes ago");
    expect(relativeTime("2026-10-26T02:00:00Z", NOW)).toBe("3 hours ago");
  });
});

describe("groupActivityByDay", () => {
  const item = (id: string, at: string): AdminActivityItem => ({
    id,
    kind: "application",
    at,
    title: id,
  });

  it("groups newest first into Today, Yesterday and Earlier", () => {
    const groups = groupActivityByDay(
      [
        item("old", "2026-10-20T03:00:00Z"),
        item("late-yesterday", "2026-10-25T16:30:00Z"), // 23:30 on the 25th
        item("just-after-midnight", "2026-10-25T17:30:00Z"), // 00:30 on the 26th
        item("this-morning", "2026-10-26T02:00:00Z"),
      ],
      NOW,
    );
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday", "Earlier"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["this-morning", "just-after-midnight"]);
    expect(groups[1].items.map((i) => i.id)).toEqual(["late-yesterday"]);
    expect(groups[2].items.map((i) => i.id)).toEqual(["old"]);
  });

  it("drops empty groups and handles an empty feed", () => {
    expect(groupActivityByDay([], NOW)).toEqual([]);
    const groups = groupActivityByDay([item("a", "2026-10-26T01:00:00Z")], NOW);
    expect(groups.map((g) => g.key)).toEqual(["today"]);
  });

  it("puts unreadable times in Earlier", () => {
    expect(activityDayOf("garbage", NOW)).toBe("earlier");
  });

  it("names the time to match its group heading", () => {
    expect(activityTimeLabel("2026-10-26T04:00:00Z", "today", NOW)).toBe("1 hour ago");
    expect(activityTimeLabel("2026-10-25T16:30:00Z", "yesterday", NOW)).toBe("23:30");
    expect(activityTimeLabel("2026-10-20T03:00:00Z", "earlier", NOW)).toBe("Tue 20 Oct, 10:00");
  });
});
