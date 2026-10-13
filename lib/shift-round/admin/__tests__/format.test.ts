import {
  describeError,
  ictMidnightIso,
  isPolicyLocked,
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
