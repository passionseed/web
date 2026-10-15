import {
  ALUMNI_DEFAULT_DOC,
  ALUMNI_PAST_SHOWN,
  ALUMNI_WEEKS_AHEAD,
  alumniCalendar,
  compactAlumniDoc,
  emptySession,
  googleCalendarUrl,
  isWeeklySession,
  parseAlumniCalendarDoc,
  patchSession,
  removeSession,
  sessionDetails,
} from "../shift-alumni";

const timed = { startTime: "19:00", endTime: "20:30", place: "ออนไลน์ใน Discord" };

describe("alumniCalendar", () => {
  it("lists the weekly Fridays from the first session", () => {
    const { upcoming, past } = alumniCalendar(ALUMNI_DEFAULT_DOC, "2026-10-14");
    expect(past).toEqual([]);
    expect(upcoming).toHaveLength(ALUMNI_WEEKS_AHEAD);
    expect(upcoming.slice(0, 3).map((s) => s.date)).toEqual(["2026-10-16", "2026-10-23", "2026-10-30"]);
  });

  it("counts today's session as upcoming and keeps recent ones newest first", () => {
    const { upcoming, past } = alumniCalendar(ALUMNI_DEFAULT_DOC, "2026-12-04");
    expect(upcoming[0].date).toBe("2026-12-04");
    expect(upcoming).toHaveLength(ALUMNI_WEEKS_AHEAD);
    expect(past).toHaveLength(ALUMNI_PAST_SHOWN);
    expect(past[0].date).toBe("2026-11-27");
  });

  it("merges saved edits and one-off events into the series", () => {
    const doc = {
      ...ALUMNI_DEFAULT_DOC,
      sessions: [
        { ...emptySession("2026-10-23"), topic: "Demo night" },
        { ...emptySession("2026-10-20"), topic: "นัดพิเศษ" },
      ],
    };
    const { upcoming } = alumniCalendar(doc, "2026-10-14");
    expect(upcoming.slice(0, 3).map((s) => [s.date, s.topic])).toEqual([
      ["2026-10-16", ""],
      ["2026-10-20", "นัดพิเศษ"],
      ["2026-10-23", "Demo night"],
    ]);
  });
});

describe("parseAlumniCalendarDoc", () => {
  it("fills missing fields and keeps one entry per date", () => {
    const doc = parseAlumniCalendarDoc({
      defaults: { place: "Discord" },
      sessions: [
        { date: "2026-10-23", topic: "a" },
        { date: "2026-10-16", topic: "b" },
        { date: "2026-10-23", topic: "c" },
      ],
    });
    expect(doc?.defaults).toEqual({ startTime: "", endTime: "", place: "Discord" });
    expect(doc?.sessions.map((s) => [s.date, s.topic])).toEqual([
      ["2026-10-16", "b"],
      ["2026-10-23", "c"],
    ]);
  });

  it("rejects bad times and an end before the start", () => {
    const base = { defaults: { place: "" }, sessions: [] };
    expect(parseAlumniCalendarDoc({ ...base, defaults: { startTime: "7pm" } })).toBeNull();
    expect(parseAlumniCalendarDoc({ ...base, defaults: { startTime: "20:00", endTime: "19:00" } })).toBeNull();
    expect(parseAlumniCalendarDoc(null)).toBeNull();
  });
});

describe("editing", () => {
  it("patches a generated Friday into the doc and removes it again", () => {
    const patched = patchSession(ALUMNI_DEFAULT_DOC, "2026-10-16", { host: "มิว" });
    expect(patched.sessions).toEqual([{ ...emptySession("2026-10-16"), host: "มิว" }]);
    expect(removeSession(patched, "2026-10-16").sessions).toEqual([]);
  });

  it("drops untouched sessions before saving", () => {
    const doc = patchSession(patchSession(ALUMNI_DEFAULT_DOC, "2026-10-16", { topic: "" }), "2026-10-23", {
      cancelled: true,
    });
    expect(compactAlumniDoc(doc).sessions.map((s) => s.date)).toEqual(["2026-10-23"]);
  });

  it("knows the weekly series from one-off dates", () => {
    expect(isWeeklySession("2026-10-16")).toBe(true);
    expect(isWeeklySession("2026-11-06")).toBe(true);
    expect(isWeeklySession("2026-10-20")).toBe(false);
    expect(isWeeklySession("2026-10-09")).toBe(false);
  });
});

describe("session details and calendar links", () => {
  it("falls back to the defaults unless the session sets its own time", () => {
    const own = { ...emptySession("2026-10-16"), startTime: "18:00", endTime: "19:00" };
    expect(sessionDetails(emptySession("2026-10-16"), timed)).toEqual(timed);
    expect(sessionDetails(own, timed)).toMatchObject({ startTime: "18:00", endTime: "19:00" });
  });

  it("links to Google Calendar in Bangkok time once start and end are known", () => {
    const url = googleCalendarUrl({ ...emptySession("2026-10-16"), topic: "Build night" }, timed);
    const params = new URL(url!).searchParams;
    expect(params.get("dates")).toBe("20261016T190000/20261016T203000");
    expect(params.get("ctz")).toBe("Asia/Bangkok");
    expect(params.get("text")).toBe("SHIFT Alumni: Build night");
  });

  it("has no link without a time or when cancelled", () => {
    expect(googleCalendarUrl(emptySession("2026-10-16"), ALUMNI_DEFAULT_DOC.defaults)).toBeNull();
    expect(googleCalendarUrl({ ...emptySession("2026-10-16"), cancelled: true }, timed)).toBeNull();
  });
});
