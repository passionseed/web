/** @jest-environment node */
import { createHash } from "node:crypto";

import { QuestDbError, QuestError } from "@/bot/src/quests/api";

const call = jest.fn();
const headerValues = new Map<string, string>();

jest.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => headerValues.get(name.toLowerCase()) ?? null }),
}));
jest.mock("@/lib/supabase/shift-quests/db", () => ({
  questApi: () => ({ call, rows: jest.fn() }),
}));

import { answerIslandParent, withdrawIslandParent } from "../actions";
import { ISLAND_PARENT } from "@/components/shift/island/consent/copy";
import { ISLAND_CONSENT_VERSION } from "@/lib/supabase/shift-quests/playerTypes";

const TOKEN = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ";
const HASH = createHash("sha256").update(TOKEN).digest("hex");
const E = ISLAND_PARENT.errors;

const answer = (over: Partial<Parameters<typeof answerIslandParent>[0]> = {}) =>
  answerIslandParent({
    token: TOKEN,
    agree: true,
    ai: false,
    parentName: "  สมศรี   ใจดี ",
    relationship: "แม่",
    confirmed: true,
    ...over,
  });

let errorLog: jest.SpyInstance;

beforeEach(() => {
  call.mockReset().mockResolvedValue({ state: "granted" });
  headerValues.clear();
  headerValues.set("x-forwarded-for", "203.0.113.7, 10.0.0.1");
  headerValues.set("user-agent", "Mozilla/5.0 Test");
  errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => errorLog.mockRestore());

describe("answerIslandParent", () => {
  it("records an agreement without the AI line, with the signature and where it came from", async () => {
    expect(await answer()).toEqual({ ok: true });
    expect(call).toHaveBeenCalledWith(
      "shift_quest_consent_parent_answer",
      HASH,
      true,
      false,
      "สมศรี ใจดี",
      "แม่",
      "203.0.113.7",
      "Mozilla/5.0 Test",
      ISLAND_CONSENT_VERSION,
    );
    expect(JSON.stringify(call.mock.calls)).not.toContain(TOKEN);
  });

  it("records the separate AI tick when the parent agrees with it", async () => {
    expect(await answer({ ai: true })).toEqual({ ok: true });
    expect(call.mock.calls[0][3]).toBe(true);
  });

  it("records a decline, never with the AI line, and needs no confirm tick", async () => {
    expect(await answer({ agree: false, ai: true, confirmed: false })).toEqual({ ok: true });
    expect(call.mock.calls[0].slice(2, 4)).toEqual([false, false]);
  });

  it("falls back to x-real-ip and caps what it keeps", async () => {
    headerValues.delete("x-forwarded-for");
    headerValues.set("x-real-ip", "198.51.100.4");
    headerValues.set("user-agent", "x".repeat(900));
    await answer();
    expect(call.mock.calls[0][6]).toBe("198.51.100.4");
    expect((call.mock.calls[0][7] as string).length).toBe(400);
  });

  it.each([
    ["no name", { parentName: " ก " }, E.name],
    ["no relationship", { relationship: "ป้า" as never }, E.relationship],
    ["no confirm tick on agree", { confirmed: false }, E.confirm],
  ])("refuses %s before calling the database", async (_name, over, error) => {
    expect(await answer(over)).toEqual({ ok: false, error });
    expect(call).not.toHaveBeenCalled();
  });

  it.each([["short"], ["../../etc/passwd/../../.."], [""]])("treats a malformed token (%p) as a dead link", async (token) => {
    expect(await answer({ token })).toEqual({ ok: false, error: E.linkDead });
    expect(call).not.toHaveBeenCalled();
  });

  it("says the link is dead when the database says so (unknown, expired, withdrawn)", async () => {
    call.mockReset().mockRejectedValueOnce(new QuestError("consent_link_dead")).mockResolvedValueOnce(null);
    expect(await answer()).toEqual({ ok: false, error: E.linkDead });
    expect(call).toHaveBeenLastCalledWith("shift_quest_consent_parent_view", HASH);
  });

  it("says it is already recorded on a second tap after agreeing", async () => {
    call
      .mockReset()
      .mockResolvedValueOnce({ state: "granted" })
      .mockRejectedValueOnce(new QuestError("consent_link_dead"))
      .mockResolvedValueOnce({ state: "granted", student_label: "มิ้นต์", expires_at: null, answerable: false, withdrawable: true });
    expect(await answer()).toEqual({ ok: true });
    expect(await answer()).toEqual({ ok: false, error: E.already });
  });

  it("maps any other failure to the system line, logging a code and never the name", async () => {
    call.mockReset().mockRejectedValue(new QuestDbError("shift_quest_consent_parent_answer", "08006"));
    expect(await answer()).toEqual({ ok: false, error: E.system });
    const logged = errorLog.mock.calls.flat().map(String).join("\n");
    expect(logged).toContain("SQLSTATE 08006");
    expect(logged).not.toContain("สมศรี");
    expect(logged).not.toContain(TOKEN);
  });
});

describe("withdrawIslandParent", () => {
  it("withdraws through the same link", async () => {
    call.mockResolvedValue({ state: "withdrawn" });
    expect(await withdrawIslandParent(TOKEN)).toEqual({ ok: true });
    expect(call).toHaveBeenCalledWith("shift_quest_consent_parent_withdraw", HASH);
  });

  it("says the link is dead when there is nothing to withdraw", async () => {
    call.mockRejectedValue(new QuestError("consent_link_dead"));
    expect(await withdrawIslandParent(TOKEN)).toEqual({ ok: false, error: E.linkDead });
    expect(await withdrawIslandParent("nope")).toEqual({ ok: false, error: E.linkDead });
  });

  it("maps a database failure to the system line", async () => {
    call.mockRejectedValue(new Error("shift_quest_db_not_configured"));
    expect(await withdrawIslandParent(TOKEN)).toEqual({ ok: false, error: E.system });
  });
});
