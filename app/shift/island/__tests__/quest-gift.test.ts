/** @jest-environment node */
import { QuestDbError, QuestError } from "@/bot/src/quests/api";

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

import { submitMainQuest, submitProposedQuest, submitSideQuest } from "../actions";

const ACTOR = "123456789012345678";
const USER = "0b7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a";
const TEMPLATE = "11111111-1111-4111-8111-111111111111";
const PROPOSED = "22222222-2222-4222-8222-222222222222";
const GIFT_ID = "7c1d2e3f-4a5b-4c6d-8e7f-000000000001";
const me = { name: "Mint", avatarUrl: null, staff: false };
const ready = { state: "ready", me, actor: ACTOR, userId: USER, session: { onboarded: true, roles: [], unread: 0 } };
const proof = { proof: "ทำต้นแบบแล้ว", reflection: "ได้เรียนรู้ว่า", artifactUrl: null };

const GIFT = { id: GIFT_ID, options: ["leaf:mint", "leaf:gold", "leaf:dusk"] };
/** shift_quest_tree_get's answer after the gift was made (it waits among the tree's gifts too). */
const TREE_ROW = {
  seed: "oak",
  stage: 2,
  roots: { count: 3, recent: 1 },
  gifts: [GIFT],
  owned: ["shape:round", "leaf:forest", "bark:oak", "bloom:cream"],
  equipped: { shape: "shape:round", leaf: "leaf:forest", bark: "bark:oak", bloom: "bloom:cream" },
};
const TREE = {
  seed: "oak",
  equipped: TREE_ROW.equipped,
  owned: TREE_ROW.owned,
  gifts: [GIFT],
  roots: { count: 3, recent: 1 },
  stage: 2,
};

/** The quest database by function name; an Error answer is thrown. Anything else asked is a test failure. */
function db(answers: Record<string, unknown>) {
  call.mockImplementation(async (fn: string) => {
    if (!(fn in answers)) throw new Error(`unexpected call ${fn}`);
    const answer = answers[fn];
    if (answer instanceof Error) throw answer;
    return answer;
  });
}

const fns = () => call.mock.calls.map(([fn]) => fn);
const logged = () => (console.error as jest.Mock).mock.calls.flat().map(String).join("\n");

const MAIN_ROW = { instance_id: "i-main", submission_id: "s", revision: 1, version: 2, created: true };

beforeEach(() => {
  call.mockReset();
  refresh.mockReset();
  resolveIslandViewer.mockReset().mockResolvedValue(ready);
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe("a saved submit asks for the quest's gift (schema 13)", () => {
  it("saves first, then asks for the gift by the submitted instance and reads the team's tree", async () => {
    db({
      shift_quest_milestone_submit: MAIN_ROW,
      shift_quest_schema_version: 13,
      shift_quest_quest_gift: { gift: GIFT },
      shift_quest_tree_get: TREE_ROW,
    });
    await expect(submitMainQuest({ milestone: 2, ...proof })).resolves.toEqual({
      ok: true,
      data: { instanceId: "i-main", revision: 1, created: true, gift: GIFT, tree: TREE },
    });
    expect(fns()[0]).toBe("shift_quest_milestone_submit");
    expect(fns().indexOf("shift_quest_quest_gift")).toBeGreaterThan(0);
    expect(call).toHaveBeenCalledWith("shift_quest_quest_gift", ACTOR, "i-main");
    expect(call).toHaveBeenCalledWith("shift_quest_tree_get", ACTOR);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("asks for a side quest's gift by the instance the side submit answered", async () => {
    db({
      shift_quest_side_submit: { instance_id: "i-side", revision: 2, created: false },
      shift_quest_schema_version: 13,
      shift_quest_quest_gift: { gift: GIFT },
      shift_quest_tree_get: TREE_ROW,
    });
    const result = await submitSideQuest({ templateId: TEMPLATE, ...proof });
    expect(result).toMatchObject({ ok: true, data: { instanceId: "i-side", gift: GIFT } });
    expect(call).toHaveBeenCalledWith("shift_quest_quest_gift", ACTOR, "i-side");
  });

  it("asks for a proposed quest's gift by its own instance id", async () => {
    db({
      shift_quest_submit: { revision: 1 },
      shift_quest_schema_version: 13,
      shift_quest_quest_gift: { gift: GIFT },
      shift_quest_tree_get: TREE_ROW,
    });
    const result = await submitProposedQuest({ instanceId: PROPOSED, version: 3, ...proof });
    expect(result).toMatchObject({ ok: true, data: { instanceId: PROPOSED, gift: GIFT, tree: TREE } });
    expect(call).toHaveBeenCalledWith("shift_quest_quest_gift", ACTOR, PROPOSED);
  });

  it("answers gift null without reading the tree when the database gives none (a resubmit, or nothing left)", async () => {
    db({ shift_quest_milestone_submit: MAIN_ROW, shift_quest_schema_version: 13, shift_quest_quest_gift: { gift: null } });
    await expect(submitMainQuest({ milestone: 2, ...proof })).resolves.toEqual({
      ok: true,
      data: { instanceId: "i-main", revision: 1, created: true, gift: null, tree: null },
    });
    expect(fns()).not.toContain("shift_quest_tree_get");
  });

  it("drops a gift whose answer is not a gift", async () => {
    db({
      shift_quest_milestone_submit: MAIN_ROW,
      shift_quest_schema_version: 13,
      shift_quest_quest_gift: { gift: { id: 7, options: "leaf:mint" } },
    });
    await expect(submitMainQuest({ milestone: 2, ...proof })).resolves.toMatchObject({ ok: true, data: { gift: null, tree: null } });
  });

  it("keeps no gift it cannot draw: the tree read failed, so the gift waits in the close-up", async () => {
    db({
      shift_quest_milestone_submit: MAIN_ROW,
      shift_quest_schema_version: 13,
      shift_quest_quest_gift: { gift: GIFT },
      shift_quest_tree_get: new QuestDbError("shift_quest_tree_get", "57014"),
    });
    await expect(submitMainQuest({ milestone: 2, ...proof })).resolves.toMatchObject({ ok: true, data: { gift: null, tree: null } });
  });
});

describe("the gift never fails the submit", () => {
  it("answers ok with gift null when shift_quest_quest_gift throws, logging only its SQLSTATE", async () => {
    const secret = "ข้อความส่วนตัวของนักเรียน";
    db({
      shift_quest_milestone_submit: MAIN_ROW,
      shift_quest_schema_version: 13,
      shift_quest_quest_gift: new QuestDbError("shift_quest_quest_gift", "42883"),
    });
    await expect(submitMainQuest({ milestone: 2, proof: secret, reflection: secret })).resolves.toEqual({
      ok: true,
      data: { instanceId: "i-main", revision: 1, created: true, gift: null, tree: null },
    });
    expect(logged()).toContain("42883");
    expect(logged()).not.toContain(secret);
    // The submit is saved: the page refreshes as after any submit.
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("answers ok with gift null on a refusal from the gift (logged by its code)", async () => {
    db({
      shift_quest_side_submit: { instance_id: "i-side", revision: 1, created: true },
      shift_quest_schema_version: 13,
      shift_quest_quest_gift: new QuestError("no_project"),
    });
    await expect(submitSideQuest({ templateId: TEMPLATE, ...proof })).resolves.toMatchObject({ ok: true, data: { gift: null } });
    expect(logged()).toContain("no_project");
  });

  it("answers ok with gift null when the schema version cannot be read", async () => {
    db({ shift_quest_milestone_submit: MAIN_ROW, shift_quest_schema_version: new Error("connection reset") });
    await expect(submitMainQuest({ milestone: 2, ...proof })).resolves.toMatchObject({ ok: true, data: { gift: null, tree: null } });
    expect(fns()).not.toContain("shift_quest_quest_gift");
    expect(logged()).not.toContain("connection reset");
  });

  it("makes no gift call below schema 13", async () => {
    db({ shift_quest_submit: { revision: 4 }, shift_quest_schema_version: 12 });
    await expect(submitProposedQuest({ instanceId: PROPOSED, version: 3, ...proof })).resolves.toEqual({
      ok: true,
      data: { instanceId: PROPOSED, revision: 4, created: false, gift: null, tree: null },
    });
    expect(fns()).toEqual(["shift_quest_submit", "shift_quest_schema_version"]);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("asks for no gift when the submit itself is refused", async () => {
    db({ shift_quest_milestone_submit: new QuestError("milestone_open"), shift_quest_schema_version: 13 });
    await expect(submitMainQuest({ milestone: 2, ...proof })).resolves.toMatchObject({ ok: false, code: "milestone_open" });
    expect(fns()).toEqual(["shift_quest_milestone_submit"]);
  });
});
