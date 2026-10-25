import {
  bangkokInstant,
  bangkokParts,
  blockInputSchema,
  layoutWeek,
  shortThaiDay,
  weekStart,
  type CalendarBlock,
} from "./core";

const block = (id: string, date: string, start: string, end: string): CalendarBlock => ({
  id,
  source: "block",
  kind: "meetup",
  title: id,
  startsAt: bangkokInstant(date, start),
  endsAt: bangkokInstant(date, end),
  place: null,
  note: null,
  boardUrl: null,
  createdBy: null,
  people: [],
  joined: false,
  canEdit: false,
});

describe("calendar time", () => {
  it("round-trips Bangkok dates and times", () => {
    expect(bangkokInstant("2026-10-25", "19:00")).toBe("2026-10-25T12:00:00.000Z");
    expect(bangkokParts("2026-10-25T18:30:00.000Z")).toEqual({ date: "2026-10-26", time: "01:30" });
  });

  it("finds the Monday of a week and names days in Thai", () => {
    expect(weekStart("2026-10-25")).toBe("2026-10-19");
    expect(weekStart("2026-10-19")).toBe("2026-10-19");
    expect(shortThaiDay("2026-10-25")).toBe("อา. 25 ต.ค.");
  });

  it("checks the form", () => {
    const ok = blockInputSchema.safeParse({ title: " Meetup ", date: "2026-10-25", start: "19:00", end: "20:00", place: "" });
    expect(ok.success && ok.data).toMatchObject({ title: "Meetup", kind: "meetup", place: null });
    expect(blockInputSchema.safeParse({ title: "x", date: "2026-10-25", start: "20:00", end: "19:00" }).success).toBe(false);
  });
});

describe("layoutWeek", () => {
  it("puts blocks in their day and side by side when they overlap", () => {
    const placed = layoutWeek(
      [
        block("a", "2026-10-20", "09:00", "11:00"),
        block("b", "2026-10-20", "10:00", "12:00"),
        block("c", "2026-10-20", "13:00", "14:00"),
        block("d", "2026-10-25", "19:00", "21:00"),
        block("other-week", "2026-10-27", "19:00", "21:00"),
      ],
      "2026-10-19",
      8,
      24,
    );
    const by = Object.fromEntries(placed.map((p) => [p.id, p]));
    expect(placed).toHaveLength(4);
    expect(by.a).toMatchObject({ day: 1, top: 60, height: 120, lane: 0, lanes: 2 });
    expect(by.b).toMatchObject({ lane: 1, lanes: 2 });
    expect(by.c).toMatchObject({ lane: 0, lanes: 1 });
    expect(by.d).toMatchObject({ day: 6, top: 660, height: 120 });
  });
});
