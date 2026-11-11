/** @jest-environment node */
const call = jest.fn();

jest.mock("../db", () => ({
  questApi: () => ({ call, rows: jest.fn() }),
}));

import { QuestDbError, QuestError } from "@/bot/src/quests/api";

import { getIslandMap, getIslandPage } from "../page";
import type { ReadyViewer } from "../types";

const ACTOR = "123456789012345678";

const USER_ID = "0b7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a";

const viewer: ReadyViewer = {
  state: "ready",
  me: { name: "Mint", avatarUrl: null, staff: false },
  actor: ACTOR,
  userId: USER_ID,
  session: {
    member_id: "m1",
    onboarded: true,
    roles: [],
    current_project_id: null,
    unread: 3,
    prefs: null,
    settings: {
      student_role_ids: ["r"],
      awards: false,
      redemption: false,
      sharing: false,
      reminders: false,
      reward_terms: null,
      redemption_terms: null,
    },
  },
};

const project = {
  id: "p1",
  name: "Lamp",
  route: "software",
  slot: 4,
  stage: 1,
  milestones_done: [2],
  next_milestone: 1,
  show_name: false,
  name_visible: false,
};

const map = {
  plots: [{ slot: 4, stage: 1, visitor: false, key: false, helper: false, lantern: false, name: null, mine: true }],
  goal: null,
  season: null,
};

const GUILD = "111111111111111111";
const CHANNEL = "222222222222222222";
/** shift_quest_campfire with names = false, as the database answers while the bot beats. */
const FIRE = { channel_id: CHANNEL, guild_id: GUILD, live: true, count: 2, names: null };
const JOIN_URL = `https://discord.com/channels/${GUILD}/${CHANNEL}`;

function respond(responses: Record<string, unknown>) {
  call.mockImplementation(async (fn: string) => {
    if (!(fn in responses)) throw new Error(`unexpected ${fn}`);
    const value = responses[fn];
    if (value instanceof Error) throw value;
    return value;
  });
}

beforeEach(() => {
  call.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe("getIslandPage", () => {
  it("loads the island, the map, the board and the canvas link for a student with a project", async () => {
    const board = { project: { id: "p1", route: "software", stage: 1, milestones_done: [2] }, main: [], side: [], proposed: [], help_open: [] };
    respond({
      shift_quest_island: { project, milestones: [], taps_today: 1, resting: false, season: null },
      shift_quest_island_map: map,
      shift_quest_board: board,
      shift_quest_canvas_get: null,
      shift_quest_campfire: FIRE,
    });

    const page = await getIslandPage(viewer);
    expect(call.mock.calls.map(([fn, ...args]) => [fn, args])).toEqual([
      ["shift_quest_island", [ACTOR]],
      ["shift_quest_island_map", [ACTOR]],
      ["shift_quest_board", [ACTOR]],
      ["shift_quest_canvas_get", [ACTOR]],
      ["shift_quest_campfire", [ACTOR, false]],
    ]);
    expect(page.canvasLink).toEqual({ linked: false });
    expect(page.campfire).toEqual({ count: 2, joinUrl: JOIN_URL });
    expect(page.me).toBe(viewer.me);
    expect(page.unread).toBe(3);
    expect(page.island.project?.name).toBe("Lamp");
    expect(page.board).toEqual(board);
    expect(page.invites).toEqual([]);
    // plain defaults to false when the database leaves it out.
    expect(page.map.plots[0].plain).toBe(false);
  });

  it("loads pending invites instead of a board when there is no project", async () => {
    respond({
      shift_quest_island: { project: null, milestones: null, taps_today: 0, resting: false, season: null },
      shift_quest_island_map: { plots: null, goal: null, season: null },
      shift_quest_project_list: [
        { id: "a", name: "Garden", route: "service", status: "invited", is_current: false, inviter: "Ploy" },
        { id: "b", name: "Old", route: "other", status: "active", is_current: false, inviter: null },
        { id: "c", name: "Zine", route: "creative", status: "invited", is_current: false, inviter: null },
      ],
      shift_quest_campfire: FIRE,
    });

    const page = await getIslandPage(viewer);
    expect(call).not.toHaveBeenCalledWith("shift_quest_board", expect.anything());
    expect(call).not.toHaveBeenCalledWith("shift_quest_canvas_get", expect.anything());
    expect(call).toHaveBeenCalledWith("shift_quest_campfire", ACTOR, false);
    expect(page.canvasLink).toEqual({ linked: false });
    expect(page.campfire).toEqual({ count: 2, joinUrl: JOIN_URL });
    expect(page.board).toBeNull();
    expect(page.invites).toEqual([
      { projectId: "a", name: "Garden", route: "service", inviter: "Ploy" },
      { projectId: "c", name: "Zine", route: "creative", inviter: null },
    ]);
    expect(page.island.milestones).toEqual([]);
    expect(page.map.plots).toEqual([]);
  });

  describe("canvasLink", () => {
    const board = { project: { id: "p1", route: "software", stage: 1, milestones_done: [] }, main: [], side: [], proposed: [], help_open: [] };
    const base = {
      shift_quest_island: { project, milestones: [], taps_today: 0, resting: false, season: null },
      shift_quest_island_map: map,
      shift_quest_board: board,
    };

    it("is linked with only the time, never the board, frame or canvas project id", async () => {
      const boardId = "9d1f2c3b-4a5e-4f60-8a7b-1c2d3e4f5a6b";
      respond({
        ...base,
        shift_quest_canvas_get: { board_id: boardId, frame_id: "frame-1", canvas_project: "proj-1", linked_at: "2026-11-11T08:00:00Z" },
        shift_quest_campfire: FIRE,
      });
      const page = await getIslandPage(viewer);
      expect(page.canvasLink).toEqual({ linked: true, linkedAt: "2026-11-11T08:00:00Z" });
      const json = JSON.stringify(page);
      expect(json).not.toContain(boardId);
      expect(json).not.toContain("frame-1");
      expect(json).not.toContain("proj-1");
    });

    it.each([
      ["a refusal", new QuestError("not_started")],
      ["a database failure", new QuestDbError("shift_quest_canvas_get", "42883")],
      ["an unexpected error", new Error("student text in a message")],
    ])("falls back to unlinked on %s and logs only a code", async (_label, error) => {
      respond({ ...base, shift_quest_canvas_get: error });
      const page = await getIslandPage(viewer);
      expect(page.canvasLink).toEqual({ linked: false });
      expect(page.board).toEqual(board);
      const logged = (console.error as jest.Mock).mock.calls.flat().map(String).join("\n");
      expect(logged).toContain("canvas link read failed");
      expect(logged).not.toContain("student text");
    });

    it("treats a malformed row as unlinked", async () => {
      respond({ ...base, shift_quest_canvas_get: { board_id: "x" } });
      expect((await getIslandPage(viewer)).canvasLink).toEqual({ linked: false });
    });
  });

  describe("campfire", () => {
    const board = { project: { id: "p1", route: "software", stage: 1, milestones_done: [] }, main: [], side: [], proposed: [], help_open: [] };
    const withProject = {
      shift_quest_island: { project, milestones: [], taps_today: 0, resting: false, season: null },
      shift_quest_island_map: map,
      shift_quest_board: board,
      shift_quest_canvas_get: null,
    };
    const noProject = {
      shift_quest_island: { project: null, milestones: [], taps_today: 0, resting: false, season: null },
      shift_quest_island_map: map,
      shift_quest_project_list: [],
    };

    it.each([
      ["with a project", withProject],
      ["without a project", noProject],
    ])("is read %s, with names = false", async (_label, base) => {
      respond({ ...base, shift_quest_campfire: { ...FIRE, count: 0 } });
      const page = await getIslandPage(viewer);
      expect(call).toHaveBeenCalledWith("shift_quest_campfire", ACTOR, false);
      expect(page.campfire).toEqual({ count: 0, joinUrl: JOIN_URL });
    });

    it.each([
      ["with a project", withProject],
      ["without a project", noProject],
    ])("is null %s when no coworking channel is set", async (_label, base) => {
      respond({ ...base, shift_quest_campfire: { channel_id: null, guild_id: null, live: false, count: 0, names: null } });
      expect((await getIslandPage(viewer)).campfire).toBeNull();
    });

    it.each([
      ["the function missing (before the migration)", new QuestDbError("shift_quest_campfire", "42883")],
      ["no grant", new QuestDbError("shift_quest_campfire", "42501")],
      ["a refusal", new QuestError("not_started")],
      ["an unexpected error", new Error("student text in a message")],
      ["malformed data", "not an object"],
    ])("is null on %s, and the rest of the page still loads", async (_label, failure) => {
      respond({ ...withProject, shift_quest_campfire: failure });
      const page = await getIslandPage(viewer);
      expect(page.campfire).toBeNull();
      expect(page.board).toEqual(board);
      expect((console.error as jest.Mock).mock.calls.flat().map(String).join("\n")).not.toContain("student text");
    });

    it("carries only the count and the join link, never names or ids", async () => {
      // Even if the database sent names with names = false, the payload has none.
      respond({ ...withProject, shift_quest_campfire: { ...FIRE, names: ["Mint", "ครูพลอย"], discord_user_id: "333333333333333333" } });
      const page = await getIslandPage(viewer);
      expect(Object.keys(page.campfire ?? {}).sort()).toEqual(["count", "joinUrl"]);
      const json = JSON.stringify(page.campfire);
      for (const secret of ["Mint", "ครูพลอย", "333333333333333333", ACTOR]) expect(json).not.toContain(secret);
    });
  });

  it("passes refusals through", async () => {
    respond({ shift_quest_island: new QuestError("not_started"), shift_quest_island_map: map });
    await expect(getIslandPage(viewer)).rejects.toBeInstanceOf(QuestError);
  });
});

describe("getIslandMap", () => {
  it("calls shift_quest_island_map for the actor and normalizes plots", async () => {
    respond({ shift_quest_island_map: map });
    const result = await getIslandMap(ACTOR);
    expect(call).toHaveBeenCalledWith("shift_quest_island_map", ACTOR);
    expect(result.plots).toEqual([{ ...map.plots[0], plain: false }]);
  });
});
