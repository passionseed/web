/** @jest-environment node */
import { ALUMNI_DEFAULT_DOC, emptySession, type AlumniCalendarDoc } from "@/lib/content/shift-alumni";

import { alumniCalendarEvents, rsvpDates, withRsvpTotals } from "./alumni";
import { parseBrainEvent } from "./schema";

const BASE: AlumniCalendarDoc = {
  defaults: { firstDate: "2026-10-17", startTime: "19:00", endTime: "21:00", place: "Discord" },
  sessions: [],
};

const withSessions = (...sessions: AlumniCalendarDoc["sessions"]): AlumniCalendarDoc => ({ ...BASE, sessions });

describe("alumniCalendarEvents", () => {
  it("sends nothing when only the co-host, note or place changed", () => {
    const before = withSessions({ ...emptySession("2026-10-24"), topic: "Build night" });
    const after = withSessions({ ...emptySession("2026-10-24"), topic: "Build night", host: "Nong A", note: "x", place: "Zoom" });
    expect(alumniCalendarEvents(before, after)).toEqual([]);
  });

  it("reports a schedule change", () => {
    const after = { ...BASE, defaults: { ...BASE.defaults, firstDate: "2026-10-16", startTime: "18:00" } };
    expect(alumniCalendarEvents(BASE, after)).toEqual([
      { type: "alumni_schedule_changed", payload: { first_date: "2026-10-16", start_time: "18:00", end_time: "21:00" } },
    ]);
  });

  it("reports a one-off event as created and a weekly session filled in as changed", () => {
    const after = withSessions(
      { ...emptySession("2026-10-24"), topic: "Build night" },
      { ...emptySession("2026-10-28"), topic: "TCAS talk", startTime: "18:00", endTime: "19:30" },
    );
    expect(alumniCalendarEvents(BASE, after)).toEqual([
      {
        type: "alumni_session_changed",
        payload: { date: "2026-10-24", title: "Build night", start_time: "19:00", end_time: "21:00" },
      },
      {
        type: "alumni_session_created",
        payload: { date: "2026-10-28", title: "TCAS talk", start_time: "18:00", end_time: "19:30" },
      },
    ]);
  });

  it("reports cancelled sessions and deleted one-off events, once", () => {
    const before = withSessions(
      { ...emptySession("2026-10-24"), topic: "Build night" },
      { ...emptySession("2026-10-28"), topic: "TCAS talk" },
    );
    const after = withSessions({ ...emptySession("2026-10-24"), topic: "Build night", cancelled: true });
    const events = alumniCalendarEvents(before, after);
    expect(events).toEqual([
      { type: "alumni_session_cancelled", payload: { date: "2026-10-24", title: "Build night" } },
      { type: "alumni_session_cancelled", payload: { date: "2026-10-28", title: "TCAS talk" } },
    ]);
    expect(alumniCalendarEvents(after, after)).toEqual([]);
  });

  it("reports a restored session as changed", () => {
    const before = withSessions({ ...emptySession("2026-10-24"), cancelled: true });
    const after = withSessions({ ...emptySession("2026-10-24"), topic: "Back on" });
    expect(alumniCalendarEvents(before, after).map((e) => e.type)).toEqual(["alumni_session_changed"]);
  });

  it("is quiet on the first save of the default calendar", () => {
    expect(alumniCalendarEvents(ALUMNI_DEFAULT_DOC, ALUMNI_DEFAULT_DOC)).toEqual([]);
  });

  it("produces events the allowlist accepts", () => {
    const after = withSessions({ ...emptySession("2026-10-28"), topic: "TCAS talk", host: "Nong A" });
    for (const event of alumniCalendarEvents(BASE, after)) {
      expect(parseBrainEvent(event)).toEqual(event);
    }
  });
});

describe("RSVP totals", () => {
  it("adds counts to changed and cancelled sessions only", () => {
    const events = alumniCalendarEvents(
      withSessions({ ...emptySession("2026-10-24"), topic: "A" }),
      withSessions(
        { ...emptySession("2026-10-24"), topic: "A", cancelled: true },
        { ...emptySession("2026-10-28"), topic: "B" },
      ),
    );
    expect(rsvpDates(events)).toEqual(["2026-10-24"]);
    const out = withRsvpTotals(events, { "2026-10-24": 5, "2026-10-28": 9 });
    expect(out[0]).toEqual({ type: "alumni_session_cancelled", payload: { date: "2026-10-24", title: "A", rsvps: 5 } });
    expect(out[1].payload).not.toHaveProperty("rsvps");
  });
});
