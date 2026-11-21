/** @jest-environment node */
import { QuestDbError, QuestError } from "@/bot/src/quests/api";
import { questErrorText } from "@/lib/supabase/shift-quests/errors";

const call = jest.fn();
const resolveIslandViewer = jest.fn();
const refresh = jest.fn();

jest.mock("next/cache", () => ({ refresh: () => refresh() }));
jest.mock("@/lib/supabase/shift-quests/db", () => ({
  questApi: () => ({ call, rows: jest.fn() }),
}));
jest.mock("@/lib/supabase/shift-quests/viewer", () => ({
  resolveIslandViewer: () => resolveIslandViewer(),
}));

import { answerAway, setAwayDm } from "@/app/shift/island/actions";
import { loadAwayReport, revealAwayAnswer } from "@/app/shift/island/admin-actions";

const ACTOR = "123456789012345678";
const USER = "0b7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a";
const ANSWER = "1f7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a";
const student = {
  state: "ready",
  me: { name: "Mint", avatarUrl: null, staff: false },
  actor: ACTOR,
  userId: USER,
  session: { onboarded: true, roles: [], unread: 0 },
};
const admin = { ...student, me: { name: "บิ๊ก", avatarUrl: null, staff: true, admin: true }, session: { ...student.session, roles: ["admin"] } };

let errorLog: jest.SpyInstance;
beforeEach(() => {
  call.mockReset();
  refresh.mockReset();
  resolveIslandViewer.mockReset().mockResolvedValue(student);
  errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => errorLog.mockRestore());

const STATE_ROW = { enabled: true, days: 7, dm: true, ask_consent: false, ask_return: null };

describe("setAwayDm", () => {
  it.each([true, false])("saves the student's own choice (%s) with the actor from the session and refreshes", async (on) => {
    call.mockResolvedValue({ ...STATE_ROW, dm: on });
    expect(await setAwayDm(on)).toEqual({ ok: true, data: { enabled: true, days: 7, dm: on, askConsent: false, askReturn: null } });
    expect(call).toHaveBeenCalledWith("shift_quest_away_set", ACTOR, on);
    expect(call).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("answers null when the database's answer is malformed: the choice is saved and the page refreshes", async () => {
    call.mockResolvedValue("ok");
    expect(await setAwayDm(true)).toEqual({ ok: true, data: null });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refuses anything but a boolean before any database call", async () => {
    expect(await setAwayDm("yes" as unknown as boolean)).toMatchObject({ ok: false, code: "invalid_input" });
    expect(call).not.toHaveBeenCalled();
  });

  it("passes a staff refusal through, without a refresh", async () => {
    call.mockRejectedValue(new QuestError("not_allowed"));
    expect(await setAwayDm(true)).toEqual({ ok: false, code: "not_allowed", error: questErrorText("not_allowed") });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses a viewer who has not started", async () => {
    resolveIslandViewer.mockResolvedValue({ ...student, state: "not_started" });
    expect(await setAwayDm(true)).toMatchObject({ ok: false, code: "not_started" });
    expect(call).not.toHaveBeenCalled();
  });
});

describe("answerAway", () => {
  it("sends the stretch, the reason and the trimmed line, and says it was saved", async () => {
    call.mockResolvedValue({ saved: true });
    expect(await answerAway({ gapFrom: "2026-11-10", reason: "island", line: "  ปุ่มส่งงานหายาก " })).toEqual({ ok: true, data: { saved: true } });
    expect(call).toHaveBeenCalledWith("shift_quest_away_answer", ACTOR, "2026-11-10", "island", "ปุ่มส่งงานหายาก");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("saves a closed card as a skip: no reason, no line", async () => {
    call.mockResolvedValue({ saved: true });
    await answerAway({ gapFrom: "2026-11-10", reason: null, line: "x" });
    expect(call).toHaveBeenCalledWith("shift_quest_away_answer", ACTOR, "2026-11-10", null, null);
  });

  it("makes an empty line null", async () => {
    call.mockResolvedValue({ saved: true });
    await answerAway({ gapFrom: "2026-11-10", reason: "busy", line: "   " });
    expect(call).toHaveBeenCalledWith("shift_quest_away_answer", ACTOR, "2026-11-10", "busy", null);
  });

  it("says saved: false when the stretch was already answered", async () => {
    call.mockResolvedValue({ saved: false });
    expect(await answerAway({ gapFrom: "2026-11-10", reason: "busy", line: null })).toEqual({ ok: true, data: { saved: false } });
    call.mockResolvedValue(null);
    expect(await answerAway({ gapFrom: "2026-11-10", reason: "busy", line: null })).toEqual({ ok: true, data: { saved: false } });
  });

  it.each([
    ["a line over 140 characters", { gapFrom: "2026-11-10", reason: "busy", line: "ก".repeat(141) }],
    ["an unknown reason", { gapFrom: "2026-11-10", reason: "bored", line: null }],
    ["a bad stretch", { gapFrom: "last week", reason: "busy", line: null }],
  ])("refuses %s before any database call", async (_label, input) => {
    expect(await answerAway(input as Parameters<typeof answerAway>[0])).toMatchObject({ ok: false, code: "invalid_input" });
    expect(call).not.toHaveBeenCalled();
  });

  it("passes a card that is not due through as not_found", async () => {
    call.mockRejectedValue(new QuestError("not_found"));
    expect(await answerAway({ gapFrom: "2026-11-10", reason: "busy", line: null })).toMatchObject({ ok: false, code: "not_found" });
  });

  it("logs a database failure by function and SQLSTATE only, never the line", async () => {
    call.mockRejectedValue(new QuestDbError("shift_quest_away_answer", "42883"));
    expect(await answerAway({ gapFrom: "2026-11-10", reason: "team", line: "เพื่อนในทีมเงียบ" })).toMatchObject({ ok: false, code: "unknown" });
    expect(errorLog).toHaveBeenCalledWith("[shift-island] answerAway: shift_quest_away_answer failed (SQLSTATE 42883)");
    expect(errorLog.mock.calls.flat().map(String).join("\n")).not.toContain("เพื่อนในทีมเงียบ");
  });
});

describe("loadAwayReport", () => {
  beforeEach(() => resolveIslandViewer.mockResolvedValue(admin));

  it("reads the report with the admin's own actor, checked, without a refresh", async () => {
    call.mockResolvedValue({ consent: { yes: 3, no: 1, unasked: 0 }, lines: [{ id: ANSWER, week: "2026-11-09", reason: null, line: "x", member_id: "m9" }] });
    const result = await loadAwayReport();
    expect(call).toHaveBeenCalledWith("shift_quest_admin_away", ACTOR);
    expect(result).toMatchObject({ ok: true, data: { consent: { yes: 3, no: "1-2", unasked: 0 }, lines: [{ id: ANSWER, week: "2026-11-09", reason: null, line: "x" }] } });
    expect(JSON.stringify(result)).not.toContain("m9");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("passes a reviewer's refusal through, without a refresh", async () => {
    call.mockRejectedValue(new QuestError("not_authorized"));
    expect(await loadAwayReport()).toEqual({ ok: false, code: "not_authorized", error: questErrorText("not_authorized") });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("revealAwayAnswer", () => {
  beforeEach(() => resolveIslandViewer.mockResolvedValue(admin));

  it("asks the database (which audits it) for one answer's writer, without a refresh", async () => {
    call.mockResolvedValue({ name: " Mint " });
    expect(await revealAwayAnswer(ANSWER)).toEqual({ ok: true, data: { name: "Mint" } });
    expect(call).toHaveBeenCalledWith("shift_quest_admin_away_reveal", ACTOR, ANSWER);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("falls back to the island's name when the database names nobody", async () => {
    call.mockResolvedValue({ name: null });
    expect(await revealAwayAnswer(ANSWER)).toEqual({ ok: true, data: { name: "เพื่อนใน SHIFT" } });
  });

  it("refuses an id that is not a uuid before any database call", async () => {
    expect(await revealAwayAnswer("m9")).toMatchObject({ ok: false, code: "invalid_input" });
    expect(call).not.toHaveBeenCalled();
  });

  it("passes a non-admin's refusal through", async () => {
    resolveIslandViewer.mockResolvedValue(student);
    call.mockRejectedValue(new QuestError("not_authorized"));
    expect(await revealAwayAnswer(ANSWER)).toMatchObject({ ok: false, code: "not_authorized" });
  });
});
