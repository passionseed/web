/**
 * @jest-environment node
 */
import { MessageFlags } from "discord.js";

import { DEFAULT_STYLE, SEEDS } from "@/lib/shift-island/tree-style";

import { ACTION_HANDLERS } from "..";
import { QuestDbError, QuestError, type QuestApi, type Session } from "../api";
import type { Ctx } from "../context";
import { errorText } from "../copy";
import { islandMessage, type IslandView } from "../handlers/island";
import { CLOSEUP_PNG, GIFT_PNG, SEED_PNG } from "../handlers/tree";
import { I, PRE_STAGE, STAGE_NAMES, TREE } from "../island/copy";
import { putDraft } from "../drafts";
import { closeupPng, giftPreviewPng, seedPreviewPng } from "../island/closeup-png";
import { resetTreeForTests } from "../island/tree";
import { LIMITS, renderView } from "../ui";
import { bodyText, componentCount, customIds, mediaUrls, viewText } from "../test-helpers/view";

const USER = "1111111111";
const GIFT = "7c1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e71";
const NOTE = "3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e51";
const SESSION = "3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e52";
const INSTANCE = "6b1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e11";
const OPTIONS = ["leaf:autumn", "leaf:mint", "leaf:gold"];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** Discord's upload limit for a bot without a boosted server. */
const DISCORD_MAX = 8 * 1024 * 1024;

function session(): Session {
  return {
    member_id: "m",
    onboarded: true,
    roles: [],
    current_project_id: "p",
    unread: 0,
    prefs: null,
    settings: {
      student_role_ids: ["555"],
      awards: true,
      redemption: false,
      sharing: false,
      reminders: false,
      reward_terms: null,
      redemption_terms: null,
      squads: true,
    },
  };
}

type Answers = Record<string, unknown>;

/** A fake api: each function answers from the table (an Error is thrown); anything else answers null. */
function ctx(answers: Answers = {}): Ctx {
  const api = {
    call: jest.fn(async (fn: string) => {
      const value = answers[fn];
      if (value instanceof Error) throw value;
      return typeof value === "function" ? (value as () => unknown)() : (value ?? null);
    }),
    rows: jest.fn(),
  };
  return { api: api as unknown as QuestApi, userId: USER, name: "x", memberRoleIds: ["555"], session: session() };
}
const calls = (c: Ctx) => (c.api.call as jest.Mock).mock.calls as unknown[][];
const called = (c: Ctx, fn: string) => calls(c).filter(([name]) => name === fn);

type Payload = { flags?: number; components?: unknown[]; files?: { attachment?: unknown; name?: string }[]; attachments?: unknown[] };

function interaction(kind: "button" | "modal", fields: Record<string, string> = {}) {
  const sent: { how: string; payload: Payload }[] = [];
  const modals: { custom_id?: string; title?: string; components?: unknown[] }[] = [];
  const record = (how: string) => async (payload: Payload) => {
    if (how === "reply" || how === "editReply" || how === "update") i.replied = true;
    sent.push({ how, payload });
  };
  const i: Record<string, unknown> = {
    id: "2",
    deferred: false,
    replied: false,
    customId: "sq|x",
    message: { content: "", embeds: [] },
    isChatInputCommand: () => false,
    isMessageComponent: () => kind === "button",
    isButton: () => kind === "button",
    isStringSelectMenu: () => false,
    isModalSubmit: () => kind === "modal",
    fields: { getTextInputValue: (id: string) => fields[id] ?? "" },
    reply: record("reply"),
    editReply: record("editReply"),
    update: record("update"),
    followUp: record("followUp"),
    deferReply: async (payload: Payload) => {
      i.deferred = true;
      sent.push({ how: "deferReply", payload });
    },
    deferUpdate: async () => {
      i.deferred = true;
      sent.push({ how: "deferUpdate", payload: {} });
    },
    showModal: async (m: { toJSON: () => { custom_id?: string } }) => modals.push(m.toJSON()),
  };
  return { i: i as never, sent, modals };
}

const tree = (over: Record<string, unknown> = {}) => ({
  seed: "oak",
  equipped: { ...DEFAULT_STYLE },
  owned: Object.values(DEFAULT_STYLE),
  gifts: [{ id: GIFT, options: OPTIONS }],
  roots: { count: 3, recent: 1 },
  stage: 4,
  ...over,
});

/** The last card sent, and every card. */
const cards = (sent: { how: string; payload: Payload }[]) => sent.filter((s) => s.how !== "deferReply" && s.how !== "deferUpdate");
const isPng = (buffer: unknown) => Buffer.isBuffer(buffer) && PNG.every((b, k) => buffer[k] === b);
const pngSize = (buffer: Buffer) => ({ width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) });
const fileOf = (payload: Payload, name: string) => payload.files?.find((f) => f.name === name)?.attachment as Buffer | undefined;
const ephemeral = (payload: Payload) => Boolean((payload.flags ?? 0) & MessageFlags.Ephemeral);
const pickIds = [0, 1, 2].map((k) => `sq|tr_pick|${GIFT}|${k}`);

beforeEach(() => {
  resetTreeForTests();
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe("pictures", () => {
  const base = { style: DEFAULT_STYLE, stage: 4, seeded: true, roots: { count: 3, recent: 1 } };

  it("draws the close-up at 4 pixels per grid pixel, well under Discord's upload limit", () => {
    const png = closeupPng(base);
    expect(isPng(png)).toBe(true);
    expect(pngSize(png)).toEqual({ width: 96 * 4, height: 150 * 4 });
    expect(png.length).toBeLessThan(DISCORD_MAX / 10);
    expect(pngSize(closeupPng(base, 2))).toEqual({ width: 192, height: 300 });
  });

  it("puts the gift's options side by side, one panel each, and changes with the options", () => {
    const three = giftPreviewPng(base, OPTIONS);
    const two = giftPreviewPng(base, OPTIONS.slice(0, 2));
    expect(isPng(three)).toBe(true);
    expect(pngSize(three).height).toBe(pngSize(two).height);
    expect(pngSize(three).width).toBeGreaterThan(pngSize(two).width);
    expect(three.equals(giftPreviewPng(base, ["leaf:dusk", "leaf:sky", "leaf:gold"]))).toBe(false);
    expect(three.length).toBeLessThan(DISCORD_MAX / 10);
  });

  it("shows the four seeds grown, in the order of their buttons", () => {
    const png = seedPreviewPng();
    expect(isPng(png)).toBe(true);
    expect(pngSize(png).width).toBeGreaterThan(pngSize(png).height * 3);
    expect(png.length).toBeLessThan(DISCORD_MAX / 10);
  });
});

describe("✍️ closing a round", () => {
  const learned = "เข้าใจ session cookie แล้ว";

  it("schema 12: closes the round as today, with no gift", async () => {
    const c = ctx({ shift_quest_schema_version: 12, shift_quest_round_close: NOTE });
    const b = interaction("modal", { learned, stuck: "redirect วน" });
    await ACTION_HANDLERS.get("rd_close_go")!(b.i, c, [SESSION]);
    expect(calls(c)).toEqual([
      ["shift_quest_schema_version"],
      ["shift_quest_round_close", USER, SESSION, learned, "redirect วน"],
    ]);
    expect(b.sent.map((s) => s.how)).toEqual(["deferReply", "editReply"]);
    expect(customIds(b.sent[1].payload)).toEqual([`sq|prog_help|${NOTE}`]);
    expect(b.sent[1].payload.files ?? []).toEqual([]);
  });

  it("schema 13: closes with the gift wrapper and offers the gift: its picture, 3 picks and keep", async () => {
    const c = ctx({
      shift_quest_schema_version: 13,
      shift_quest_round_close_gift: { id: NOTE, gift: { id: GIFT, options: OPTIONS } },
      shift_quest_tree_get: tree(),
    });
    const b = interaction("modal", { learned, stuck: "redirect วน" });
    await ACTION_HANDLERS.get("rd_close_go")!(b.i, c, [SESSION]);
    expect(called(c, "shift_quest_round_close")).toEqual([]);
    expect(called(c, "shift_quest_round_close_gift")).toEqual([["shift_quest_round_close_gift", USER, SESSION, learned, "redirect วน"]]);
    expect(b.sent[0].how).toBe("deferReply");
    // The saved reflection first, exactly as before (the help button keeps its note).
    const [saved, gift] = cards(b.sent);
    expect(customIds(saved.payload)).toEqual([`sq|prog_help|${NOTE}`]);
    // Then the gift, privately: one picture of the options and their buttons.
    expect(gift.how).toBe("followUp");
    expect(ephemeral(gift.payload)).toBe(true);
    expect(isPng(fileOf(gift.payload, GIFT_PNG))).toBe(true);
    expect(mediaUrls(gift.payload)).toEqual([`attachment://${GIFT_PNG}`]);
    expect(customIds(gift.payload)).toEqual([...pickIds, "sq|tr_later"]);
    const text = viewText(gift.payload);
    expect(text).toContain(TREE.gift.roundHeading);
    expect(text).toContain(TREE.gift.sub);
    expect(text).toContain(`${TREE.slots.leaf} ใบไม้แดง`);
    expect(text).not.toMatch(/<@|@everyone/);
  });

  it("schema 13 without a gift (the daily cap, nothing left): the saved reply only", async () => {
    const c = ctx({ shift_quest_schema_version: 13, shift_quest_round_close_gift: { id: NOTE, gift: null } });
    const b = interaction("modal", { learned });
    await ACTION_HANDLERS.get("rd_close_go")!(b.i, c, [""]);
    expect(called(c, "shift_quest_round_close_gift")).toEqual([["shift_quest_round_close_gift", USER, null, learned, null]]);
    expect(cards(b.sent).map((s) => s.how)).toEqual(["editReply"]);
    expect(called(c, "shift_quest_tree_get")).toEqual([]);
  });

  it("a gift whose tree cannot be read waits for later: the saved reply stands", async () => {
    const c = ctx({
      shift_quest_schema_version: 13,
      shift_quest_round_close_gift: { id: NOTE, gift: { id: GIFT, options: OPTIONS } },
      shift_quest_tree_get: new QuestDbError("shift_quest_tree_get", "57014"),
    });
    const b = interaction("modal", { learned });
    await ACTION_HANDLERS.get("rd_close_go")!(b.i, c, [SESSION]);
    expect(cards(b.sent).map((s) => s.how)).toEqual(["editReply"]);
  });
});

describe("🎁 picking a gift", () => {
  it("picks by index from the gift as the database has it, never an item from the button", async () => {
    const c = ctx({
      shift_quest_tree_get: tree(),
      shift_quest_tree_pick: tree({ equipped: { ...DEFAULT_STYLE, leaf: "leaf:mint" }, gifts: [] }),
    });
    const b = interaction("button");
    await ACTION_HANDLERS.get("tr_pick")!(b.i, c, [GIFT, "1"]);
    expect(called(c, "shift_quest_tree_pick")).toEqual([["shift_quest_tree_pick", USER, GIFT, "leaf:mint"]]);
    const card = cards(b.sent).at(-1)!;
    expect(isPng(fileOf(card.payload, CLOSEUP_PNG))).toBe(true);
    expect(viewText(card.payload)).toContain(TREE.gift.picked(`${TREE.slots.leaf} มิ้นต์`));
    expect(customIds(card.payload)).not.toContain(pickIds[0]);
    // It replaces the gift card, dropping the old picture.
    expect(card.payload.attachments).toEqual([]);
  });

  it("says the gift is gone when a teammate picked it first, without a crash", async () => {
    const c = ctx({ shift_quest_tree_get: tree(), shift_quest_tree_pick: new QuestError("gift_gone") });
    const b = interaction("button");
    await ACTION_HANDLERS.get("tr_pick")!(b.i, c, [GIFT, "0"]);
    expect(bodyText(cards(b.sent).at(-1)!.payload)).toContain(errorText("gift_gone"));
    expect(customIds(cards(b.sent).at(-1)!.payload)).not.toContain(pickIds[0]);
  });

  it("says the gift is gone when it no longer waits, before trying to pick", async () => {
    const c = ctx({ shift_quest_tree_get: tree({ gifts: [] }) });
    const b = interaction("button");
    await ACTION_HANDLERS.get("tr_pick")!(b.i, c, [GIFT, "2"]);
    expect(called(c, "shift_quest_tree_pick")).toEqual([]);
    expect(bodyText(cards(b.sent).at(-1)!.payload)).toContain(errorText("gift_gone"));
  });

  it("never offers a look the team owns by now: its button goes, the others keep their index", async () => {
    // A teammate took leaf:mint from another gift after this one was made.
    const c = ctx({ shift_quest_tree_get: tree({ owned: [...Object.values(DEFAULT_STYLE), "leaf:mint"] }) });
    const b = interaction("button");
    await ACTION_HANDLERS.get("tr_gift")!(b.i, c, []);
    const card = cards(b.sent).at(-1)!;
    expect(customIds(card.payload)).toEqual([pickIds[0], pickIds[2], "sq|tr_later"]);
    expect(viewText(card.payload)).not.toContain(`${TREE.slots.leaf} มิ้นต์`);
    expect(viewText(card.payload)).toContain(TREE.gift.subFew);
  });

  it("a pick of a look the team came to own meanwhile is not sent: the gift's other options come back", async () => {
    const c = ctx({ shift_quest_tree_get: tree({ owned: [...Object.values(DEFAULT_STYLE), "leaf:mint"] }) });
    const b = interaction("button");
    await ACTION_HANDLERS.get("tr_pick")!(b.i, c, [GIFT, "1"]);
    expect(called(c, "shift_quest_tree_pick")).toEqual([]);
    const card = cards(b.sent).at(-1)!;
    expect(customIds(card.payload)).toEqual([pickIds[0], pickIds[2], "sq|tr_later"]);

    // Every option owned by now: the gift has nothing left, so it reads as gone.
    const all = ctx({ shift_quest_tree_get: tree({ owned: [...Object.values(DEFAULT_STYLE), ...OPTIONS] }) });
    const e = interaction("button");
    await ACTION_HANDLERS.get("tr_pick")!(e.i, all, [GIFT, "1"]);
    expect(called(all, "shift_quest_tree_pick")).toEqual([]);
    expect(bodyText(cards(e.sent).at(-1)!.payload)).toContain(errorText("gift_gone"));
  });

  it("🎁 skips a gift whose every option the team owns, and counts only gifts with something left", async () => {
    const OTHER = "7c1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e72";
    const stale = { id: GIFT, options: ["leaf:mint"] };
    const fresh = { id: OTHER, options: ["bark:ash"] };
    const owned = [...Object.values(DEFAULT_STYLE), "leaf:mint"];
    const c = ctx({ shift_quest_tree_get: tree({ owned, gifts: [stale, fresh] }) });
    const b = interaction("button");
    await ACTION_HANDLERS.get("tr_gift")!(b.i, c, []);
    expect(customIds(cards(b.sent).at(-1)!.payload)).toEqual([`sq|tr_pick|${OTHER}|0`, "sq|tr_later"]);
  });

  it("ignores forged ids and indexes", async () => {
    for (const args of [["not-a-uuid", "0"], [GIFT, "3"], [GIFT, "-1"], [GIFT, "x"], [GIFT]]) {
      const c = ctx({ shift_quest_tree_get: tree() });
      const b = interaction("button");
      await ACTION_HANDLERS.get("tr_pick")!(b.i, c, args);
      expect([args, calls(c), b.sent]).toEqual([args, [], []]);
    }
  });

  it("keep for later: the buttons go, the gift waits, nothing is written", async () => {
    const c = ctx();
    const b = interaction("button");
    await ACTION_HANDLERS.get("tr_later")!(b.i, c, []);
    expect(calls(c)).toEqual([]);
    const card = cards(b.sent).at(-1)!;
    expect(card.how).toBe("update");
    expect(bodyText(card.payload)).toContain(TREE.gift.kept);
    expect(customIds(card.payload).filter((id) => id.startsWith("sq|tr_"))).toEqual([]);
    expect(card.payload.attachments).toEqual([]);
  });

  it("🎁 opens the oldest waiting gift, or says there is none", async () => {
    const c = ctx({ shift_quest_tree_get: tree() });
    const b = interaction("button");
    await ACTION_HANDLERS.get("tr_gift")!(b.i, c, []);
    expect(b.sent[0].how).toBe("deferReply");
    expect(ephemeral(b.sent[0].payload)).toBe(true);
    const card = cards(b.sent).at(-1)!;
    expect(isPng(fileOf(card.payload, GIFT_PNG))).toBe(true);
    expect(customIds(card.payload)).toEqual([...pickIds, "sq|tr_later"]);

    const none = ctx({ shift_quest_tree_get: tree({ gifts: [] }) });
    const e = interaction("button");
    await ACTION_HANDLERS.get("tr_gift")!(e.i, none, []);
    expect(bodyText(cards(e.sent).at(-1)!.payload)).toContain(errorText("gift_gone"));
  });
});

describe("🌰 choosing the seed", () => {
  it("shows the four seeds in one picture with a button each", async () => {
    const c = ctx({ shift_quest_tree_get: tree({ seed: null }) });
    const b = interaction("button");
    await ACTION_HANDLERS.get("tr_seed")!(b.i, c, []);
    expect(b.sent[0].how).toBe("deferReply");
    expect(ephemeral(b.sent[0].payload)).toBe(true);
    const card = cards(b.sent).at(-1)!;
    expect(isPng(fileOf(card.payload, SEED_PNG))).toBe(true);
    expect(customIds(card.payload)).toEqual([...Object.keys(SEEDS).map((s) => `sq|tr_seed_pick|${s}`), "sq|is_view"]);
    for (const seed of Object.values(TREE.seeds)) expect(viewText(card.payload)).toContain(seed.blurb);
  });

  it("says so when the team already has its seed", async () => {
    const c = ctx({ shift_quest_tree_get: tree({ seed: "maple" }) });
    const b = interaction("button");
    await ACTION_HANDLERS.get("tr_seed")!(b.i, c, []);
    expect(bodyText(cards(b.sent).at(-1)!.payload)).toContain(errorText("seed_planted"));
    expect(customIds(cards(b.sent).at(-1)!.payload)).not.toContain("sq|tr_seed_pick|oak");
  });

  it("a seed's button asks what the team wants to build, in one line of up to 500 characters", async () => {
    const b = interaction("button");
    await ACTION_HANDLERS.get("tr_seed_pick")!(b.i, ctx(), ["pine"]);
    expect(b.modals[0].custom_id).toBe("sq|tr_seed_go|pine");
    const json = JSON.stringify(b.modals[0]);
    expect(json).toContain('"max_length":500');
    expect(json).toContain('"required":true');
    expect(json).toContain(TREE.ideaLabel);
    expect(json).toContain(TREE.seeds.pine.name);
    // No ambition (or no tree to read): the line starts empty, with no prefilled hint.
    expect(json).not.toContain(TREE.ideaPrefilled);
    expect(json).not.toContain('"value"');
    const forged = interaction("button");
    await ACTION_HANDLERS.get("tr_seed_pick")!(forged.i, ctx(), ["palm"]);
    expect(forged.modals).toEqual([]);
  });

  it("the idea line starts from the project's ambition, and its hint says the team can edit it", async () => {
    const c = ctx({ shift_quest_schema_version: 13, shift_quest_tree_get: tree({ seed: null, ambition: "แอปจองโต๊ะอ่านหนังสือ" }) });
    const b = interaction("button");
    await ACTION_HANDLERS.get("tr_seed_pick")!(b.i, c, ["oak"]);
    const json = JSON.stringify(b.modals[0]);
    expect(json).toContain('"value":"แอปจองโต๊ะอ่านหนังสือ"');
    expect(json).toContain(TREE.ideaPrefilled);
    expect(TREE.ideaPrefilled.length).toBeLessThanOrEqual(100);
  });

  it("puts the seed in the ground with the idea, answered first, then shows the tree", async () => {
    const b = interaction("modal", { idea: "  แอปหาที่นั่งอ่านหนังสือ  " });
    const c = ctx({
      shift_quest_seed_plant: () => {
        expect(b.sent[0].how).toBe("deferReply");
        return tree({ seed: "pine", equipped: SEEDS.pine.style, stage: 0, roots: { count: 0, recent: 0 }, gifts: [] });
      },
    });
    await ACTION_HANDLERS.get("tr_seed_go")!(b.i, c, ["pine"]);
    expect(calls(c)).toEqual([["shift_quest_seed_plant", USER, "pine", "แอปหาที่นั่งอ่านหนังสือ"]]);
    expect(ephemeral(b.sent[0].payload)).toBe(true);
    const card = cards(b.sent).at(-1)!;
    expect(viewText(card.payload)).toContain(TREE.planted);
    expect(isPng(fileOf(card.payload, CLOSEUP_PNG))).toBe(true);
  });

  it("a teammate's seed first: says so, never an error", async () => {
    const c = ctx({ shift_quest_seed_plant: new QuestError("seed_planted") });
    const b = interaction("modal", { idea: "แอป" });
    await ACTION_HANDLERS.get("tr_seed_go")!(b.i, c, ["oak"]);
    expect(bodyText(cards(b.sent).at(-1)!.payload)).toContain(errorText("seed_planted"));
  });

  it("ignores a forged seed", async () => {
    const c = ctx();
    const b = interaction("modal", { idea: "แอป" });
    await ACTION_HANDLERS.get("tr_seed_go")!(b.i, c, ["palm"]);
    expect([calls(c), b.sent]).toEqual([[], []]);
  });
});

describe("🔍 the close-up", () => {
  it("answers privately with the team's tree as a picture, its stage and roots", async () => {
    const c = ctx({ shift_quest_tree_get: tree() });
    const b = interaction("button");
    await ACTION_HANDLERS.get("is_tree")!(b.i, c, []);
    expect(calls(c)).toEqual([["shift_quest_tree_get", USER]]);
    expect(b.sent[0].how).toBe("deferReply");
    expect(ephemeral(b.sent[0].payload)).toBe(true);
    const card = cards(b.sent).at(-1)!;
    const png = fileOf(card.payload, CLOSEUP_PNG)!;
    expect(isPng(png)).toBe(true);
    expect(png.length).toBeLessThan(DISCORD_MAX);
    expect(mediaUrls(card.payload)).toEqual([`attachment://${CLOSEUP_PNG}`]);
    expect(viewText(card.payload)).toContain(TREE.closeup.roots(3));
    // A waiting gift is one tap away; no seed button once the seed is in.
    expect(customIds(card.payload)).toContain("sq|tr_gift");
    expect(customIds(card.payload)).not.toContain("sq|tr_seed");
  });

  it("says nothing about roots before the seed and the first stage, when the drawing has none", async () => {
    const c = ctx({ shift_quest_tree_get: tree({ seed: null, stage: 0, roots: { count: 0, recent: 0 }, gifts: [] }) });
    const b = interaction("button");
    await ACTION_HANDLERS.get("is_tree")!(b.i, c, []);
    const text = viewText(cards(b.sent).at(-1)!.payload);
    expect(text).not.toContain(TREE.closeup.roots(0));
    expect(text).toContain(STAGE_NAMES[0]);

    const seeded = ctx({ shift_quest_tree_get: tree({ stage: 0, roots: { count: 0, recent: 0 }, gifts: [] }) });
    const s = interaction("button");
    await ACTION_HANDLERS.get("is_tree")!(s.i, seeded, []);
    expect(viewText(cards(s.sent).at(-1)!.payload)).toContain(TREE.closeup.roots(0));
    expect(viewText(cards(s.sent).at(-1)!.payload)).toContain(PRE_STAGE);
  });

  it("offers the seed while the team has none, and a plot when there is no project", async () => {
    const c = ctx({ shift_quest_tree_get: tree({ seed: null, gifts: [] }) });
    const b = interaction("button");
    await ACTION_HANDLERS.get("is_tree")!(b.i, c, []);
    expect(customIds(cards(b.sent).at(-1)!.payload)).toContain("sq|tr_seed");
    expect(customIds(cards(b.sent).at(-1)!.payload)).not.toContain("sq|tr_gift");

    const none = ctx({ shift_quest_tree_get: new QuestError("no_project") });
    const e = interaction("button");
    await ACTION_HANDLERS.get("is_tree")!(e.i, none, []);
    expect(customIds(cards(e.sent).at(-1)!.payload)).toContain("sq|is_claim");
  });
});

describe("/island", () => {
  const view = (): IslandView => ({
    project: { id: "p", name: "แอป", route: "software", slot: 4, stage: 2, milestones_done: [1, 2], next_milestone: 3, show_name: false, name_visible: false },
    milestones: [],
    taps_today: 0,
    resting: false,
    season: null,
  });
  const plots = { plots: [{ slot: 4, stage: 2, visitor: false, key: false, helper: false, lantern: false, name: null, mine: true }] };
  const island = (version: number, extra: Answers = {}) =>
    ctx({ shift_quest_schema_version: version, shift_quest_island: view(), shift_quest_island_map: plots, ...extra });

  it("schema 12: no tree buttons, and no tree read", async () => {
    const c = island(12);
    const ids = customIds(renderView(await islandMessage(c)));
    expect(ids).not.toContain("sq|is_tree");
    expect(ids).not.toContain("sq|tr_seed");
    expect(ids).not.toContain("sq|tr_gift");
    expect(called(c, "shift_quest_tree_get")).toEqual([]);
    expect(called(c, "shift_quest_island_styles")).toEqual([]);
  });

  it("schema 13: 🔍 always, 🌰 while the team has no seed, 🎁 while a gift waits", async () => {
    const card = renderView(await islandMessage(island(13, { shift_quest_tree_get: tree({ seed: null, gifts: [{ id: GIFT, options: OPTIONS }] }) })));
    // All three on their own row, within Discord's component limit.
    expect(customIds(card).slice(-3)).toEqual(["sq|tr_seed", "sq|is_tree", "sq|tr_gift"]);
    expect(componentCount(card)).toBeLessThanOrEqual(LIMITS.components);
    const fresh = customIds(renderView(await islandMessage(island(13, { shift_quest_tree_get: tree({ seed: null, gifts: [] }) }))));
    expect(fresh).toEqual(expect.arrayContaining(["sq|is_tree", "sq|tr_seed"]));
    expect(fresh).not.toContain("sq|tr_gift");
    const seeded = customIds(renderView(await islandMessage(island(13, { shift_quest_tree_get: tree() }))));
    expect(seeded).toEqual(expect.arrayContaining(["sq|is_tree", "sq|tr_gift"]));
    expect(seeded).not.toContain("sq|tr_seed");
  });

  it("calls a seeded team's stage 0 plot the seed on the island card", async () => {
    const at0 = (): IslandView => ({ ...view(), project: { ...view().project!, stage: 0, milestones_done: [] } });
    const seeded = ctx({ shift_quest_schema_version: 13, shift_quest_island: at0(), shift_quest_island_map: plots, shift_quest_tree_get: tree({ stage: 0 }) });
    expect(viewText(renderView(await islandMessage(seeded)))).toContain(`${PRE_STAGE} **0**/7`);
    const bare = ctx({ shift_quest_schema_version: 13, shift_quest_island: at0(), shift_quest_island_map: plots, shift_quest_tree_get: tree({ seed: null, stage: 0 }) });
    expect(viewText(renderView(await islandMessage(bare)))).toContain(`${STAGE_NAMES[0]} **0**/7`);
  });

  it("no 🎁 when every waiting gift offers only looks the team owns by now", async () => {
    const owned = [...Object.values(DEFAULT_STYLE), "leaf:mint"];
    const card = renderView(await islandMessage(island(13, { shift_quest_tree_get: tree({ owned, gifts: [{ id: GIFT, options: ["leaf:mint"] }] }) })));
    expect(customIds(card)).toContain("sq|is_tree");
    expect(customIds(card)).not.toContain("sq|tr_gift");
  });

  it("draws the team's own tree in its look", async () => {
    const c = island(13, { shift_quest_tree_get: tree({ equipped: { ...DEFAULT_STYLE, leaf: "leaf:autumn" } }), shift_quest_island_styles: [] });
    const plain = island(13, { shift_quest_tree_get: tree(), shift_quest_island_styles: [] });
    const a = (await islandMessage(c)).files[0].attachment as Buffer;
    const b = (await islandMessage(plain)).files[0].attachment as Buffer;
    expect(a.equals(b)).toBe(false);
  });
});

describe("a quest submit that earns a gift", () => {
  const milestoneView = (): IslandView => ({
    project: { id: "p", name: "แอป", route: "software", slot: 4, stage: 2, milestones_done: [1, 2], next_milestone: 3, show_name: false, name_visible: false },
    milestones: [],
    taps_today: 0,
    resting: false,
    season: null,
  });
  const submitted = { instance_id: INSTANCE, revision: 1, created: true };

  it("milestone: the sent reply, then the gift with its picks", async () => {
    const c = ctx({
      shift_quest_schema_version: 13,
      shift_quest_island: milestoneView(),
      shift_quest_milestone_submit: submitted,
      shift_quest_quest_gift: { gift: { id: GIFT, options: OPTIONS } },
      shift_quest_tree_get: tree(),
    });
    const b = interaction("modal", { proof: "https://example.com", note: "ได้รู้ว่า" });
    await ACTION_HANDLERS.get("is_msgo")!(b.i, c, ["3"]);
    expect(called(c, "shift_quest_quest_gift")).toEqual([["shift_quest_quest_gift", USER, INSTANCE]]);
    const [sent, gift] = cards(b.sent);
    expect(bodyText(sent.payload)).toContain(I.sent);
    expect(customIds(gift.payload)).toEqual([...pickIds, "sq|tr_later"]);
    expect(viewText(gift.payload)).toContain(TREE.gift.questHeading);
    expect(ephemeral(gift.payload)).toBe(true);
  });

  it("milestone: a gift call that throws still leaves the normal sent reply, logged by code only", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const c = ctx({
      shift_quest_schema_version: 13,
      shift_quest_island: milestoneView(),
      shift_quest_milestone_submit: submitted,
      shift_quest_quest_gift: new QuestDbError("shift_quest_quest_gift", "57014"),
    });
    const b = interaction("modal", { proof: "https://example.com", note: "ได้รู้ว่า" });
    await ACTION_HANDLERS.get("is_msgo")!(b.i, c, ["3"]);
    expect(cards(b.sent).map((s) => s.how)).toEqual(["editReply"]);
    expect(bodyText(cards(b.sent)[0].payload)).toContain(I.sent);
    expect(error.mock.calls.flat().join(" ")).toContain("SQLSTATE 57014");
  });

  it("schema 12: no gift call", async () => {
    const c = ctx({ shift_quest_schema_version: 12, shift_quest_island: milestoneView(), shift_quest_milestone_submit: submitted });
    const b = interaction("modal", { proof: "https://example.com", note: "ได้รู้ว่า" });
    await ACTION_HANDLERS.get("is_msgo")!(b.i, c, ["3"]);
    expect(called(c, "shift_quest_quest_gift")).toEqual([]);
    expect(cards(b.sent).map((s) => s.how)).toEqual(["editReply"]);
  });

  it("side quest from the board: the same gift", async () => {
    const c = ctx({
      shift_quest_schema_version: 13,
      shift_quest_side_submit: submitted,
      shift_quest_quest_gift: { gift: { id: GIFT, options: OPTIONS } },
      shift_quest_tree_get: tree(),
    });
    const b = interaction("modal", { proof: "ลองแล้ว", note: "คนกดปุ่มผิดที่" });
    await ACTION_HANDLERS.get("qb_send")!(b.i, c, ["5a1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e01"]);
    expect(called(c, "shift_quest_quest_gift")).toEqual([["shift_quest_quest_gift", USER, INSTANCE]]);
    expect(customIds(cards(b.sent).at(-1)!.payload)).toEqual([...pickIds, "sq|tr_later"]);
  });

  it("a quest sent from its preview: the sent card in place, then the gift as its own private message", async () => {
    const draft = {
      instanceId: INSTANCE,
      version: 3,
      title: "เควสต์",
      hasProject: true,
      evidence: "ทำแล้ว",
      reflection: "ได้รู้ว่า",
      artifact: null,
      part: null,
      teammates: [],
    };
    const key = putDraft(USER, draft);
    const c = ctx({
      shift_quest_schema_version: 13,
      shift_quest_submit: { revision: 1 },
      shift_quest_quest_gift: { gift: { id: GIFT, options: OPTIONS } },
      shift_quest_tree_get: tree(),
    });
    const b = interaction("button");
    await ACTION_HANDLERS.get("sub_go")!(b.i, c, [key, "reviewers"]);
    expect(called(c, "shift_quest_quest_gift")).toEqual([["shift_quest_quest_gift", USER, INSTANCE]]);
    const [sent, gift] = cards(b.sent);
    expect(sent.how).toBe("update");
    expect(gift.how).toBe("followUp");
    expect(ephemeral(gift.payload)).toBe(true);
    expect(customIds(gift.payload)).toEqual([...pickIds, "sq|tr_later"]);
  });
});
