import { at, makeCounts, makeShiftRound, makeStepsRow } from "@/components/admin/shift-rounds/__fixtures__/rounds";

import { closingChecklist, ideaDeadline, mentorFlags, quietDays } from "../checks";

// SHIFT[2]-like round: day 1 = Wed 14 Oct 2026 (Bangkok), sessions 1,2,4,6,7 at 19:00-21:00.
const round = makeShiftRound();
const codes = (flags: { code: string }[]) => flags.map((f) => f.code);
const labels = (flags: { label: string }[]) => flags.map((f) => f.label);

describe("ยังไม่เลือกไอเดีย (after the day 1 session, no ideas log)", () => {
  test("starts when the first session ends (21:00 Bangkok on day 1)", () => {
    expect(ideaDeadline(round).toISOString()).toBe("2026-10-14T14:00:00.000Z");
    const row = makeStepsRow({ last_log_at: null });
    expect(codes(mentorFlags(row, round, at(1, "20:59")))).not.toContain("no_idea");
    expect(labels(mentorFlags(row, round, at(1, "21:00")))).toContain("ยังไม่เลือกไอเดีย");
  });

  test("not flagged once there is an ideas log", () => {
    const row = makeStepsRow({ counts: makeCounts({ ideas: 1 }, { daily: { days: 1, need: 7, today_logged: true } }) });
    expect(codes(mentorFlags(row, round, at(1, "22:00")))).toEqual([]);
  });

  test("a round whose first session is day 2 waits for that session", () => {
    const later = makeShiftRound({ session_days: [2, 4, 6] });
    const row = makeStepsRow();
    expect(codes(mentorFlags(row, later, at(2, "20:00")))).not.toContain("no_idea");
    expect(codes(mentorFlags(row, later, at(2, "21:00")))).toContain("no_idea");
  });
});

describe("ยังไม่มีหลักฐานคุยกับคน (day 3+, no interview and no tester)", () => {
  const quiet = { daily: { days: 2, need: 7, today_logged: true } };
  test("day 2 never; day 3 when neither exists", () => {
    const none = makeStepsRow({ counts: makeCounts({ ideas: 1 }, quiet) });
    expect(codes(mentorFlags(none, round, at(2, "22:00")))).not.toContain("no_people");
    expect(labels(mentorFlags(none, round, at(3, "08:00")))).toContain("ยังไม่มีหลักฐานคุยกับคน");
  });

  test("one interview or one tester is enough", () => {
    const talked = makeStepsRow({ counts: makeCounts({ ideas: 1, interviews: 1 }, quiet) });
    const tested = makeStepsRow({ counts: makeCounts({ ideas: 1, testers: 1 }, quiet) });
    expect(codes(mentorFlags(talked, round, at(3, "08:00")))).toEqual([]);
    expect(codes(mentorFlags(tested, round, at(3, "08:00")))).toEqual([]);
  });
});

describe("เงียบ 2 วัน (no log for 2 full round days, or none since joining)", () => {
  const done = makeCounts({ ideas: 1, interviews: 1 });

  test("no log since joining on day 1: quiet 1 on day 2, flagged on day 3", () => {
    const row = makeStepsRow({ joined_day: 1, counts: done });
    expect(quietDays(row, round, at(2, "12:00"))).toBe(1);
    expect(codes(mentorFlags(row, round, at(2, "12:00")))).not.toContain("silent");
    expect(labels(mentorFlags(row, round, at(3, "00:00")))).toContain("เงียบ 2 วัน");
  });

  test("joined on day 3: days before joining don't count", () => {
    const row = makeStepsRow({ joined_day: 3, counts: done });
    expect(quietDays(row, round, at(4, "12:00"))).toBe(1);
    expect(quietDays(row, round, at(5, "00:00"))).toBe(2);
  });

  test("uses the Bangkok day of the last log, not the UTC date", () => {
    // 00:30 Bangkok on day 3 is still 2026-10-15 in UTC (day 2 there).
    const row = makeStepsRow({ last_log_at: "2026-10-15T17:30:00Z", counts: done });
    expect(quietDays(row, round, at(5, "12:00"))).toBe(1);
    expect(codes(mentorFlags(row, round, at(5, "12:00")))).not.toContain("silent");
    expect(labels(mentorFlags(row, round, at(6, "00:00")))).toContain("เงียบ 2 วัน");
    // 23:30 Bangkok on day 2.
    const late = makeStepsRow({ last_log_at: "2026-10-15T16:30:00Z", counts: done });
    expect(quietDays(late, round, at(5, "12:00"))).toBe(2);
  });

  test("counts up and says how long", () => {
    const row = makeStepsRow({ last_log_at: at(1, "20:00").toISOString(), counts: done });
    expect(mentorFlags(row, round, at(5, "09:00")).find((f) => f.code === "silent")).toMatchObject({
      label: "เงียบ 3 วัน",
      days: 3,
    });
  });

  test("a log today clears it", () => {
    const row = makeStepsRow({
      last_log_at: at(1, "20:00").toISOString(),
      counts: makeCounts({ ideas: 1, interviews: 1 }, { daily: { days: 1, need: 7, today_logged: true } }),
    });
    expect(quietDays(row, round, at(5, "09:00"))).toBe(0);
  });
});

describe("ขาดขั้น (day 6+, the steps still missing)", () => {
  const onTrack = { daily: { days: 5, need: 7, today_logged: false }, sessions: { attended: 3, held: 3, total: 5 } };

  test("lists missing missions; the demo is not due before the last day", () => {
    const row = makeStepsRow({
      last_log_at: at(5, "20:00").toISOString(),
      counts: makeCounts({ ideas: 1, interviews: 3, problem: 1, change: 1 }, onTrack),
    });
    expect(labels(mentorFlags(row, round, at(5, "22:00")))).toEqual([]);
    expect(labels(mentorFlags(row, round, at(6, "10:00")))).toEqual(["ขาดขั้น 4, 5"]);
    const lastDay = makeStepsRow({
      last_log_at: at(6, "20:00").toISOString(),
      counts: makeCounts(
        { ideas: 1, interviews: 3, problem: 1, change: 1 },
        { daily: { days: 6, need: 7, today_logged: false }, sessions: { attended: 4, held: 4, total: 5 } },
      ),
    });
    expect(mentorFlags(lastDay, round, at(7, "10:00")).find((f) => f.code === "missing_steps")?.steps).toEqual([4, 5, 7]);
  });

  test("includes the habits once they are broken: a skipped day (8) and a missed session (9)", () => {
    const row = makeStepsRow({
      last_log_at: at(5, "20:00").toISOString(),
      counts: makeCounts(
        { ideas: 1, interviews: 3, problem: 1, prototype: 1, testers: 3, change: 1 },
        { daily: { days: 4, need: 7, today_logged: false }, sessions: { attended: 2, held: 3, total: 5 } },
      ),
    });
    expect(labels(mentorFlags(row, round, at(6, "10:00")))).toEqual(["ขาดขั้น 8, 9"]);
  });
});

describe("outside the open round", () => {
  test("no checks before day 1 or after close", () => {
    const row = makeStepsRow();
    expect(mentorFlags(row, round, new Date("2026-10-13T16:59:59Z"))).toEqual([]);
    expect(mentorFlags(row, round, new Date("2026-10-20T17:00:00Z"))).toEqual([]);
  });

  test("after close the checklist covers every step, habits included", () => {
    const row = makeStepsRow({
      counts: makeCounts(
        { ideas: 1, interviews: 3, problem: 1, prototype: 1, testers: 3, change: 1, demo: 1 },
        { daily: { days: 6, need: 7, today_logged: false }, sessions: { attended: 5, held: 5, total: 5 } },
      ),
    });
    const list = closingChecklist(row, round, new Date("2026-10-21T03:00:00Z"));
    expect(list).toMatchObject({ done: 8, total: 9, missing: [8] });
  });
});
