import { emptySession } from "@/lib/content/shift-alumni";

import { groupRsvps, personKey } from "./alumniRsvpSummary";

const rsvp = (session_date: string, nickname: string, cohort: string) => ({
  session_date,
  nickname,
  cohort,
  created_at: "2026-10-16T12:00:00Z",
});

describe("groupRsvps", () => {
  it("groups by session, counts rounds, and marks feedback answers", () => {
    const sessions = [emptySession("2026-10-17"), emptySession("2026-10-24")];
    const feedback = new Set([personKey(" มิว ", "SHIFT[1]")]);
    const [first, second] = groupRsvps(
      sessions,
      [rsvp("2026-10-17", "มิว", "SHIFT[1]"), rsvp("2026-10-17", "Andy", "SHIFT[1]"), rsvp("2026-10-17", "โต้", "SHIFT[0]")],
      feedback,
    );
    expect(first.rsvps.map((r) => [r.nickname, r.answeredFeedback])).toEqual([
      ["มิว", true],
      ["Andy", false],
      ["โต้", false],
    ]);
    expect(first.byCohort).toEqual({ "SHIFT[1]": 2, "SHIFT[0]": 1 });
    expect(second.rsvps).toEqual([]);
  });

  it("matches nicknames without caring about case or spaces, but not across rounds", () => {
    expect(personKey("Andy ", "SHIFT[1]")).toBe(personKey("andy", "SHIFT[1]"));
    expect(personKey("Andy", "SHIFT[0]")).not.toBe(personKey("Andy", "SHIFT[1]"));
  });
});
