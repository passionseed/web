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

import { equipItem, pickGift, plantSeed } from "../tree-actions";

const ACTOR = "123456789012345678";
const USER = "0b7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a";
const GIFT = "7c1d2e3f-4a5b-4c6d-8e7f-000000000001";
const me = { name: "Mint", avatarUrl: null, staff: false };
const ready = { state: "ready", me, actor: ACTOR, userId: USER, session: { onboarded: true, roles: [], unread: 0 } };

/** shift_quest_tree_get's answer (jsonb key order is the database's own). */
const TREE_ROW = {
  seed: "maple",
  stage: 2,
  roots: { recent: 1, count: 4 },
  gifts: [],
  owned: ["shape:round", "shape:maple", "leaf:forest", "leaf:autumn", "bark:oak", "bark:birch", "bloom:cream", "bloom:lantern"],
  equipped: { bloom: "bloom:lantern", bark: "bark:birch", leaf: "leaf:autumn", shape: "shape:maple" },
};

const TREE = {
  seed: "maple",
  equipped: { shape: "shape:maple", leaf: "leaf:autumn", bark: "bark:birch", bloom: "bloom:lantern" },
  owned: TREE_ROW.owned,
  gifts: [],
  roots: { count: 4, recent: 1 },
  stage: 2,
  ambition: null,
};

beforeEach(() => {
  call.mockReset();
  refresh.mockReset();
  resolveIslandViewer.mockReset().mockResolvedValue(ready);
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe("tree actions call one schema 13 function with the server-side actor", () => {
  it("plantSeed sends the seed and the trimmed idea, and returns the team's tree", async () => {
    call.mockResolvedValue(TREE_ROW);
    await expect(plantSeed("maple", "  แอปหาที่อ่านหนังสือ  ")).resolves.toEqual({ ok: true, data: { tree: TREE } });
    expect(call).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledWith("shift_quest_seed_plant", ACTOR, "maple", "แอปหาที่อ่านหนังสือ");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("pickGift sends the gift and the item", async () => {
    call.mockResolvedValue(TREE_ROW);
    await expect(pickGift(GIFT, "leaf:autumn")).resolves.toEqual({ ok: true, data: { tree: TREE } });
    expect(call).toHaveBeenCalledWith("shift_quest_tree_pick", ACTOR, GIFT, "leaf:autumn");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("equipItem sends the item", async () => {
    call.mockResolvedValue(TREE_ROW);
    await expect(equipItem("bark:birch")).resolves.toEqual({ ok: true, data: { tree: TREE } });
    expect(call).toHaveBeenCalledWith("shift_quest_tree_equip", ACTOR, "bark:birch");
  });
});

describe("refusals", () => {
  it("maps sq:gift_gone to gift_gone with its Thai words, and refreshes the stale page", async () => {
    call.mockRejectedValue(new QuestError("gift_gone"));
    const result = await pickGift(GIFT, "leaf:autumn");
    expect(result).toEqual({ ok: false, code: "gift_gone", error: questErrorText("gift_gone") });
    expect(questErrorText("gift_gone")).not.toBe(questErrorText("unknown"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("maps a seed a teammate already chose to seed_planted and refreshes", async () => {
    call.mockRejectedValue(new QuestError("seed_planted"));
    await expect(plantSeed("oak", "เว็บจองโต๊ะ")).resolves.toMatchObject({ ok: false, code: "seed_planted" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["seed_unknown", () => plantSeed("oak", "เว็บจองโต๊ะ")],
    ["item_not_offered", () => pickGift(GIFT, "leaf:mint")],
    ["item_not_owned", () => equipItem("leaf:mint")],
  ])("gives %s its own Thai words", async (code, run) => {
    call.mockRejectedValue(new QuestError(code));
    const result = await run();
    expect(result).toEqual({ ok: false, code, error: questErrorText(code) });
    expect(questErrorText(code)).not.toBe(questErrorText("unknown"));
  });

  it("rejects a missing session without calling the database", async () => {
    resolveIslandViewer.mockResolvedValue({ state: "signed_out" });
    await expect(pickGift(GIFT, "leaf:autumn")).resolves.toMatchObject({ ok: false, code: "signed_out" });
    await expect(plantSeed("oak", "เว็บจองโต๊ะ")).resolves.toMatchObject({ ok: false, code: "signed_out" });
    await expect(equipItem("bark:oak")).resolves.toMatchObject({ ok: false, code: "signed_out" });
    expect(call).not.toHaveBeenCalled();
  });

  it("logs a database failure by function and SQLSTATE only, and shows the generic line", async () => {
    call.mockRejectedValue(new QuestDbError("shift_quest_tree_equip", "42883"));
    await expect(equipItem("bark:oak")).resolves.toEqual({ ok: false, code: "unknown", error: questErrorText("unknown") });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("SQLSTATE 42883"));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("treats an answer that is not a tree as a failure", async () => {
    call.mockResolvedValue(null);
    await expect(equipItem("bark:oak")).resolves.toMatchObject({ ok: false, code: "unknown" });
  });
});

describe("input checks before any call", () => {
  it.each([
    ["an unknown seed", () => plantSeed("cactus", "เว็บจองโต๊ะ")],
    ["a blank idea", () => plantSeed("oak", "   ")],
    ["an idea over 500 characters", () => plantSeed("oak", "ก".repeat(501))],
    ["a gift id that is not a uuid", () => pickGift("gift-1", "leaf:autumn")],
    ["an unknown item", () => pickGift(GIFT, "leaf:plaid")],
    ["an equip of an unknown item", () => equipItem("hat:top")],
    ["a non-string item", () => equipItem(42 as unknown as string)],
  ])("refuses %s as invalid_input", async (_name, run) => {
    await expect(run()).resolves.toMatchObject({ ok: false, code: "invalid_input" });
    expect(call).not.toHaveBeenCalled();
  });

  it("accepts an idea of exactly 500 characters, counted as characters", async () => {
    call.mockResolvedValue(TREE_ROW);
    await expect(plantSeed("pine", "🌱".repeat(500))).resolves.toMatchObject({ ok: true });
  });
});
