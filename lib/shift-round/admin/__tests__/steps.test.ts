import { at, makeCounts, makeShiftRound } from "@/components/admin/shift-rounds/__fixtures__/rounds";

import { compareRisk, csvCell, sessionEndAt, stepsCsv, stepsDone, studentSteps } from "../steps";

const round = makeShiftRound();

describe("studentSteps (the 9 SHIFT steps)", () => {
  test("missions 1-7 from the config, then daily (days/need) and sessions (attended/held)", () => {
    const counts = makeCounts(
      { ideas: 1, interviews: 2, problem: 1 },
      { daily: { days: 2, need: 7, today_logged: true }, sessions: { attended: 1, held: 1, total: 5 } },
    );
    const steps = studentSteps(counts);
    expect(steps.map((s) => [s.n, s.key, s.text, s.state])).toEqual([
      [1, "ideas", "✓", "done"],
      [2, "interviews", "2/3", "partial"],
      [3, "problem", "✓", "done"],
      [4, "prototype", "0/1", "todo"],
      [5, "testers", "0/3", "todo"],
      [6, "change", "0/1", "todo"],
      [7, "demo", "0/1", "todo"],
      [8, "daily", "2/7", "partial"],
      [9, "sessions", "1/1", "partial"],
    ]);
    expect(steps[1].title.th).toBe("คุยกับคนที่เจอปัญหาจริง");
    expect(steps[7].title.th).toBe("โพสต์ความคืบหน้าทุกวัน");
    expect(stepsDone(steps)).toBe(2);
  });

  test("any mission count: a 3-mission round has 5 steps; config titles win", () => {
    const counts = {
      missions: [
        { key: "pitch", n: 3, complete: false, title_th: "พิตช์", title_en: "Pitch", parts: [{ type: "demo_post" as const, have: 0, need: 1 }] },
        { key: "ideas", n: 1, complete: true, parts: [{ type: "ideas" as const, have: 1, need: 1 }] },
        { key: "talks", n: 2, complete: false, parts: [{ type: "interview" as const, have: 4, need: 5 }, { type: "problem_statement" as const, have: 1, need: 1 }] },
      ],
      missions_complete: 1,
      missions_total: 3,
      people_talked_to: 4,
      eligible: false,
      daily: { days: 1, need: 5, today_logged: false },
      sessions: { attended: 0, held: 0, total: 0 },
    };
    const steps = studentSteps(counts);
    expect(steps.map((s) => s.key)).toEqual(["ideas", "talks", "pitch", "daily", "sessions"]);
    expect(steps[1].text).toBe("5/6");
    expect(steps[1].title.th).toBe("Talks");
    expect(steps[2].title).toEqual({ th: "พิตช์", en: "Pitch" });
    // No sessions in the round: step is vacuously done.
    expect(steps[4]).toMatchObject({ text: "—", done: true });
  });

  test("older counts without habits still give a row (dashes)", () => {
    const counts = { ...makeCounts({ ideas: 1 }), daily: null, sessions: null };
    const steps = studentSteps(counts);
    expect(steps.slice(-2).map((s) => [s.text, s.done])).toEqual([
      ["—", false],
      ["—", false],
    ]);
  });

  test("daily turns 'missed' once 7/7 is out of reach (Bangkok days)", () => {
    // Day 3 before logging: days 1-2 logged, 5 days left including today -> still possible.
    const ok = makeCounts({}, { daily: { days: 2, need: 7, today_logged: false } });
    expect(studentSteps(ok, { round, now: at(3, "10:00") })[7].state).toBe("partial");
    // Skipped day 2: 1 + 5 < 7.
    const skipped = makeCounts({}, { daily: { days: 1, need: 7, today_logged: false } });
    expect(studentSteps(skipped, { round, now: at(3, "10:00") })[7].state).toBe("missed");
    // 23:59 on day 2 vs 00:00 on day 3 (Bangkok midnight, 17:00 UTC).
    const oneDay = makeCounts({}, { daily: { days: 1, need: 7, today_logged: false } });
    expect(studentSteps(oneDay, { round, now: new Date("2026-10-15T16:59:00Z") })[7].state).toBe("partial");
    expect(studentSteps(oneDay, { round, now: new Date("2026-10-15T17:00:00Z") })[7].state).toBe("missed");
  });

  test("sessions: missed when attended < held (a make-up fixes it), done at total", () => {
    const missed = makeCounts({}, { sessions: { attended: 1, held: 2, total: 5 } });
    expect(studentSteps(missed)[8]).toMatchObject({ state: "missed", text: "1/2" });
    const all = makeCounts({}, { sessions: { attended: 5, held: 5, total: 5 } });
    expect(studentSteps(all)[8]).toMatchObject({ state: "done", done: true, text: "5/5" });
  });

  test("session end is Bangkok wall clock on the round day", () => {
    expect(sessionEndAt(round, 1).toISOString()).toBe("2026-10-14T14:00:00.000Z");
    expect(sessionEndAt(round, 7).toISOString()).toBe("2026-10-20T14:00:00.000Z");
  });
});

describe("compareRisk", () => {
  test("more flags first, then missed habits, fewer steps done, longer quiet, handle", () => {
    const rows = [
      { handle: "ข", flags: 0, missed: 0, done: 5, quietDays: 0 },
      { handle: "ก", flags: 2, missed: 0, done: 3, quietDays: 0 },
      { handle: "ค", flags: 0, missed: 1, done: 6, quietDays: 0 },
      { handle: "ง", flags: 0, missed: 0, done: 2, quietDays: 3 },
      { handle: "จ", flags: 0, missed: 0, done: 2, quietDays: 1 },
    ];
    expect([...rows].sort(compareRisk).map((r) => r.handle)).toEqual(["ก", "ค", "ง", "จ", "ข"]);
  });
});

describe("stepsCsv", () => {
  test("handles only: one 1/0 column per step and the habit numbers; no names, emails or ids", () => {
    const counts = makeCounts(
      { ideas: 1, interviews: 3 },
      { daily: { days: 6, need: 7, today_logged: false }, sessions: { attended: 5, held: 5, total: 5 } },
    );
    const csv = stepsCsv([{ handle: "ต้น", squad_name: "Squad 1", steps: studentSteps(counts), counts }]);
    expect(csv.startsWith("﻿")).toBe(true);
    const [header, line] = csv.slice(1).trim().split("\r\n");
    expect(header).toBe(
      "handle,squad,step_1_ideas,step_2_interviews,step_3_problem,step_4_prototype,step_5_testers,step_6_change,step_7_demo,step_8_daily,step_9_sessions,steps_done,steps_total,missions_complete,missions_total,daily_days,daily_need,sessions_attended,sessions_held,sessions_total,eligible",
    );
    expect(line).toBe("ต้น,Squad 1,1,1,0,0,0,0,0,0,1,3,9,2,7,6,7,5,5,5,0");
    expect(header).not.toMatch(/name|email|user/);
  });

  test("escapes quotes and commas and defuses formulas in handles", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("@kid")).toBe("'@kid");
    expect(csvCell(null)).toBe("");
  });
});
