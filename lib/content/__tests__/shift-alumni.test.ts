import {
  ALUMNI_DEFAULT_DOC,
  ALUMNI_PAST_SHOWN,
  ALUMNI_WEEKS_AHEAD,
  alumniCalendar,
  compactAlumniDoc,
  emptySession,
  googleCalendarUrl,
  isWeeklySession,
  longThaiDate,
  parseAlumniCalendarDoc,
  patchSession,
  removeSession,
  sessionDetails,
  sessionSteps,
  stepsLine,
  timeRangeLabel,
  weekdayKey,
  weekdayName,
} from "../shift-alumni";

const timed = { firstDate: "2026-10-17", startTime: "19:00", endTime: "20:30", place: "ออนไลน์ใน Discord" };
const plain = { defaults: ALUMNI_DEFAULT_DOC.defaults, sessions: [] };

describe("alumniCalendar", () => {
  it("repeats weekly from the first date, on its weekday", () => {
    const { upcoming, past } = alumniCalendar(plain, "2026-10-15");
    expect(past).toEqual([]);
    expect(upcoming).toHaveLength(ALUMNI_WEEKS_AHEAD);
    expect(upcoming.slice(0, 3).map((s) => s.date)).toEqual(["2026-10-17", "2026-10-24", "2026-10-31"]);
    expect(weekdayName(upcoming[0].date)).toBe("วันเสาร์");
  });

  it("keeps the announced Friday on the page as cancelled", () => {
    const [friday, saturday] = alumniCalendar(ALUMNI_DEFAULT_DOC, "2026-10-15").upcoming;
    expect(friday).toMatchObject({ date: "2026-10-16", cancelled: true });
    expect(saturday.date).toBe("2026-10-17");
  });

  it("moves the whole series when the first date moves", () => {
    const sunday = { ...plain, defaults: { ...plain.defaults, firstDate: "2026-10-18" } };
    const { upcoming } = alumniCalendar(sunday, "2026-10-15");
    expect(upcoming.slice(0, 2).map((s) => s.date)).toEqual(["2026-10-18", "2026-10-25"]);
  });

  it("counts today's session as upcoming and keeps recent ones newest first", () => {
    const { upcoming, past } = alumniCalendar(plain, "2026-12-05");
    expect(upcoming[0].date).toBe("2026-12-05");
    expect(upcoming).toHaveLength(ALUMNI_WEEKS_AHEAD);
    expect(past).toHaveLength(ALUMNI_PAST_SHOWN);
    expect(past[0].date).toBe("2026-11-28");
  });

  it("merges saved edits and one-off events into the series", () => {
    const doc = {
      ...plain,
      sessions: [
        { ...emptySession("2026-10-24"), topic: "Demo night" },
        { ...emptySession("2026-10-20"), topic: "นัดพิเศษ" },
      ],
    };
    const { upcoming } = alumniCalendar(doc, "2026-10-15");
    expect(upcoming.slice(0, 3).map((s) => [s.date, s.topic])).toEqual([
      ["2026-10-17", ""],
      ["2026-10-20", "นัดพิเศษ"],
      ["2026-10-24", "Demo night"],
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
    expect(doc?.defaults).toEqual({ firstDate: "2026-10-17", startTime: "", endTime: "", place: "Discord" });
    expect(doc?.sessions.map((s) => [s.date, s.topic])).toEqual([
      ["2026-10-16", "b"],
      ["2026-10-23", "c"],
    ]);
  });

  it("rejects bad times and an end before the start", () => {
    const base = { defaults: { place: "" }, sessions: [] };
    expect(parseAlumniCalendarDoc({ ...base, defaults: { startTime: "7pm" } })).toBeNull();
    expect(parseAlumniCalendarDoc({ ...base, defaults: { startTime: "20:00", endTime: "19:00" } })).toBeNull();
    expect(parseAlumniCalendarDoc({ ...base, defaults: { firstDate: "17/10" } })).toBeNull();
    expect(parseAlumniCalendarDoc(null)).toBeNull();
  });
});

describe("editing", () => {
  it("patches a generated Friday into the doc and removes it again", () => {
    const patched = patchSession(plain, "2026-10-17", { host: "มิว" });
    expect(patched.sessions).toEqual([{ ...emptySession("2026-10-17"), host: "มิว" }]);
    expect(removeSession(patched, "2026-10-17").sessions).toEqual([]);
  });

  it("drops untouched sessions before saving", () => {
    const doc = patchSession(patchSession(plain, "2026-10-17", { topic: "" }), "2026-10-24", {
      cancelled: true,
    });
    expect(compactAlumniDoc(doc).sessions.map((s) => s.date)).toEqual(["2026-10-24"]);
  });

  it("knows the weekly series from one-off dates", () => {
    expect(isWeeklySession("2026-10-17", "2026-10-17")).toBe(true);
    expect(isWeeklySession("2026-11-07", "2026-10-17")).toBe(true);
    expect(isWeeklySession("2026-10-16", "2026-10-17")).toBe(false);
    expect(isWeeklySession("2026-10-10", "2026-10-17")).toBe(false);
    expect(weekdayKey("2026-10-17")).toBe("sat");
  });
});

describe("session details and calendar links", () => {
  it("falls back to the defaults unless the session sets its own time", () => {
    const own = { ...emptySession("2026-10-17"), startTime: "18:00", endTime: "19:00" };
    const { firstDate: _, ...details } = timed;
    expect(sessionDetails(emptySession("2026-10-17"), timed)).toEqual(details);
    expect(sessionDetails(own, timed)).toMatchObject({ startTime: "18:00", endTime: "19:00" });
  });

  it("links to Google Calendar in Bangkok time once start and end are known", () => {
    const url = googleCalendarUrl({ ...emptySession("2026-10-17"), topic: "Build night" }, timed);
    const params = new URL(url!).searchParams;
    expect(params.get("dates")).toBe("20261017T190000/20261017T203000");
    expect(params.get("ctz")).toBe("Asia/Bangkok");
    expect(params.get("text")).toBe("AfterSHIFT: Build night");
  });

  it("has no link without a time or when cancelled", () => {
    const noTime = { ...timed, startTime: "", endTime: "" };
    expect(googleCalendarUrl(emptySession("2026-10-17"), noTime)).toBeNull();
    expect(googleCalendarUrl({ ...emptySession("2026-10-17"), cancelled: true }, timed)).toBeNull();
  });

  it("formats a time range, or nothing before a time is set", () => {
    expect(timeRangeLabel("19:00", "21:00")).toBe("19:00–21:00 น.");
    expect(timeRangeLabel("", "")).toBeNull();
  });
});

describe("page and poster copy", () => {
  it("writes the headline date with the full weekday", () => {
    expect(longThaiDate("2026-10-17")).toBe("เสาร์ 17 ต.ค.");
  });

  it("reads a topic written with dots as the run of the night, with English labels", () => {
    expect(sessionSteps("Icebreak: วาดโปรเจกต์ใน 60 วิ · Show & Tell: 2 นาที โชว์ของ · หาบัดดี้")).toEqual([
      { label: "Icebreak", text: "วาดโปรเจกต์ใน 60 วิ" },
      { label: "Show & Tell", text: "2 นาที โชว์ของ" },
      { label: null, text: "หาบัดดี้" },
    ]);
    expect(sessionSteps("Build night")).toEqual([{ label: null, text: "Build night" }]);
    expect(sessionSteps("")).toEqual([]);
  });

  it("does not mistake a Thai phrase with a time for a label", () => {
    expect(sessionSteps("เริ่ม 19:00 ตรง")).toEqual([{ label: null, text: "เริ่ม 19:00 ตรง" }]);
  });

  it("shortens the run to labels for the schedule", () => {
    expect(stepsLine("Icebreak: วาด · Show & Tell: โชว์ · หาบัดดี้")).toBe("Icebreak · Show & Tell · หาบัดดี้");
  });
});
