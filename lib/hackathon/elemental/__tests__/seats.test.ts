import { addDays, bangkokDate, daysBetween } from "../bangkok-date";
import {
  expectedSeatsOn,
  forecastByClose,
  formatRate,
  neededPerDay,
  paceLine,
  paidLast24h,
  paidOn,
  paidPerDay,
  runRate3d,
  seatPace,
  sourceKey,
  summarizeRegistrations,
  type RegistrationTotalsRow,
} from "../seats";

const row = (p: Partial<RegistrationTotalsRow>): RegistrationTotalsRow => ({
  status: "paid",
  memberCount: 1,
  source: null,
  createdAt: "2026-11-21T03:00:00Z",
  paidAt: null,
  ...p,
});

describe("bangkokDate", () => {
  it("uses Bangkok's calendar day, not UTC's", () => {
    // 18:00 UTC on 25 Nov is already 26 Nov in Bangkok.
    expect(bangkokDate(new Date("2026-11-25T18:00:00Z"))).toBe("2026-11-26");
    expect(bangkokDate(new Date("2026-11-25T16:59:59Z"))).toBe("2026-11-25");
  });

  it("adds and counts days across a month end", () => {
    expect(addDays("2026-11-30", 2)).toBe("2026-12-02");
    expect(daysBetween("2026-11-26", "2026-12-03")).toBe(7);
  });
});

describe("expectedSeatsOn", () => {
  it("hits every checkpoint on its own day", () => {
    expect(expectedSeatsOn("2026-11-26")).toBe(50);
    expect(expectedSeatsOn("2026-11-30")).toBe(150);
    expect(expectedSeatsOn("2026-12-01")).toBe(250);
    expect(expectedSeatsOn("2026-12-03")).toBe(350);
  });

  it("draws a straight line between checkpoints, rounded up", () => {
    // 0 on 20 Nov to 50 on 26 Nov: 3 of 6 days.
    expect(expectedSeatsOn("2026-11-23")).toBe(25);
    // 50 on 26 Nov to 150 on 30 Nov: 2 of 4 days.
    expect(expectedSeatsOn("2026-11-28")).toBe(100);
    // 250 on 1 Dec to 350 on 3 Dec: 1 of 2 days.
    expect(expectedSeatsOn("2026-12-02")).toBe(300);
    // 1 of 6 days of 50 is 8.33, rounded up.
    expect(expectedSeatsOn("2026-11-21")).toBe(9);
  });

  it("is 0 before sign-up opened and the full target after the last checkpoint", () => {
    expect(expectedSeatsOn("2026-11-01")).toBe(0);
    expect(expectedSeatsOn("2026-12-06")).toBe(350);
  });
});

describe("seatPace", () => {
  it("says behind by the gap to the line at the end of yesterday", () => {
    // End of 22 Nov: 2 of 6 days of 50 is 16.7, rounded up to 17.
    const p = seatPace(12, "2026-11-23");
    expect(p.expectedNow).toBe(17);
    expect(p.expectedToday).toBe(25);
    expect(p.status).toBe("behind");
    expect(p.behindBy).toBe(5);
    expect(p.next).toEqual({ by: "2026-11-26", seats: 50 });
    expect(p.daysToNext).toBe(3);
    expect(p.neededForNext).toBe(38);
  });

  it("is not behind in the morning when exactly on yesterday's line", () => {
    // 9 paid is the line for the end of 21 Nov; on 22 Nov that is on track.
    expect(seatPace(9, "2026-11-22")).toMatchObject({ status: "on_track", behindBy: 0, expectedToday: 17 });
  });

  it("says on track when at or above the line", () => {
    expect(seatPace(17, "2026-11-23")).toMatchObject({ status: "on_track", behindBy: 0, aheadBy: 0 });
    expect(seatPace(60, "2026-11-23")).toMatchObject({ status: "on_track", aheadBy: 43, neededForNext: 0 });
  });

  it("moves to the next checkpoint the day after one passes", () => {
    const p = seatPace(45, "2026-11-27");
    expect(p.next).toEqual({ by: "2026-11-30", seats: 150 });
    expect(p.expectedToday).toBe(75);
    expect(p.expectedNow).toBe(50);
    expect(p.behindBy).toBe(5);
  });

  it("has no next checkpoint after registration closes", () => {
    const p = seatPace(300, "2026-12-04");
    expect(p.next).toBeNull();
    expect(p.daysToNext).toBeNull();
    expect(p.neededForNext).toBe(50);
    expect(p.behindBy).toBe(50);
  });
});

describe("summarizeRegistrations", () => {
  const now = new Date("2026-11-22T12:00:00Z");

  it("counts paid people, not sign-ups, and keeps the other states apart", () => {
    const t = summarizeRegistrations(
      [
        row({ status: "paid", memberCount: 3, source: "ig" }),
        row({ status: "paid", memberCount: 1, source: null }),
        row({ status: "paid", memberCount: 2, source: " IG " }),
        row({ status: "pending", memberCount: 4, source: "ig", createdAt: "2026-11-22T06:00:00Z" }),
        row({ status: "pending", memberCount: 2, source: "line", createdAt: "2026-11-20T06:00:00Z" }),
        row({ status: "review", memberCount: 2, source: null }),
        row({ status: "cancelled", memberCount: 5, source: "line" }),
      ],
      now,
    );
    expect(t).toEqual({
      paidSeats: 6,
      paidSignups: 3,
      unpaidSignups: 2,
      unpaidPeople: 6,
      unpaidFreshPeople: 4,
      unpaidStalePeople: 2,
      slipsToCheck: 1,
      reviewPeople: 2,
      sources: [
        { source: "ig", signups: 3, paidSignups: 2, paidSeats: 5, rate: 2 / 3 },
        { source: "direct", signups: 2, paidSignups: 1, paidSeats: 1, rate: 0.5 },
        { source: "line", signups: 1, paidSignups: 0, paidSeats: 0, rate: 0 },
      ],
    });
  });

  it("treats a pending row with no time as older than a day", () => {
    const t = summarizeRegistrations([row({ status: "pending", memberCount: 2, createdAt: null })], now);
    expect([t.unpaidFreshPeople, t.unpaidStalePeople]).toEqual([0, 2]);
  });
});

describe("sourceKey", () => {
  it("trims, lower-cases and caps at 40 characters", () => {
    expect(sourceKey("  IG_Story ")).toBe("ig_story");
    expect(sourceKey("")).toBe("direct");
    expect(sourceKey(null)).toBe("direct");
    expect(sourceKey("x".repeat(60))).toHaveLength(40);
  });
});

describe("neededPerDay", () => {
  it("spreads what is left over the days left, today included, rounded up", () => {
    // 21 to 26 Nov is 6 selling days: 50 / 6 = 8.3, so 9.
    expect(neededPerDay(0, 50, "2026-11-21", "2026-11-26")).toBe(9);
    expect(neededPerDay(12, 50, "2026-11-24", "2026-11-26")).toBe(13);
    expect(neededPerDay(10, 50, "2026-11-26", "2026-11-26")).toBe(40);
  });

  it("is 0 once reached and null after the date", () => {
    expect(neededPerDay(60, 50, "2026-11-24", "2026-11-26")).toBe(0);
    expect(neededPerDay(10, 50, "2026-11-27", "2026-11-26")).toBeNull();
  });
});

describe("paid timing", () => {
  const rows = [
    row({ memberCount: 2, paidAt: "2026-11-21T02:00:00Z" }), // 21 Nov 09:00 Bangkok
    row({ memberCount: 1, paidAt: "2026-11-21T18:00:00Z" }), // 22 Nov 01:00 Bangkok
    row({ memberCount: 3, paidAt: "2026-11-23T05:00:00Z" }), // 23 Nov
    row({ memberCount: 1, paidAt: null, createdAt: "2026-11-23T06:00:00Z" }), // paid, no paid_at: use created_at
    row({ status: "pending", memberCount: 4, createdAt: "2026-11-23T05:00:00Z" }),
    row({ status: "review", memberCount: 2, paidAt: null }),
  ];

  it("counts seats paid on a Bangkok day", () => {
    expect(paidOn(rows, "2026-11-21")).toBe(2);
    expect(paidOn(rows, "2026-11-22")).toBe(1);
    expect(paidOn(rows, "2026-11-23")).toBe(4);
  });

  it("counts seats paid in the last 24 hours", () => {
    expect(paidLast24h(rows, new Date("2026-11-23T12:00:00Z"))).toBe(4);
    expect(paidLast24h(rows, new Date("2026-11-22T01:00:00Z"))).toBe(3);
  });

  it("averages over the last three days", () => {
    // 24 Nov 12:00 UTC: window from 21 Nov 12:00 UTC holds 1 + 3 + 1 seats.
    expect(runRate3d(rows, new Date("2026-11-24T12:00:00Z"))).toBeCloseTo(5 / 3);
  });

  it("uses the time since promotion started, at least a day, before three days have passed", () => {
    // 21 Nov 12:00 Bangkok: half a day in, counted as one day.
    expect(runRate3d(rows, new Date("2026-11-21T05:00:00Z"))).toBe(2);
    // 23 Nov 00:00 Bangkok: two days in, 3 seats.
    expect(runRate3d(rows, new Date("2026-11-22T17:00:00Z"))).toBe(1.5);
    // Before promotion started there is no rate.
    expect(runRate3d(rows, new Date("2026-11-20T10:00:00Z"))).toBe(0);
  });

  it("lays out one cell per day from the pace start to the close", () => {
    const cells = paidPerDay(rows, "2026-11-23");
    expect(cells).toHaveLength(13);
    expect(cells[0]).toEqual({ date: "2026-11-21", seats: 2, when: "past" });
    expect(cells[2]).toEqual({ date: "2026-11-23", seats: 4, when: "today" });
    expect(cells[12]).toEqual({ date: "2026-12-03", seats: 0, when: "future" });
  });
});

describe("forecastByClose", () => {
  it("runs the rate on to the end of 3 Dec, Bangkok time", () => {
    // 3 Dec 00:00 Bangkok leaves one full day.
    expect(forecastByClose(100, 10, new Date("2026-12-02T17:00:00Z"))).toBe(110);
    // 21 Nov 00:00 Bangkok leaves 13 days.
    expect(forecastByClose(0, 2, new Date("2026-11-20T17:00:00Z"))).toBe(26);
    // After the close nothing more comes in.
    expect(forecastByClose(300, 10, new Date("2026-12-05T00:00:00Z"))).toBe(300);
  });
});

describe("paceLine", () => {
  it("puts the numbers for the one-line pace together", () => {
    const rows = [row({ memberCount: 4, paidAt: "2026-11-21T03:00:00Z" })];
    const now = new Date("2026-11-21T10:00:00Z"); // 17:00 Bangkok on 21 Nov
    const p = paceLine(rows, 4, now);
    expect(p.toNext).toEqual({ perDay: 8, seats: 50, by: "2026-11-26" });
    expect(p.toTarget).toEqual({ perDay: 27, seats: 350, by: "2026-12-03" });
    expect(p.rate3d).toBe(4);
    expect(p.paidToday).toBe(4);
    expect(p.paidLast24h).toBe(4);
    expect(p.forecast).toBe(4 + Math.floor(4 * (12 + 7 / 24)));
    expect(p.days).toHaveLength(13);
  });

  it("has no next checkpoint or target after the close", () => {
    const p = paceLine([], 300, new Date("2026-12-04T05:00:00Z"));
    expect(p.toNext).toBeNull();
    expect(p.toTarget).toBeNull();
  });
});

describe("formatRate", () => {
  it("shows at most one decimal", () => {
    expect(formatRate(2)).toBe("2");
    expect(formatRate(5 / 3)).toBe("1.7");
    expect(formatRate(0)).toBe("0");
  });
});
