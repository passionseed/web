import {
  DEFAULT_MISSIONS,
  DEFAULT_POLICY,
  describeError,
  hhmm,
  ictMidnightIso,
  isPolicyLocked,
  missionLabel,
  missionsTotal,
  parseEmails,
  roundDay,
  roundPhase,
  suggestSquads,
  validatePolicy,
} from "../format";

const round = {
  starts_at: "2026-11-09T17:00:00.000Z", // 10 Nov 00:00 ICT
  closes_at: "2026-11-23T17:00:00.000Z",
  review_ends_at: "2026-11-25T17:00:00.000Z",
  join_cutoff_day: 7,
};

test("day 1 picker becomes 00:00 ICT", () => {
  expect(ictMidnightIso("2026-11-10")).toBe("2026-11-09T17:00:00.000Z");
  expect(() => ictMidnightIso("10/11/2026")).toThrow();
});

test("round day and phase use the Bangkok calendar", () => {
  expect(roundDay(round, new Date("2026-11-09T16:59:59Z"))).toBe(0);
  expect(roundDay(round, new Date("2026-11-09T17:00:00Z"))).toBe(1);
  expect(roundPhase(round, new Date("2026-11-09T16:00:00Z"))).toBe("upcoming");
  expect(roundPhase(round, new Date("2026-11-23T16:59:59Z"))).toBe("active");
  expect(roundPhase(round, new Date("2026-11-23T17:00:00Z"))).toBe("review");
  expect(roundPhase(round, new Date("2026-11-26T00:00:00Z"))).toBe("finished");
});

test("policy locks at start except titles, briefs, discord; cutoff locks after cutoff day", () => {
  const before = new Date("2026-11-01T00:00:00Z");
  const day3 = new Date("2026-11-12T03:00:00Z");
  const day8 = new Date("2026-11-17T03:00:00Z");
  expect(isPolicyLocked("duration_days", round, before)).toBe(false);
  expect(isPolicyLocked("duration_days", round, day3)).toBe(true);
  expect(isPolicyLocked("squad_size", round, day3)).toBe(true);
  expect(isPolicyLocked("title_th", round, day3)).toBe(false);
  expect(isPolicyLocked("discord_url", round, day8)).toBe(false);
  expect(isPolicyLocked("join_cutoff_day", round, day3)).toBe(false);
  expect(isPolicyLocked("join_cutoff_day", round, day8)).toBe(true);
});

test("validatePolicy mirrors the column checks", () => {
  expect(validatePolicy({ duration_days: 4, squad_size: 7, discord_url: "https://example.com/x" })).toEqual({
    duration_days: "5-28 days",
    squad_size: "2-6 people",
    discord_url: expect.any(String),
  });
  expect(validatePolicy({ duration_days: 14, join_cutoff_day: 15 })).toHaveProperty("join_cutoff_day");
  expect(validatePolicy({ duration_days: 14, join_cutoff_day: 7, discord_url: "https://discord.gg/abc" })).toEqual({});
});

test("suggestSquads groups by track in threes and keeps singles aside", () => {
  const e = (id: string, track: "high_school" | "university", t: number, squad_id: string | null = null) => ({
    id,
    track,
    joined_at: `2026-11-1${t}T00:00:00Z`,
    squad_id,
  });
  const result = suggestSquads(
    [e("a", "high_school", 1), e("b", "high_school", 2), e("c", "high_school", 3), e("d", "high_school", 4), e("e", "high_school", 5), e("x", "high_school", 0, "s1"), e("u", "university", 1)],
    3,
    ["Squad 2"],
  );
  expect(result.squads).toEqual([
    { name: "Squad 3", track: "high_school", entryIds: ["a", "b", "c"] },
    { name: "Squad 4", track: "high_school", entryIds: ["d", "e"] },
  ]);
  expect(result.leftover).toEqual(["u"]);
});

test("parseEmails lowercases, dedupes and reports invalid entries", () => {
  expect(parseEmails("A@x.org, a@x.org\nbad; b@y.co")).toEqual({ valid: ["a@x.org", "b@y.co"], invalid: ["bad"] });
});

test("missing SHIFT round role gets its own message", () => {
  expect(describeError({ code: "forbidden", category: "forbidden", details: { rule: "no_shift_round_role" } })).toBe(
    "You need a SHIFT round role; ask a global staff member to grant it in Settings.",
  );
});

test("describeError keeps the code visible", () => {
  expect(describeError({ code: "squad_full", category: "validation" })).toMatch(/full.*\(squad_full\)/);
  expect(describeError({ code: "something_new", category: "validation" })).toMatch(/something_new/);
  expect(describeError({ code: "role_from_web_admin", category: "validation", field: "email" })).toMatch(
    /web admin.*Users page.*\(role_from_web_admin\)/,
  );
});

test("new rounds default to the SHIFT 7-day template (D2)", () => {
  expect(DEFAULT_POLICY).toMatchObject({
    duration_days: 7,
    join_cutoff_day: 2,
    nudge_local_time: "21:15",
    review_window_hours: 48,
    join_mode: "invite",
    mentor_led: true,
    session_days: [1, 2, 4, 6, 7],
    session_start: "19:00",
    session_end: "21:00",
  });
  expect(DEFAULT_MISSIONS.map((m) => m.key)).toEqual(["ideas", "interviews", "problem", "prototype", "testers", "change", "demo"]);
  const titles = { title_th: "SHIFT[3]", title_en: "SHIFT[3]", brief_th: "โจทย์", brief_en: "Brief" };
  expect(validatePolicy({ ...DEFAULT_POLICY, ...titles, number: 3 })).toEqual({});
});

test("validatePolicy checks session days against the length and the session times", () => {
  expect(validatePolicy({ duration_days: 7, session_days: [1, 8] })).toHaveProperty("session_days");
  expect(validatePolicy({ duration_days: 7, session_days: [2, 2] })).toHaveProperty("session_days");
  expect(validatePolicy({ duration_days: 7, session_days: [] })).toEqual({});
  expect(validatePolicy({ session_start: "21:00", session_end: "19:00" })).toHaveProperty("session_end");
  expect(validatePolicy({ session_start: "7pm", session_end: "21:00" })).toHaveProperty("session_start");
  expect(validatePolicy({ curriculum_key: "shift 3" })).toHaveProperty("curriculum_key");
  expect(validatePolicy({ curriculum_key: "SHIFT[3]", application_cohort: "SHIFT[3]" })).toEqual({});
});

test("session schedule, curriculum key and application cohort stay editable after start (v2)", () => {
  const day3 = new Date("2026-11-12T03:00:00Z");
  for (const field of ["session_days", "session_start", "session_end", "curriculum_key", "application_cohort"] as const) {
    expect(isPolicyLocked(field, round, day3)).toBe(false);
  }
  expect(isPolicyLocked("duration_days", round, day3)).toBe(true);
});

test("describeError explains rules the code alone doesn't", () => {
  expect(describeError({ code: "invalid_field", category: "validation", field: "day", details: { rule: "not_session_day" } })).toBe(
    "That day has no mentor session in this round. Field: day. (invalid_field)",
  );
});

test("mission labels: round title, else known-key copy, else the key", () => {
  expect(missionLabel({ key: "interviews", n: 2 })).toBe("2 · คุยกับคนที่เจอปัญหาจริง");
  expect(missionLabel({ key: "interviews", n: 2, title_th: "สัมภาษณ์ 5 คน" })).toBe("2 · สัมภาษณ์ 5 คน");
  expect(missionLabel({ key: "pitch_day" })).toBe("Pitch day");
  expect(missionsTotal({ missions: [], missions_total: 7 })).toBe(7);
  expect(missionsTotal(undefined)).toBe(7);
  expect(hhmm("19:00:00")).toBe("19:00");
  expect(hhmm("25:00")).toBeNull();
});
