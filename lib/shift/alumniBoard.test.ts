import {
  buildHistory,
  canSeeTeam,
  cheerFor,
  CHEERS,
  clean,
  formatBangkok,
  formatBangkokClock,
  isJustFinished,
  isOpenStart,
  isQuiet,
  linkHost,
  MAX_TEXT,
  needsTestNudge,
  openStartCutoff,
  parseBangkokLocal,
  parseLink,
  snippet,
  startSecondsLeft,
  streak,
  summarizeStuck,
  type BoardViewer,
} from "./alumniBoard";

describe("alumni board rules", () => {
  it("clean trims and caps length", () => {
    expect(clean("  hi  ")).toBe("hi");
    expect(clean(null)).toBe("");
    expect(clean("x".repeat(MAX_TEXT + 10))).toHaveLength(MAX_TEXT);
  });

  it("reads datetime-local input as Bangkok time", () => {
    expect(parseBangkokLocal("2026-10-20T19:00")).toBe("2026-10-20T12:00:00.000Z");
    expect(parseBangkokLocal("2026-10-20")).toBeNull();
    expect(parseBangkokLocal(null)).toBeNull();
  });

  it("formats in Thai time", () => {
    expect(formatBangkok("2026-10-20T12:00:00.000Z")).toMatch(/19:00/);
    expect(formatBangkok(null)).toBe("");
    expect(formatBangkokClock("2026-10-20T12:05:00Z")).toBe("19:05");
    expect(formatBangkokClock("2026-10-20T17:30:00+00:00")).toBe("00:30");
  });

  it("is quiet after 3 days without activity", () => {
    const now = Date.parse("2026-10-20T00:00:00Z");
    expect(isQuiet(null, now)).toBe(true);
    expect(isQuiet("2026-10-18T00:00:00Z", now)).toBe(false);
    expect(isQuiet("2026-10-16T00:00:00Z", now)).toBe(true);
  });

  it("counts the streak back from the newest round", () => {
    expect(streak([])).toBe(0);
    expect(streak(["done", "done", "not_done", "done"])).toBe(2);
    expect(streak(["open", "done"])).toBe(0);
    expect(streak([null, "done"])).toBe(0);
  });

  it("builds history with empty rounds for missing goals", () => {
    const rounds = [
      { id: 3, started_at: "2026-10-13T12:00:00Z" },
      { id: 2, started_at: "2026-10-06T12:00:00Z" },
      { id: 1, started_at: "2026-09-29T12:00:00Z" },
    ];
    const goals = new Map([
      [3, { week_goal: "ทำหน้าแรก", status: "done" as const }],
      [2, { week_goal: "", status: "done" as const }],
    ]);
    const history = buildHistory(rounds, goals);
    expect(history.rounds.map((r) => r.status)).toEqual(["done", null, null]);
    expect(history.streak).toBe(1);
  });

  it("summarizes stuck: latest standup wins, solved and empty notes clear the flag", () => {
    const rows = [
      { user_id: "a", stuck: "no data", unstuck_at: null, replies: 1 },
      { user_id: "a", stuck: "api key", unstuck_at: null, replies: 2 },
      { user_id: "b", stuck: "design", unstuck_at: null, replies: 0 },
      { user_id: "b", stuck: "", unstuck_at: null, replies: 0 },
      { user_id: "c", stuck: "deploy", unstuck_at: "2026-10-19T00:00:00Z", replies: 3 },
    ];
    expect(summarizeStuck(rows)).toEqual({ stuck: { a: "api key" }, replies: { a: 2 }, solved: 1 });
    expect(summarizeStuck([])).toEqual({ stuck: {}, replies: {}, solved: 0 });
  });

  it("keeps a start open until finished or an hour old", () => {
    const now = Date.parse("2026-10-20T12:00:00Z");
    const at = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();
    expect(isOpenStart({ started_at: at(5), finished_at: null }, now)).toBe(true);
    expect(isOpenStart({ started_at: at(59), finished_at: null }, now)).toBe(true);
    expect(isOpenStart({ started_at: at(61), finished_at: null }, now)).toBe(false);
    expect(isOpenStart({ started_at: at(5), finished_at: at(1) }, now)).toBe(false);
    expect(isOpenStart(null, now)).toBe(false);
    expect(openStartCutoff(now)).toBe("2026-10-20T11:00:00.000Z");
  });

  it("counts the timer down from 10 minutes and stops at 0", () => {
    const now = Date.parse("2026-10-20T12:00:00Z");
    const start = (secondsAgo: number) => ({ started_at: new Date(now - secondsAgo * 1000).toISOString() });
    expect(startSecondsLeft(start(0), now)).toBe(600);
    expect(startSecondsLeft(start(90), now)).toBe(510);
    expect(startSecondsLeft(start(700), now)).toBe(0);
    expect(startSecondsLeft(start(-30), now)).toBe(600);
    expect(startSecondsLeft({ started_at: "nonsense" }, now)).toBe(0);
  });

  it("shows the finish cheer for 5 minutes, the same one every time", () => {
    const now = Date.parse("2026-10-20T12:00:00Z");
    expect(isJustFinished({ finished_at: "2026-10-20T11:58:00Z" }, now)).toBe(true);
    expect(isJustFinished({ finished_at: "2026-10-20T11:50:00Z" }, now)).toBe(false);
    expect(isJustFinished(null, now)).toBe(false);
    expect(cheerFor("abc")).toBe(cheerFor("abc"));
    expect(CHEERS).toContain(cheerFor("abc"));
  });

  it("accepts only http(s) feed links", () => {
    expect(parseLink("")).toBe("");
    expect(parseLink(" https://example.com/a?b=1 ")).toBe("https://example.com/a?b=1");
    expect(parseLink("http://example.com")).toBe("http://example.com/");
    expect(parseLink("javascript:alert(1)")).toBeNull();
    expect(parseLink("data:text/html,hi")).toBeNull();
    expect(parseLink("example.com")).toBeNull();
    expect(parseLink(`https://example.com/${"a".repeat(MAX_TEXT)}`)).toBeNull();
    expect(linkHost("https://www.github.com/a/b")).toBe("github.com");
    expect(linkHost("not a url")).toBe("");
  });

  it("makes one-line snippets by character", () => {
    expect(snippet(" a\n\nb ", 80)).toBe("a b");
    expect(snippet("abcdef", 4)).toBe("abc…");
    expect(snippet("😀😀😀😀😀", 3)).toBe("😀😀…");
    expect(snippet(null, 5)).toBe("");
  });

  it("nudges toward a real-user test only with a goal and no tests", () => {
    expect(needsTestNudge({ week_goal: "ทำแอป" }, 0)).toBe(true);
    expect(needsTestNudge({ week_goal: "ทำแอป" }, 2)).toBe(false);
    expect(needsTestNudge(null, 0)).toBe(false);
    expect(needsTestNudge({ week_goal: "", month_goal: "", long_term: "" }, 0)).toBe(false);
  });

  it("lets students see only their own team, mentors every team", () => {
    const student: BoardViewer = { userId: "u", name: "มิ้นท์", role: "student", teamId: "t1" };
    const mentor: BoardViewer = { userId: "m", name: "Big", role: "mentor", teamId: null };
    expect(canSeeTeam(student, "t1")).toBe(true);
    expect(canSeeTeam(student, "t2")).toBe(false);
    expect(canSeeTeam({ ...student, teamId: null }, null)).toBe(false);
    expect(canSeeTeam(mentor, "t2")).toBe(true);
  });
});
