/** @jest-environment node */
const call = jest.fn();

jest.mock("../db", () => ({
  questApi: () => ({ call, rows: jest.fn() }),
}));

// The SHIFT application lookup (service-role Supabase) behind consentOf: nothing new on file.
const importShiftConsent = jest.fn();
jest.mock("@/lib/shift-island/consent/shiftImport", () => ({
  importShiftConsent: (...args: unknown[]) => importShiftConsent(...args),
  ShiftImportError: class ShiftImportError extends Error {},
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
/** shift_quest_island_links: the suggestions forum an admin set. */
const ENV_GUILD = "444444444444444444";
const SUGGEST = "555555555555555555";
const LINKS = { suggest_channel_id: SUGGEST };
const SUGGEST_URL = `https://discord.com/channels/${ENV_GUILD}/${SUGGEST}`;
const savedGuild = process.env.DISCORD_SHIFT_GUILD_ID;

/** shift_quest_character: counts only, snake_case. */
const CHARACTER_ROW = {
  stage: 3,
  main: { team: 3, mine: 2 },
  side: { team: 4, mine: 1 },
  community: { milestones: 1, mine: 2, thanks: 5 },
  checkins: { days_active: 12, this_week: 3, run: 4 },
  coins: { live: true, shop_live: false, balance: 1300, reserved: 0 },
};
const CHARACTER = {
  stage: 3,
  main: { team: 3, mine: 2 },
  side: { team: 4, mine: 1 },
  community: { milestones: 1, mine: 2, thanks: 5 },
  checkins: { daysActive: 12, thisWeek: 3, run: 4 },
  coins: { live: true, shopLive: false, balance: 1300, reserved: 0 },
};
/** shift_quest_consent_get: a parent link waiting. */
const CONSENT_ROW = { required: true, state: "waiting", basis: null, ai: false, ok: false, link_expires_at: "2026-11-25T08:00:00Z", adult_age: 20 };
const CONSENT = { required: true, state: "waiting", basis: null, ai: false, ok: false, linkExpiresAt: "2026-11-25T08:00:00Z", adultAge: 20, parentSaidNo: false };
/** shift_quest_island_news with the digest on. */
const NEWS_ROW = {
  enabled: true,
  day: "2026-11-11",
  week_of: null,
  teams: [{ slot: 4, name: "Lamp", day: { summary: "ทีมทดสอบโคมไฟกับผู้ใช้ 3 คน", no_update: false, created_at: "2026-11-11T13:00:00Z" }, week: null }],
};
const NEWS = {
  enabled: true,
  day: "2026-11-11",
  weekOf: null,
  teams: [{ slot: 4, name: "Lamp", day: { summary: "ทีมทดสอบโคมไฟกับผู้ใช้ 3 คน", noUpdate: false, at: "2026-11-11T13:00:00Z", day: null }, week: null }],
};
/** The player round's reads, answered. */
const PLAYER = { shift_quest_character: CHARACTER_ROW, shift_quest_consent_get: CONSENT_ROW, shift_quest_island_news: NEWS_ROW };

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
  importShiftConsent.mockReset().mockResolvedValue(null);
  process.env.DISCORD_SHIFT_GUILD_ID = ENV_GUILD;
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  if (savedGuild === undefined) delete process.env.DISCORD_SHIFT_GUILD_ID;
  else process.env.DISCORD_SHIFT_GUILD_ID = savedGuild;
});

describe("getIslandPage", () => {
  it("loads the island, the map, the board and the canvas link for a student with a project", async () => {
    const board = { project: { id: "p1", route: "software", stage: 1, milestones_done: [2] }, main: [], side: [], proposed: [], help_open: [] };
    respond({
      shift_quest_island: { project, milestones: [], taps_today: 1, resting: false, season: null },
      shift_quest_island_map: map,
      shift_quest_board: board,
      shift_quest_canvas_get: null,
      shift_quest_campfire: FIRE,
      shift_quest_island_links: LINKS,
      ...PLAYER,
    });

    const page = await getIslandPage(viewer);
    expect(call.mock.calls.map(([fn, ...args]) => [fn, args])).toEqual([
      ["shift_quest_island", [ACTOR]],
      ["shift_quest_island_map", [ACTOR]],
      ["shift_quest_island_links", [ACTOR]],
      ["shift_quest_character", [ACTOR]],
      ["shift_quest_consent_get", [ACTOR]],
      ["shift_quest_island_news", [ACTOR]],
      ["shift_quest_board", [ACTOR]],
      ["shift_quest_canvas_get", [ACTOR]],
      ["shift_quest_campfire", [ACTOR, false]],
    ]);
    expect(page.canvasLink).toEqual({ linked: false });
    expect(page.campfire).toEqual({ count: 2, joinUrl: JOIN_URL });
    expect(page.suggestUrl).toBe(SUGGEST_URL);
    expect(page.character).toEqual(CHARACTER);
    expect(page.consent).toEqual(CONSENT);
    expect(page.news).toEqual(NEWS);
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
      shift_quest_island_links: LINKS,
    });

    const page = await getIslandPage(viewer);
    expect(call).not.toHaveBeenCalledWith("shift_quest_board", expect.anything());
    expect(call).not.toHaveBeenCalledWith("shift_quest_canvas_get", expect.anything());
    expect(call).toHaveBeenCalledWith("shift_quest_campfire", ACTOR, false);
    expect(call).toHaveBeenCalledWith("shift_quest_island_links", ACTOR);
    expect(page.canvasLink).toEqual({ linked: false });
    expect(page.campfire).toEqual({ count: 2, joinUrl: JOIN_URL });
    expect(page.suggestUrl).toBe(SUGGEST_URL);
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

  describe("suggestUrl", () => {
    const board = { project: { id: "p1", route: "software", stage: 1, milestones_done: [] }, main: [], side: [], proposed: [], help_open: [] };
    const withProject = {
      shift_quest_island: { project, milestones: [], taps_today: 0, resting: false, season: null },
      shift_quest_island_map: map,
      shift_quest_board: board,
      shift_quest_canvas_get: null,
      shift_quest_campfire: FIRE,
    };
    const noProject = {
      shift_quest_island: { project: null, milestones: [], taps_today: 0, resting: false, season: null },
      shift_quest_island_map: map,
      shift_quest_project_list: [],
      shift_quest_campfire: FIRE,
    };

    it.each([
      ["with a project", withProject],
      ["without a project", noProject],
    ])("links the suggestions channel %s", async (_label, base) => {
      respond({ ...base, shift_quest_island_links: LINKS });
      const page = await getIslandPage(viewer);
      expect(call).toHaveBeenCalledWith("shift_quest_island_links", ACTOR);
      expect(page.suggestUrl).toBe(SUGGEST_URL);
    });

    it.each([
      ["with a project", withProject],
      ["without a project", noProject],
    ])("is null %s when no suggestions channel is set", async (_label, base) => {
      respond({ ...base, shift_quest_island_links: { suggest_channel_id: null } });
      expect((await getIslandPage(viewer)).suggestUrl).toBeNull();
    });

    it("is null without a guild configured", async () => {
      delete process.env.DISCORD_SHIFT_GUILD_ID;
      respond({ ...withProject, shift_quest_island_links: LINKS });
      expect((await getIslandPage(viewer)).suggestUrl).toBeNull();
    });

    it.each([
      ["the function missing (before the migration)", new QuestDbError("shift_quest_island_links", "42883")],
      ["no grant", new QuestDbError("shift_quest_island_links", "42501")],
      ["a refusal", new QuestError("not_started")],
      ["an unexpected error", new Error("student text in a message")],
      ["malformed data", "not an object"],
    ])("is null on %s, and the rest of the page still loads", async (_label, failure) => {
      respond({ ...withProject, shift_quest_island_links: failure });
      const page = await getIslandPage(viewer);
      expect(page.suggestUrl).toBeNull();
      expect(page.board).toEqual(board);
      expect(page.campfire).toEqual({ count: 2, joinUrl: JOIN_URL });
      expect((console.error as jest.Mock).mock.calls.flat().map(String).join("\n")).not.toContain("student text");
    });
  });

  describe("character, consent and news", () => {
    const board = { project: { id: "p1", route: "software", stage: 1, milestones_done: [] }, main: [], side: [], proposed: [], help_open: [] };
    const withProject = {
      shift_quest_island: { project, milestones: [], taps_today: 0, resting: false, season: null },
      shift_quest_island_map: map,
      shift_quest_board: board,
      shift_quest_canvas_get: null,
      shift_quest_campfire: FIRE,
      shift_quest_island_links: LINKS,
    };
    const noProject = {
      shift_quest_island: { project: null, milestones: [], taps_today: 0, resting: false, season: null },
      shift_quest_island_map: map,
      shift_quest_project_list: [],
      shift_quest_campfire: FIRE,
      shift_quest_island_links: LINKS,
    };

    it.each([
      ["with a project", withProject],
      ["without a project", noProject],
    ])("are read for every ready viewer %s", async (_label, base) => {
      respond({ ...base, ...PLAYER });
      const page = await getIslandPage(viewer);
      expect(page.character).toEqual(CHARACTER);
      expect(page.consent).toEqual(CONSENT);
      expect(page.news).toEqual(NEWS);
      // The SHIFT lookup for consent gets the actor and the user id from getUser(), never anything from the client.
      expect(importShiftConsent).toHaveBeenCalledWith(expect.anything(), { actor: ACTOR, userId: USER_ID }, CONSENT);
    });

    it("carries no ids or names in the character stats", async () => {
      respond({ ...withProject, ...PLAYER, shift_quest_character: { ...CHARACTER_ROW, member_id: "m1", name: "Mint" } });
      const page = await getIslandPage(viewer);
      const json = JSON.stringify(page.character);
      for (const secret of ["m1", "Mint", ACTOR]) expect(json).not.toContain(secret);
    });

    it("leaves the news out while the digest is off", async () => {
      respond({ ...withProject, ...PLAYER, shift_quest_island_news: { enabled: false, day: "2026-11-11", week_of: null, teams: [] } });
      expect((await getIslandPage(viewer)).news).toBeNull();
    });

    it.each([
      ["the functions missing (before the migration)", (fn: string) => new QuestDbError(fn, "42883")],
      ["no grant", (fn: string) => new QuestDbError(fn, "42501")],
      ["a refusal", () => new QuestError("not_started")],
      ["an unexpected error", () => new Error("student text in a message")],
      ["malformed data", () => "not an object"],
    ])("are null on %s, and the rest of the page still loads", async (_label, failure) => {
      respond({
        ...withProject,
        shift_quest_character: failure("shift_quest_character"),
        shift_quest_consent_get: failure("shift_quest_consent_get"),
        shift_quest_island_news: failure("shift_quest_island_news"),
      });
      const page = await getIslandPage(viewer);
      expect(page.character).toBeNull();
      expect(page.consent).toBeNull();
      expect(page.news).toBeNull();
      expect(page.board).toEqual(board);
      expect(page.campfire).toEqual({ count: 2, joinUrl: JOIN_URL });
      expect(page.suggestUrl).toBe(SUGGEST_URL);
      expect((console.error as jest.Mock).mock.calls.flat().map(String).join("\n")).not.toContain("student text");
    });

    it("keeps the consent on file when the SHIFT lookup fails", async () => {
      importShiftConsent.mockRejectedValue(new Error("network"));
      respond({ ...withProject, ...PLAYER });
      expect((await getIslandPage(viewer)).consent).toEqual(CONSENT);
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
