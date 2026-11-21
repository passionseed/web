/** @jest-environment node */
import { QuestDbError, QuestError, type QuestApi } from "@/bot/src/quests/api";

import {
  answerAwaySchema,
  awayCount,
  awayReportFrom,
  awayStateFrom,
  readAwayState,
  revealAwaySchema,
  revealedNameOf,
  setAwayDmSchema,
} from "../away";

const ACTOR = "123456789012345678";
const ANSWER = "0b7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a";

const call = jest.fn();
const api: QuestApi = { call, rows: jest.fn() } as unknown as QuestApi;

let errorLog: jest.SpyInstance;
beforeEach(() => {
  call.mockReset();
  errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => errorLog.mockRestore());

const logged = () => errorLog.mock.calls.flat().map(String).join("\n");

/** shift_quest_away_state, as the database answers a student who is back after a stretch away. */
const ROW = { enabled: true, days: 7, dm: null, ask_consent: true, ask_return: { gap_from: "2026-11-10" } };

describe("awayStateFrom", () => {
  it("reads the contract's shape into the page's", () => {
    expect(awayStateFrom(ROW)).toEqual({ enabled: true, days: 7, dm: null, askConsent: true, askReturn: { gapFrom: "2026-11-10" } });
    expect(awayStateFrom({ ...ROW, dm: true, ask_consent: false, ask_return: null })).toEqual({
      enabled: true,
      days: 7,
      dm: true,
      askConsent: false,
      askReturn: null,
    });
  });

  it("asks nothing while the switch is off, whatever the row says", () => {
    expect(awayStateFrom({ ...ROW, enabled: false, dm: false })).toEqual({ enabled: false, days: 7, dm: false, askConsent: false, askReturn: null });
  });

  it("never asks for consent already given or refused", () => {
    expect(awayStateFrom({ ...ROW, dm: false })?.askConsent).toBe(false);
    expect(awayStateFrom({ ...ROW, dm: true })?.askConsent).toBe(false);
  });

  it.each([
    ["a time, not a day", { gap_from: "2026-11-10T00:00:00Z" }],
    ["a number", { gap_from: 20261110 }],
    ["no gap_from", {}],
    ["a string", "2026-11-10"],
  ])("opens no card for a malformed ask_return (%s)", (_label, ask_return) => {
    expect(awayStateFrom({ ...ROW, ask_return })?.askReturn).toBeNull();
  });

  it("reads a dm that is not a boolean as never asked", () => {
    expect(awayStateFrom({ ...ROW, dm: "yes" })?.dm).toBeNull();
  });

  it.each([
    ["null", null],
    ["an array", [ROW]],
    ["no enabled", { ...ROW, enabled: undefined }],
    ["enabled as a string", { ...ROW, enabled: "true" }],
    ["no days", { ...ROW, days: undefined }],
    ["fractional days", { ...ROW, days: 7.5 }],
    ["zero days", { ...ROW, days: 0 }],
  ])("is null for malformed data (%s)", (_label, raw) => {
    expect(awayStateFrom(raw)).toBeNull();
  });

  it("passes on nothing it did not ask for", () => {
    const state = awayStateFrom({ ...ROW, member_id: "m9", last_active: "2026-11-10T08:00:00Z", discord_user_id: ACTOR });
    expect(Object.keys(state ?? {}).sort()).toEqual(["askConsent", "askReturn", "days", "dm", "enabled"]);
    expect(JSON.stringify(state)).not.toContain("m9");
  });
});

describe("readAwayState", () => {
  it("reads shift_quest_away_state with the actor only", async () => {
    call.mockResolvedValue(ROW);
    expect(await readAwayState(api, ACTOR)).toEqual({ enabled: true, days: 7, dm: null, askConsent: true, askReturn: { gapFrom: "2026-11-10" } });
    expect(call).toHaveBeenCalledWith("shift_quest_away_state", ACTOR);
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("is null for malformed data, logging a code", async () => {
    call.mockResolvedValue("nope");
    expect(await readAwayState(api, ACTOR)).toBeNull();
    expect(logged()).toContain("away state read failed: malformed");
  });

  it.each([
    ["a refusal", new QuestError("not_started"), "sq:not_started"],
    ["no grant (42501)", new QuestDbError("shift_quest_away_state", "42501"), "SQLSTATE 42501"],
    ["an unexpected error", new TypeError("student text in a message"), "TypeError"],
  ])("fails soft on %s and logs only a code", async (_label, error, code) => {
    call.mockRejectedValue(error);
    expect(await readAwayState(api, ACTOR)).toBeNull();
    expect(logged()).toContain(`away state read failed: ${code}`);
    expect(logged()).not.toContain("student text");
  });

  it("fails soft when the function is missing (42883, before the migration) and logs it once per process", async () => {
    call.mockRejectedValue(new QuestDbError("shift_quest_away_state", "42883"));
    expect(await readAwayState(api, ACTOR)).toBeNull();
    expect(await readAwayState(api, ACTOR)).toBeNull();
    expect(await readAwayState(api, ACTOR)).toBeNull();
    expect(errorLog.mock.calls.filter((c) => String(c[0]).includes("42883"))).toHaveLength(1);
  });
});

describe("the action inputs", () => {
  it("takes the DM choice as a boolean only", () => {
    expect(setAwayDmSchema.safeParse({ on: true }).success).toBe(true);
    expect(setAwayDmSchema.safeParse({ on: "true" }).success).toBe(false);
  });

  it("trims the line, makes an empty one null, and keeps no line on a skip", () => {
    expect(answerAwaySchema.parse({ gapFrom: "2026-11-10", reason: "stuck", line: "  ติดเรื่องหาคนสัมภาษณ์  " })).toEqual({
      gapFrom: "2026-11-10",
      reason: "stuck",
      line: "ติดเรื่องหาคนสัมภาษณ์",
    });
    expect(answerAwaySchema.parse({ gapFrom: "2026-11-10", reason: "busy", line: "   " }).line).toBeNull();
    expect(answerAwaySchema.parse({ gapFrom: "2026-11-10", reason: null, line: "x" })).toEqual({ gapFrom: "2026-11-10", reason: null, line: null });
  });

  it("counts the 140 characters in code points, like the database", () => {
    const thai = "ก".repeat(140);
    expect(answerAwaySchema.safeParse({ gapFrom: "2026-11-10", reason: "busy", line: thai }).success).toBe(true);
    expect(answerAwaySchema.safeParse({ gapFrom: "2026-11-10", reason: "busy", line: `${thai}ข` }).success).toBe(false);
    // Emoji are two UTF-16 units but one character each.
    expect(answerAwaySchema.safeParse({ gapFrom: "2026-11-10", reason: "busy", line: "😀".repeat(140) }).success).toBe(true);
  });

  it.each([
    ["an unknown reason", { gapFrom: "2026-11-10", reason: "bored", line: null }],
    ["a time for the stretch", { gapFrom: "2026-11-10T00:00:00Z", reason: "busy", line: null }],
    ["no stretch", { reason: "busy", line: null }],
    ["a missing reason", { gapFrom: "2026-11-10", line: null }],
  ])("refuses %s", (_label, input) => {
    expect(answerAwaySchema.safeParse(input).success).toBe(false);
  });

  it("takes a uuid to reveal, nothing else", () => {
    expect(revealAwaySchema.safeParse({ id: ANSWER }).success).toBe(true);
    expect(revealAwaySchema.safeParse({ id: "m9" }).success).toBe(false);
  });
});

describe("awayCount", () => {
  it("keeps integers and the database's 1-2, and masks one or two on the web too", () => {
    expect(awayCount(0)).toBe(0);
    expect(awayCount(3)).toBe(3);
    expect(awayCount("1-2")).toBe("1-2");
    expect(awayCount(1)).toBe("1-2");
    expect(awayCount(2)).toBe("1-2");
  });

  it.each([[-1], [1.5], ["3"], [null], [undefined], [Number.NaN]])("reads %p as 0", (raw) => {
    expect(awayCount(raw)).toBe(0);
  });
});

describe("awayReportFrom", () => {
  const LINE = { id: ANSWER, week: "2026-11-09", reason: "island", line: "  ปุ่มส่งงานหายาก  " };
  const RAW = {
    consent: { yes: 12, no: "1-2", unasked: 30 },
    away_now: { resting: 4, waiting: 0, other: 9 },
    dms: { queued: 0, sent: 5, unreachable: "1-2", dropped: 3 },
    answers: { by_reason: { busy: 6, stuck: "1-2", unclear: 3, team: 0, island: 4, break: 0 }, skipped: 7, came_by_dm: "1-2" },
    lines: [
      { id: "1f7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a", week: "2026-11-02", reason: "busy", line: "สอบ" },
      LINE,
    ],
  };

  it("reads every count and the lines, newest week first, trimmed", () => {
    expect(awayReportFrom(RAW)).toEqual({
      consent: { yes: 12, no: "1-2", unasked: 30 },
      awayNow: { resting: 4, waiting: 0, other: 9 },
      dms: { queued: 0, sent: 5, unreachable: "1-2", dropped: 3 },
      answers: { byReason: { busy: 6, stuck: "1-2", unclear: 3, team: 0, island: 4, break: 0 }, skipped: 7, cameByDm: "1-2" },
      lines: [
        { id: ANSWER, week: "2026-11-09", reason: "island", line: "ปุ่มส่งงานหายาก" },
        { id: "1f7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a", week: "2026-11-02", reason: "busy", line: "สอบ" },
      ],
    });
  });

  it("reads missing groups as zero counts and no lines", () => {
    const report = awayReportFrom({});
    expect(report?.consent).toEqual({ yes: 0, no: 0, unasked: 0 });
    expect(report?.answers.byReason).toEqual({ busy: 0, stuck: 0, unclear: 0, team: 0, island: 0, break: 0 });
    expect(report?.lines).toEqual([]);
  });

  it.each([
    ["no id", { ...LINE, id: undefined }],
    ["an id that is not a uuid", { ...LINE, id: "m9" }],
    ["an exact time for the week", { ...LINE, week: "2026-11-09T10:00:00Z" }],
    ["an unknown reason", { ...LINE, reason: "bored" }],
    ["an empty line", { ...LINE, line: "   " }],
    ["no line", { ...LINE, line: null }],
  ])("drops a line with %s", (_label, line) => {
    expect(awayReportFrom({ ...RAW, lines: [line] })?.lines).toEqual([]);
  });

  it("keeps a line without a reason", () => {
    expect(awayReportFrom({ ...RAW, lines: [{ ...LINE, reason: null }] })?.lines[0].reason).toBeNull();
  });

  it("never passes on a member, a name, a plot or an exact date", () => {
    const report = awayReportFrom({
      ...RAW,
      lines: [{ ...LINE, member_id: "m9", name: "Mint", slot: 4, created_at: "2026-11-10T08:00:00Z", discord_user_id: ACTOR }],
      members: [{ id: "m9", name: "Mint" }],
    });
    const json = JSON.stringify(report);
    for (const secret of ["m9", "Mint", "2026-11-10", ACTOR, '"slot"']) expect(json).not.toContain(secret);
    expect(Object.keys(report?.lines[0] ?? {}).sort()).toEqual(["id", "line", "reason", "week"]);
  });

  it("is null when the answer is not an object", () => {
    expect(awayReportFrom(null)).toBeNull();
    expect(awayReportFrom([RAW])).toBeNull();
  });
});

describe("revealedNameOf", () => {
  it("trims the name and caps it", () => {
    expect(revealedNameOf({ name: "  Mint  " })).toBe("Mint");
    expect(revealedNameOf({ name: "x".repeat(100) })).toHaveLength(64);
  });

  it("is null without a name", () => {
    expect(revealedNameOf({ name: "  " })).toBeNull();
    expect(revealedNameOf({})).toBeNull();
    expect(revealedNameOf(null)).toBeNull();
  });
});
