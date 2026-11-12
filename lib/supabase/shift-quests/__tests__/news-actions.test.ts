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

import { hideTeamNews } from "@/app/shift/island/news-actions";

const ACTOR = "123456789012345678";
const USER = "0b7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a";
const ready = {
  state: "ready",
  me: { name: "พี่เลี้ยง", avatarUrl: null, staff: true },
  actor: ACTOR,
  userId: USER,
  session: { onboarded: true, roles: [], unread: 0 },
};

let errorLog: jest.SpyInstance;
beforeEach(() => {
  call.mockReset();
  refresh.mockReset();
  resolveIslandViewer.mockReset().mockResolvedValue(ready);
  errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => errorLog.mockRestore());

describe("hideTeamNews", () => {
  it("hides a team's summary by plot with the reason, as the signed-in viewer, and refreshes the page", async () => {
    call.mockResolvedValue({ slot: 4, hidden: true });
    expect(await hideTeamNews({ slot: 4, hidden: true, reason: "  ข้อมูลไม่ตรง  " })).toEqual({ ok: true, data: null });
    expect(call).toHaveBeenCalledWith("shift_quest_digest_hide", ACTOR, 4, true, "ข้อมูลไม่ตรง");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("shows a team again, sending no reason when none was given", async () => {
    call.mockResolvedValue({ slot: 4, hidden: false });
    expect(await hideTeamNews({ slot: 4, hidden: false })).toEqual({ ok: true, data: null });
    expect(call).toHaveBeenCalledWith("shift_quest_digest_hide", ACTOR, 4, false, null);
    await hideTeamNews({ slot: 4, hidden: true, reason: "   " });
    expect(call).toHaveBeenLastCalledWith("shift_quest_digest_hide", ACTOR, 4, true, null);
  });

  it("maps the database's staff refusal to Thai, without a refresh", async () => {
    call.mockRejectedValue(new QuestError("not_authorized"));
    expect(await hideTeamNews({ slot: 4, hidden: true })).toEqual({
      ok: false,
      code: "not_authorized",
      error: questErrorText("not_authorized"),
    });
    expect(questErrorText("not_authorized")).not.toBe(questErrorText("unknown"));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes the page when the plot is gone", async () => {
    call.mockRejectedValue(new QuestError("not_found"));
    expect(await hideTeamNews({ slot: 9, hidden: true })).toMatchObject({ ok: false, code: "not_found" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a slot of 0", { slot: 0, hidden: true }],
    ["a fractional slot", { slot: 1.5, hidden: true }],
    ["a missing flag", { slot: 2 }],
    ["a reason over 300 characters", { slot: 2, hidden: true, reason: "ก".repeat(301) }],
  ])("refuses %s before reading the viewer or the database", async (_label, input) => {
    expect(await hideTeamNews(input as never)).toMatchObject({ ok: false, code: "invalid_input" });
    expect(resolveIslandViewer).not.toHaveBeenCalled();
    expect(call).not.toHaveBeenCalled();
  });

  it("refuses a signed-out viewer before any database call", async () => {
    resolveIslandViewer.mockResolvedValue({ state: "signed_out" });
    expect(await hideTeamNews({ slot: 4, hidden: true })).toMatchObject({ ok: false, code: "signed_out" });
    expect(call).not.toHaveBeenCalled();
  });

  it("logs a database failure by function and SQLSTATE only", async () => {
    call.mockRejectedValue(new QuestDbError("shift_quest_digest_hide", "42883"));
    expect(await hideTeamNews({ slot: 4, hidden: true, reason: "ชื่อคนในสรุป" })).toMatchObject({ ok: false, code: "unknown" });
    const logged = errorLog.mock.calls.flat().join(" ");
    expect(logged).toContain("shift_quest_digest_hide failed (SQLSTATE 42883)");
    expect(logged).not.toContain("ชื่อคนในสรุป");
  });
});
