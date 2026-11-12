/**
 * @jest-environment node
 */
import { MessageFlags } from "discord.js";

import { ACTION_HANDLERS } from "..";
import type { QuestApi, Session } from "../api";
import type { Ctx } from "../context";
import { T } from "../copy";
import { islandMessage, seasonCard, type IslandView } from "../handlers/island";
import { I, PENDING_SLOT, WIP_CORNER, WIP_CORNER_SHORT, type SeasonView } from "../island/copy";
import { LIMITS, NO_MENTIONS, TONE_COLORS, renderView } from "../ui";
import { ISLAND_LINK_LABEL } from "../weblink";
import { accentColor, bodyText, cardsOf, componentCount, customIds, textLength, viewText } from "../test-helpers/view";

/**
 * Every island screen is one Components V2 card: a heading, the few facts that
 * matter now, and its buttons inside the card. Same database calls and custom
 * IDs as before the cards.
 */

const V2 = MessageFlags.IsComponentsV2;
const PRIVATE = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;

// The website link button reads these when a card is drawn: every test starts
// without them (the cards exactly as before) and the environment is restored.
const SAVED_ENV = { ...process.env };
beforeEach(() => {
  delete process.env.SHIFT_ISLAND_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
});
afterEach(() => {
  process.env = { ...SAVED_ENV };
});

function session(): Session {
  return {
    member_id: "m",
    onboarded: true,
    roles: [],
    current_project_id: null,
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

function ctx(call: (fn: string, ...args: unknown[]) => unknown): Ctx {
  const api = { call: jest.fn(async (fn: string, ...args: unknown[]) => call(fn, ...args)), rows: jest.fn() };
  return { api: api as unknown as QuestApi, userId: "1111111111", name: "x", memberRoleIds: ["555"], session: session() };
}

type Payload = { flags?: number; allowedMentions?: unknown; components?: unknown[]; files?: unknown[] };

/** A Discord interaction that records how each card was sent (reply, update, editReply, followUp). */
function interaction(kind: "button" | "modal", over: Record<string, unknown> = {}) {
  const sent: { how: string; payload: Payload }[] = [];
  const modals: unknown[] = [];
  const record = (how: string) => async (payload: Payload) => {
    if (how === "reply") i.replied = true;
    sent.push({ how, payload });
  };
  const i: Record<string, unknown> = {
    id: "222222222222222222",
    deferred: false,
    replied: false,
    customId: "sq|x",
    message: { content: "", embeds: [] },
    isChatInputCommand: () => false,
    isMessageComponent: () => kind === "button",
    isButton: () => kind === "button",
    isStringSelectMenu: () => false,
    isModalSubmit: () => kind === "modal",
    reply: record("reply"),
    update: record("update"),
    editReply: record("editReply"),
    followUp: record("followUp"),
    deferReply: async () => {
      i.deferred = true;
    },
    deferUpdate: async () => {
      i.deferred = true;
    },
    showModal: async (m: { toJSON: () => unknown }) => modals.push(m.toJSON()),
    ...over,
  };
  return { i: i as never, sent, modals };
}

const fields = (values: Record<string, string>) => ({
  getTextInputValue: (id: string) => {
    if (!(id in values)) throw new Error("no field");
    return values[id];
  },
});

const milestone = (n: number, done = false) => ({
  milestone: n,
  template_id: `t${n}`,
  title: `ขั้น ${n}`,
  purpose: `เป้าของขั้น ${n}`,
  evidence_criteria: "ลิงก์หรือคำอธิบายสิ่งที่ทำ",
  reflection_prompt: "ตอนนี้ทำอะไรได้",
  done,
  in_flight: null as null | { instance_id: string; state: string; version: number; mine?: boolean; owner?: string | null },
});

const season = (over: Partial<SeasonView> = {}): SeasonView => ({
  name: "Season 1",
  demo_day: "2027-05-15",
  days_to_demo: 30, // today in Bangkok: 2027-04-15
  table_bar: 2,
  stage_bar: 3,
  stage_at_cutoff: 1,
  season_milestones: [1],
  qualifies: null,
  goal: { milestone: 3, target: 30, count: 12, deadline: "2027-05-01", unlock: "ลานกลางเปิดไฟ", reached: false },
  unlocks: [
    { id: "got", label: "เสื้อ", milestone_count: 1, deadline: "2027-03-01", earned: true },
    { id: "next", label: "สติกเกอร์", milestone_count: 2, deadline: "2027-05-01", earned: false },
  ],
  ...over,
});

const islandView = (over: Partial<IslandView> = {}): IslandView => ({
  project: { id: "p", name: "แอปจดการบ้าน", route: "software", slot: 4, stage: 2, milestones_done: [1, 2], next_milestone: 3, show_name: false, name_visible: false },
  milestones: [milestone(1, true), milestone(2, true), milestone(3)],
  taps_today: 0,
  resting: false,
  season: null,
  ...over,
});

const plot = (slot: number, name: string | null = null) => ({ slot, stage: 2, visitor: false, key: false, helper: false, lantern: false, name, mine: slot === 4 });

/** Fits Discord: one card, Components V2, nobody pinged, within the component and text limits. */
function expectCard(payload: Payload, flags = PRIVATE) {
  expect(payload.flags).toBe(flags);
  expect(payload.allowedMentions).toEqual(NO_MENTIONS);
  expect(payload.components).toHaveLength(1);
  expect(componentCount(payload)).toBeLessThanOrEqual(LIMITS.components);
  expect(textLength(payload)).toBeLessThanOrEqual(LIMITS.text);
}

describe("island card", () => {
  it("shows the season headline and where you stand, with unlocks and the goal behind ℹ️", async () => {
    const c = ctx((fn) => (fn === "shift_quest_island" ? islandView({ season: season() }) : { plots: [plot(4)] }));
    const payload = renderView(await islandMessage(c));
    expectCard(payload);
    const text = viewText(payload);
    expect(text).toContain("🎪 **Season 1**: Demo Day");
    expect(text).toContain("อีก 30 วัน");
    expect(text).toContain('อีก 1 ขั้น ได้โต๊ะโชว์งานใน Demo Day (ต้องมีขั้น "ขั้น 2" ด้วย)');
    expect(bodyText(payload)).toContain(`-# ${WIP_CORNER_SHORT}`);
    expect(text).not.toContain(WIP_CORNER);
    expect(text).toContain(I.btnSeason);
    expect(text).not.toContain("สติกเกอร์");
    expect(text).not.toContain("12/30");
    expect(customIds(payload)).toEqual([
      "sq|is_season",
      "sq|is_tap",
      "sq|is_ms",
      "sq|is_work",
      "sq|is_stuck",
      "sq|is_rest|on",
      "sq|is_name|p|on",
      "sq|inbox",
    ]);
  });

  it("stays inside Discord's limits with every line it can show, without trimming", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const busy = Array.from({ length: 7 }, (_, k) => ({
        ...milestone(k + 1),
        in_flight: { instance_id: `i${k}`, state: "submitted", version: 1, mine: k % 2 === 0, owner: "ฟ้า" },
      }));
      const view = islandView({
        milestones: busy,
        taps_today: 3,
        resting: true,
        season: season({ qualifies: "table", stage_at_cutoff: 2, season_milestones: [1, 2], qualifies_with_pending: "stage" }),
      });
      const plots = Array.from({ length: 60 }, (_, k) => plot(k + 1, `ชื่อโปรเจกต์ยาวมาก ${"ก".repeat(40)}`));
      const c = ctx((fn) => (fn === "shift_quest_island" ? view : { plots }));
      const payload = renderView(await islandMessage(c));
      expectCard(payload);
      expect(viewText(payload)).toContain(PENDING_SLOT.stage);
      expect(viewText(payload)).toContain(I.more(54));
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("offers a plot without a project, as a card with the claim and how buttons", async () => {
    const c = ctx((fn) => (fn === "shift_quest_island" ? islandView({ project: null }) : { plots: [] }));
    const payload = renderView(await islandMessage(c));
    expectCard(payload);
    expect(bodyText(payload)).toContain(I.noPlot);
    expect(customIds(payload)).toEqual(["sq|is_claim", "sq|is_how", "sq|inbox"]);
    expect(accentColor(payload)).toBe(TONE_COLORS.island);
  });

  it("reaches the inbox from the island, with the unread count on the button when there is news", async () => {
    const calls = (fn: string) => (fn === "shift_quest_island" ? islandView() : { plots: [] });
    const quiet = renderView(await islandMessage(ctx(calls)));
    expect(customIds(quiet)).toContain("sq|inbox");
    expect(viewText(quiet)).toContain(T.btnInbox);
    expect(viewText(quiet)).not.toContain(`${T.btnInbox} (`);

    const c = ctx(calls);
    c.session.unread = 3;
    const news = renderView(await islandMessage(c));
    expect(viewText(news)).toContain(`${T.btnInbox} (3)`);
    const noPlot = ctx((fn) => (fn === "shift_quest_island" ? islandView({ project: null }) : { plots: [] }));
    noPlot.session.unread = 2;
    expect(viewText(renderView(await islandMessage(noPlot)))).toContain(`${T.btnInbox} (2)`);

    // The button opens the existing inbox action.
    const { i, sent } = interaction("button");
    const inbox = ctx((fn) => (fn === "shift_quest_inbox_list" ? { items: [], recognitions: [], contributions: [], invites: [] } : []));
    await ACTION_HANDLERS.get("inbox")!(i, inbox, []);
    expect(sent[0].how).toBe("update");
    expect(viewText(sent[0].payload)).toContain(T.inboxEmpty);
  });
});

type ButtonJson = { type?: number; style?: number; url?: string; label?: string; custom_id?: string; components?: ButtonJson[] };

/** Each action row, row by row: a custom ID, or "link:<url>" for a link button. */
function rowsOf(payload: Payload): string[][] {
  const card = cardsOf(payload)[0] as unknown as ButtonJson;
  return (card.components ?? [])
    .filter((c) => c.type === 1)
    .map((r) => (r.components ?? []).map((b) => b.custom_id ?? `link:${b.url}`));
}

/** The link buttons on a card. */
function linksOf(payload: Payload): ButtonJson[] {
  const card = cardsOf(payload)[0] as unknown as ButtonJson;
  return (card.components ?? []).filter((c) => c.type === 1).flatMap((r) => (r.components ?? []).filter((b) => b.style === 5));
}

describe("island card link to the website", () => {
  const SITE = "https://www.passionseed.org";
  const ISLAND_URL = `${SITE}/shift/island`;

  it("is last on the second row of a card with a project, with no custom ID", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE;
    const c = ctx((fn) => (fn === "shift_quest_island" ? islandView({ season: season() }) : { plots: [plot(4)] }));
    const payload = renderView(await islandMessage(c));
    expectCard(payload);
    expect(rowsOf(payload)).toEqual([
      ["sq|is_tap", "sq|is_ms", "sq|is_work"],
      ["sq|is_stuck", "sq|is_rest|on", "sq|is_name|p|on", "sq|inbox", `link:${ISLAND_URL}`],
    ]);
    expect(linksOf(payload)).toEqual([expect.objectContaining({ type: 2, style: 5, url: ISLAND_URL, label: ISLAND_LINK_LABEL })]);
    // Custom IDs are unchanged: the link is not a bot action.
    expect(customIds(payload)).toEqual([
      "sq|is_season",
      "sq|is_tap",
      "sq|is_ms",
      "sq|is_work",
      "sq|is_stuck",
      "sq|is_rest|on",
      "sq|is_name|p|on",
      "sq|inbox",
    ]);
  });

  it("joins the claim row when there is no project, and SHIFT_ISLAND_URL wins", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE;
    process.env.SHIFT_ISLAND_URL = "https://island.example.org/shift/island";
    const c = ctx((fn) => (fn === "shift_quest_island" ? islandView({ project: null }) : { plots: [] }));
    const payload = renderView(await islandMessage(c));
    expectCard(payload);
    expect(rowsOf(payload)).toEqual([["sq|is_claim", "sq|is_how", "sq|inbox", "link:https://island.example.org/shift/island"]]);
  });

  it("keeps the busiest card inside Discord's limits without trimming", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE;
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const busy = Array.from({ length: 7 }, (_, k) => ({
        ...milestone(k + 1),
        in_flight: { instance_id: `i${k}`, state: "submitted", version: 1, mine: k % 2 === 0, owner: "ฟ้า" },
      }));
      const view = islandView({
        milestones: busy,
        taps_today: 3,
        resting: true,
        season: season({ qualifies: "table", stage_at_cutoff: 2, season_milestones: [1, 2], qualifies_with_pending: "stage" }),
      });
      const plots = Array.from({ length: 60 }, (_, k) => plot(k + 1, `ชื่อโปรเจกต์ยาวมาก ${"ก".repeat(40)}`));
      const c = ctx((fn) => (fn === "shift_quest_island" ? view : { plots }));
      c.session.unread = 12;
      const payload = renderView(await islandMessage(c));
      expectCard(payload);
      expect(linksOf(payload)).toHaveLength(1);
      expect(rowsOf(payload).every((row) => row.length <= 5)).toBe(true);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("is left off when the address is refused, and never added to the season or how cards", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://example.com";
    const c = ctx((fn) => (fn === "shift_quest_island" ? islandView() : { plots: [] }));
    const refused = renderView(await islandMessage(c));
    expect(linksOf(refused)).toEqual([]);
    expect(viewText(refused)).not.toContain(ISLAND_LINK_LABEL);

    process.env.NEXT_PUBLIC_SITE_URL = SITE;
    expect(linksOf(renderView(seasonCard(islandView({ season: season() }))))).toEqual([]);
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("is_how")!(i, ctx(() => null), []);
    expect(linksOf(sent[0].payload)).toEqual([]);
  });

  it("is absent without either address: the rows are exactly as before", async () => {
    const c = ctx((fn) => (fn === "shift_quest_island" ? islandView() : { plots: [] }));
    const payload = renderView(await islandMessage(c));
    expect(rowsOf(payload)).toEqual([
      ["sq|is_tap", "sq|is_ms", "sq|is_work"],
      ["sq|is_stuck", "sq|is_rest|on", "sq|is_name|p|on", "sq|inbox"],
    ]);
    expect(viewText(payload)).not.toContain(ISLAND_LINK_LABEL);
  });
});

describe("island screens", () => {
  it("season details replace the island card: unlocks, goal, the open corner and no ranking", async () => {
    const c = ctx(() => islandView({ season: season() }));
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("is_season")!(i, c, []);
    expect((c.api.call as jest.Mock).mock.calls).toEqual([["shift_quest_island", "1111111111"]]);
    expect(sent).toHaveLength(1);
    expect(sent[0].how).toBe("update");
    const payload = sent[0].payload;
    expectCard(payload, V2);
    const body = bodyText(payload);
    expect(body.startsWith("### 🎪 Season 1\nDemo Day")).toBe(true);
    expect(body).toContain("อีก 30 วัน");
    expect(body).toContain(WIP_CORNER);
    expect(body).toContain("🎁 ปลดล็อกแล้ว: เสื้อ");
    expect(body).toContain("🎁 ครบ 2 ขั้นก่อน");
    expect(body).toContain('🎯 ทั้งเกาะ: 12/30 ต้นผ่านขั้น "ขั้น 3"');
    expect(body).toContain(`-# ${I.seasonFine}`);
    expect(customIds(payload)).toEqual(["sq|is_ms", "sq|is_view"]);
    expect(accentColor(payload)).toBe(TONE_COLORS.season);
  });

  it("season details say so when no season is open, and without a project offer only the way back", () => {
    const none = renderView(seasonCard(islandView()));
    expect(bodyText(none)).toBe(I.noSeason);
    expect(customIds(none)).toEqual(["sq|is_view"]);
    const noPlot = renderView(seasonCard(islandView({ project: null, season: season() })));
    expect(customIds(noPlot)).toEqual(["sq|is_view"]);
  });

  it("how the island works replaces the card, with the rules first and the fine print small", async () => {
    const c = ctx(() => null);
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("is_how")!(i, c, []);
    expect(sent[0].how).toBe("update");
    expectCard(sent[0].payload, V2);
    const body = bodyText(sent[0].payload);
    expect(body.startsWith(`### ${I.btnHow}\n- **`)).toBe(true);
    expect(body).toContain("-# ไม่มีการจัดอันดับ");
    expect(body).toContain("-# เริ่มได้สองทาง");
    expect(customIds(sent[0].payload)).toEqual(["sq|is_claim", "sq|is_view"]);
    expect((c.api.call as jest.Mock).mock.calls).toEqual([]);
  });

  it("how the island works never offers 🌱 to someone who already has a project", async () => {
    const c = ctx(() => null);
    c.session.current_project_id = "p";
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("is_how")!(i, c, []);
    expect(bodyText(sent[0].payload).startsWith(`### ${I.btnHow}\n`)).toBe(true);
    expect(customIds(sent[0].payload)).toEqual(["sq|is_view"]);
    expect((c.api.call as jest.Mock).mock.calls).toEqual([]);
  });

  it("a tap without a plot offers one, as 🌟 does, and never asks the database to check in", async () => {
    const c = ctx((fn) => (fn === "shift_quest_island" ? islandView({ project: null }) : null));
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("is_tap")!(i, c, []);
    expect((c.api.call as jest.Mock).mock.calls).toEqual([["shift_quest_island", "1111111111"]]);
    expect(sent).toHaveLength(1);
    expectCard(sent[0].payload);
    expect(bodyText(sent[0].payload)).toBe(`### ${I.header}\n${I.noPlot}`);
    expect(customIds(sent[0].payload)).toEqual(["sq|is_claim", "sq|is_view"]);
    expect(accentColor(sent[0].payload)).toBe(TONE_COLORS.island);
  });

  it("a tap is a small toast: first today, or already noted, with the note and back buttons", async () => {
    for (const [taps, title, words, tone] of [
      [0, I.tappedTitle, I.tapped, TONE_COLORS.success],
      [1, I.tapAgainTitle, I.tapAgain, TONE_COLORS.island],
    ] as const) {
      const c = ctx((fn) => (fn === "shift_quest_island" ? islandView({ taps_today: taps }) : null));
      const { i, sent } = interaction("button");
      await ACTION_HANDLERS.get("is_tap")!(i, c, []);
      expect((c.api.call as jest.Mock).mock.calls).toEqual([
        ["shift_quest_island", "1111111111"],
        ["shift_quest_checkin", "1111111111", null],
      ]);
      expect(sent[0].how).toBe("reply");
      expectCard(sent[0].payload);
      expect(bodyText(sent[0].payload)).toBe(`### ${title}\n${words}`);
      expect(customIds(sent[0].payload)).toEqual(["sq|is_note", "sq|is_view"]);
      expect(accentColor(sent[0].payload)).toBe(tone);
    }
  });

  it("a saved note says it is private and leads back to the island", async () => {
    const c = ctx(() => null);
    const { i, sent } = interaction("modal", { fields: fields({ note: "ทำหน้าแรกเสร็จ" }) });
    await ACTION_HANDLERS.get("is_note")!(i, c, []);
    expect((c.api.call as jest.Mock).mock.calls).toEqual([["shift_quest_checkin", "1111111111", "ทำหน้าแรกเสร็จ"]]);
    expectCard(sent[0].payload);
    expect(bodyText(sent[0].payload)).toBe(`### ${I.noteSavedTitle}\n-# ${I.noteSaved}`);
    expect(customIds(sent[0].payload)).toEqual(["sq|is_view"]);
  });

  it("the milestone picker lists one short line per milestone; what each asks for is in the menu", async () => {
    const mine = { ...milestone(4), in_flight: { instance_id: "i", state: "submitted", version: 1, mine: true } };
    const c = ctx(() => islandView({ milestones: [milestone(1, true), milestone(2), milestone(3), mine] }));
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("is_ms")!(i, c, []);
    const payload = sent[0].payload;
    expectCard(payload);
    expect(bodyText(payload)).toBe(
      [`### 🌟 ${I.pickMilestone}`, "✅ 1 · ขั้น 1", "▫️ 2 · ขั้น 2", "▫️ 3 · ขั้น 3", "⏳ 4 · ขั้น 4", `-# ${I.msLegend}`].join("\n")
    );
    expect(customIds(payload)).toEqual(["sq|is_mspick", "sq|is_view"]);
    const options = JSON.stringify(payload.components!.map((x) => (x as { toJSON: () => unknown }).toJSON()));
    expect(options).toContain("เป้าของขั้น 2");
    expect(options).toContain("รอรีวิว · เป้าของขั้น 4");
    expect(options).toContain(I.doneRepeat);
  });

  it("the milestone picker without a project offers a plot", async () => {
    const c = ctx(() => islandView({ project: null }));
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("is_ms")!(i, c, []);
    expectCard(sent[0].payload);
    expect(bodyText(sent[0].payload)).toBe(`### ${I.header}\n${I.noPlot}`);
    expect(customIds(sent[0].payload)).toEqual(["sq|is_claim", "sq|is_view"]);
  });

  it("waking up says how many pieces of work reopened, and nothing when none did", async () => {
    for (const [resumed, body] of [
      [2, `### ${I.wokeTitle}\n${I.woke(2)}`],
      [0, `### ${I.wokeTitle}`],
    ] as const) {
      const c = ctx(() => ({ paused: 0, resumed }));
      const { i, sent } = interaction("button");
      await ACTION_HANDLERS.get("is_rest")!(i, c, ["off"]);
      expect((c.api.call as jest.Mock).mock.calls).toEqual([["shift_quest_rest", "1111111111", false]]);
      expectCard(sent[0].payload);
      expect(bodyText(sent[0].payload)).toBe(body);
      expect(customIds(sent[0].payload)).toEqual(["sq|is_view"]);
    }
  });

  it("the name sign: shown, waiting for every teammate, or hidden", async () => {
    for (const [state, visible, body] of [
      ["on", true, `### ${I.nameShown}`],
      ["on", false, `### ${I.nameWaitingTitle}\n${I.nameWaiting}`],
      ["off", false, `### ${I.nameHiddenTitle}\n${I.nameHidden}`],
    ] as const) {
      const c = ctx(() => ({ project_name_visible: visible }));
      const { i, sent } = interaction("button");
      await ACTION_HANDLERS.get("is_name")!(i, c, ["p", state]);
      expect((c.api.call as jest.Mock).mock.calls).toEqual([["shift_quest_island_optin", "1111111111", "p", state === "on"]]);
      expectCard(sent[0].payload);
      expect(bodyText(sent[0].payload)).toBe(body);
      expect(customIds(sent[0].payload)).toEqual(["sq|is_view"]);
    }
  });

  it("open work lists the first five, escapes student titles, and keeps every one in the menu", async () => {
    const quests = Array.from({ length: 7 }, (_, k) => ({
      id: `q${k}`,
      title: k === 0 ? "**ตัวหนา** @everyone" : `งาน ${k}`,
      state: k === 1 ? "clarification" : "submitted",
      latest_review: k === 1 ? { feedback: "ขอลิงก์" } : null,
    }));
    const c = ctx(() => quests);
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("is_work")!(i, c, []);
    expect((c.api.call as jest.Mock).mock.calls).toEqual([["shift_quest_my_quests", "1111111111", false]]);
    const payload = sent[0].payload;
    expectCard(payload);
    const body = bodyText(payload);
    expect(body.startsWith(`### ${I.workTitle}\n- **\\*\\*ตัวหนา\\*\\*`)).toBe(true);
    expect(body).toContain("- **งาน 1** · ");
    expect(body).toContain(" 💬");
    expect(body).toContain("- **งาน 4**");
    expect(body).not.toContain("งาน 5");
    expect(body).toContain(`-# ${I.more(2)}`);
    expect(customIds(payload)).toEqual(["sq|q", "sq|is_view"]);
    const menu = JSON.stringify(payload.components!.map((x) => (x as { toJSON: () => unknown }).toJSON()));
    expect(menu).toContain('"value":"q6"');
  });

  it("no open work offers the milestone button instead of naming it", async () => {
    const c = ctx(() => []);
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("is_work")!(i, c, []);
    expectCard(sent[0].payload);
    expect(bodyText(sent[0].payload)).toBe(`### ${I.workTitle}\n${I.workEmpty}`);
    expect(customIds(sent[0].payload)).toEqual(["sq|is_ms", "sq|is_view"]);
  });
});

describe("island words", () => {
  it("keep the house rules: no em dashes, no น้องๆ, short titles", () => {
    for (const [key, value] of Object.entries(I)) {
      const text = typeof value === "function" ? (value as (...a: string[]) => string)("2", "2", "x") : value;
      expect([key, /—|น้องๆ/.test(text)]).toEqual([key, false]);
      if (key.endsWith("Title")) expect([key, text.length <= 60, text.includes("**")]).toEqual([key, true, false]);
    }
  });
});
