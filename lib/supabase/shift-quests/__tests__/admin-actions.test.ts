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

import { resetMyIsland } from "@/app/shift/island/admin-actions";

const ACTOR = "123456789012345678";
const USER = "0b7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a";
const ready = {
  state: "ready",
  me: { name: "บิ๊ก", avatarUrl: null, staff: true, admin: true },
  actor: ACTOR,
  userId: USER,
  session: { onboarded: true, roles: ["admin"], unread: 0 },
};

let errorLog: jest.SpyInstance;
beforeEach(() => {
  call.mockReset();
  refresh.mockReset();
  resolveIslandViewer.mockReset().mockResolvedValue(ready);
  errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => errorLog.mockRestore());

describe("resetMyIsland", () => {
  it("resets the signed-in viewer's own island (the actor comes from the session) and refreshes", async () => {
    call.mockResolvedValue({ reset: true, project: "archived", quests: 2, kept_quests: 0, journal: 3, ledger_rows: 0 });
    expect(await resetMyIsland()).toEqual({ ok: true, data: { project: "archived", quests: 2, keptQuests: 0 } });
    expect(call).toHaveBeenCalledWith("shift_quest_admin_reset_self", ACTOR);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("reads a shared project and odd answers safely", async () => {
    call.mockResolvedValue({ project: "shared", quests: "1", kept_quests: 1 });
    expect(await resetMyIsland()).toEqual({ ok: true, data: { project: "shared", quests: 1, keptQuests: 1 } });
    call.mockResolvedValue(null);
    expect(await resetMyIsland()).toEqual({ ok: true, data: { project: "none", quests: 0, keptQuests: 0 } });
  });

  it("maps a non-admin's refusal to Thai, without a refresh", async () => {
    call.mockRejectedValue(new QuestError("not_authorized"));
    expect(await resetMyIsland()).toEqual({ ok: false, code: "not_authorized", error: questErrorText("not_authorized") });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("explains a blocked reset in its own words", async () => {
    call.mockRejectedValue(new QuestError("reset_blocked"));
    const result = await resetMyIsland();
    expect(result).toMatchObject({ ok: false, code: "reset_blocked" });
    expect(questErrorText("reset_blocked")).not.toBe(questErrorText("unknown"));
  });

  it("refuses a signed-out viewer before any database call", async () => {
    resolveIslandViewer.mockResolvedValue({ state: "signed_out" });
    expect(await resetMyIsland()).toMatchObject({ ok: false, code: "signed_out" });
    expect(call).not.toHaveBeenCalled();
  });

  it("logs a database failure by function and SQLSTATE only", async () => {
    call.mockRejectedValue(new QuestDbError("shift_quest_admin_reset_self", "42883"));
    expect(await resetMyIsland()).toMatchObject({ ok: false, code: "unknown" });
    expect(errorLog).toHaveBeenCalledWith("[shift-island] resetMyIsland: shift_quest_admin_reset_self failed (SQLSTATE 42883)");
  });
});
