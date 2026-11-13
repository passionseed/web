/**
 * @jest-environment node
 */
import { AttachmentBuilder, MessageFlags, MessageFlagsBitField } from "discord.js";

import { handleInteraction } from "..";
import { QuestError, type QuestApi, type Session } from "../api";
import { T } from "../copy";
import { I, LIVE, QB } from "../island/copy";
import { PANEL_TARGETS, liveView, panelId, type LivePostData } from "../live";
import { TONE_COLORS, renderView } from "../ui";
import { boardFixture } from "../test-helpers/board";
import { accentColor, bodyText, customIds } from "../test-helpers/view";

/**
 * The live island post's panel (handlers/panel.ts). The post is one public
 * message everyone in the live channel shares: a press must answer only the
 * person who pressed, in a new private reply, and never update, defer-update
 * or edit the post itself.
 */

const GUILD = "100000000000000001";
const STUDENT_ROLE = "555";
const USER = "1111111111";
const V2 = MessageFlags.IsComponentsV2;
const PRIVATE = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;

const SAVED_ENV = { ...process.env };
beforeEach(() => {
  delete process.env.SHIFT_ISLAND_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
});
afterEach(() => {
  process.env = { ...SAVED_ENV };
});

function session(over: Partial<Session> = {}, settings: Partial<Session["settings"]> = {}): Session {
  return {
    member_id: "m",
    onboarded: true,
    roles: [],
    current_project_id: "p",
    unread: 0,
    prefs: null,
    ...over,
    settings: {
      student_role_ids: [STUDENT_ROLE],
      awards: true,
      redemption: false,
      sharing: false,
      reminders: false,
      reward_terms: null,
      redemption_terms: null,
      ...settings,
    },
  };
}

const islandView = (over: Record<string, unknown> = {}) => ({
  project: { id: "p", name: "แอปจดการบ้าน", route: "software", slot: 4, stage: 2, milestones_done: [1, 2], next_milestone: 3, show_name: false, name_visible: false },
  milestones: [
    { milestone: 3, template_id: "t3", title: "ขั้น 3", purpose: "p", evidence_criteria: "e", reflection_prompt: "r", done: false, in_flight: null },
  ],
  taps_today: 0,
  resting: false,
  season: null,
  ...over,
});

/** What the database answers for each panel card; anything else is a test failure. */
const ANSWERS: Record<string, unknown> = {
  shift_quest_island: islandView(),
  shift_quest_island_map: { plots: [{ slot: 4, stage: 2, visitor: false, key: false, helper: false, lantern: false, name: null, mine: true, plain: true }] },
  shift_quest_my_quests: [],
  shift_quest_board: boardFixture(),
  shift_quest_checkin: null,
  shift_quest_catalog_list: { live: false, terms: null, balance: 0, items: [], mine: [] },
  shift_quest_help_create: "h",
};

function fakeApi(s: Session, answers: Record<string, unknown> = ANSWERS, order: string[] = []) {
  const call = jest.fn(async (fn: string, ..._args: unknown[]) => {
    order.push(`db:${fn}`);
    if (fn === "shift_quest_session") return s;
    if (!(fn in answers)) throw new Error(`unexpected database call ${fn}`);
    const answer = answers[fn];
    if (answer instanceof Error) throw answer;
    return answer;
  });
  return { call, rows: jest.fn() } as unknown as QuestApi & { call: jest.Mock };
}

/** The live post as a press on it arrives: the bot's public card, no Ephemeral flag. */
function livePost() {
  const view = liveView(
    {
      channel_id: "200000000000000010",
      message_id: "900000000000000001",
      coworking_channel_id: null,
      plots: [],
      goal: null,
      season: null,
      trees: 0,
      approved: 0,
      campfire: { live: false, count: 0 },
    } satisfies LivePostData,
    { nowMs: 0, guildId: GUILD, webUrl: null, picture: false }
  );
  const payload = renderView(view, { ephemeral: false });
  return { id: "900000000000000001", flags: new MessageFlagsBitField(payload.flags), content: "", embeds: [], components: payload.components };
}

type Call = { how: string; payload: { flags?: number; components?: unknown[]; custom_id?: string; files?: unknown[] } };

/** A button press (or a form submit) on the live post, recording every answer the bot gives. */
function press(customId: string, o: { roles?: string[]; modal?: Record<string, string>; order?: string[] } = {}) {
  const calls: Call[] = [];
  const record = (how: string, after?: () => void) => async (payload: Call["payload"]) => {
    calls.push({ how, payload });
    o.order?.push(how);
    after?.();
  };
  const modal = o.modal;
  const i: Record<string, unknown> = {
    id: "222222222222222222",
    guildId: GUILD,
    customId,
    user: { id: USER, globalName: "ฟ้า", username: "fah" },
    member: { roles: o.roles ?? [STUDENT_ROLE], nick: null },
    message: livePost(),
    deferred: false,
    replied: false,
    inGuild: () => true,
    isAutocomplete: () => false,
    isChatInputCommand: () => false,
    isMessageComponent: () => !modal,
    isButton: () => !modal,
    isStringSelectMenu: () => false,
    isModalSubmit: () => Boolean(modal),
    reply: record("reply", () => (i.replied = true)),
    deferReply: record("deferReply", () => (i.deferred = true)),
    editReply: record("editReply"),
    followUp: record("followUp"),
    update: record("update"),
    deferUpdate: record("deferUpdate", () => (i.deferred = true)),
    showModal: async (m: { toJSON: () => Call["payload"] }) => {
      calls.push({ how: "showModal", payload: m.toJSON() });
      o.order?.push("showModal");
    },
    fields: modal && {
      getTextInputValue: (id: string) => modal[id] ?? "",
      getStringSelectValues: (id: string) => (modal[id] ? [modal[id]] : []),
    },
  };
  return { i: i as never, calls };
}

async function run(customId: string, s: Session, o: { roles?: string[]; answers?: Record<string, unknown>; modal?: Record<string, string> } = {}) {
  /** Database calls ("db:fn") and Discord answers, in the order they happened. */
  const order: string[] = [];
  const api = fakeApi(s, o.answers, order);
  const { i, calls } = press(customId, { ...o, order });
  await handleInteraction(api, GUILD, i);
  const db = api.call.mock.calls.map((c: unknown[]) => c[0]).filter((fn: unknown) => fn !== "shift_quest_session");
  return { calls, db, order };
}

/** Nothing the bot did can change the post: no update, no deferred update. */
function expectPostUntouched(calls: Call[]) {
  expect(calls.map((c) => c.how)).not.toContain("update");
  expect(calls.map((c) => c.how)).not.toContain("deferUpdate");
}

/** The card a target opens, and the database calls behind it. */
const OPENS: Record<string, { title: string; db: string[] }> = {
  // The schema version: roots are read only from schema 10, and this fake database does not answer it (no roots).
  me: { title: I.header, db: ["shift_quest_island", "shift_quest_island_map", "shift_quest_schema_version"] },
  quests: { title: QB.title, db: ["shift_quest_board"] },
  checkin: { title: I.tappedTitle, db: ["shift_quest_island", "shift_quest_checkin"] },
  rewards: { title: T.rewardsTitle, db: ["shift_quest_catalog_list"] },
  how: { title: I.btnHow, db: [] },
};

describe("live post panel", () => {
  it("answers every card button with a new private reply, deferred before any database read, and never touches the post", async () => {
    for (const [target, want] of Object.entries(OPENS)) {
      const { calls, db, order } = await run(`sq|lp|${target}`, session());
      expectPostUntouched(calls);
      expect([target, calls.map((c) => c.how)]).toEqual([target, ["deferReply", "editReply"]]);
      // Only the session (who is asking) is read before the reply is acknowledged.
      expect([target, order]).toEqual([target, ["db:shift_quest_session", "deferReply", ...want.db.map((fn) => `db:${fn}`), "editReply"]]);
      // A new private message first; the card then fills that reply (an edit cannot change who sees it).
      expect(calls[0].payload.flags).toBe(MessageFlags.Ephemeral);
      expect(calls[1].payload.flags).toBe(V2);
      expect([target, bodyText(calls[1].payload).split("\n").find((l) => l.startsWith("### "))]).toEqual([target, `### ${want.title}`]);
      expect([target, db]).toEqual([target, want.db]);
    }
  });

  it("opens the island card with its picture and the island's own buttons, which keep working as before", async () => {
    const { calls } = await run("sq|lp|me", session());
    const card = calls[1].payload;
    expect(card.files).toHaveLength(1);
    expect((card.files![0] as AttachmentBuilder).name).toBe("shift-island.png");
    expect(customIds(card)).toEqual(expect.arrayContaining(["sq|is_tap", "sq|is_ms", "sq|is_work", "sq|is_stuck", "sq|inbox"]));
    expect(customIds(card).some((id) => id.startsWith("sq|lp|"))).toBe(false);
  });

  it("checks in once and offers the note, as 🔨 on the island card does", async () => {
    const api = fakeApi(session());
    const { i, calls } = press("sq|lp|checkin");
    await handleInteraction(api, GUILD, i);
    expect(api.call.mock.calls).toContainEqual(["shift_quest_checkin", USER, null]);
    expect(customIds(calls[1].payload)).toEqual(["sq|is_note", "sq|is_view"]);
  });

  it("opens the help form as the first answer, and its submit is a new private reply too", async () => {
    const { calls, db, order } = await run("sq|lp|help", session());
    expect(calls.map((c) => c.how)).toEqual(["showModal"]);
    expect(order).toEqual(["db:shift_quest_session", "showModal"]);
    expect(calls[0].payload.custom_id).toBe("sq|help_new|");
    expect(db).toEqual([]);

    const sent = await run("sq|help_new|", session(), { modal: { summary: "ติดตรงหน้าเข้าสู่ระบบ", visibility: "mentors" } });
    expectPostUntouched(sent.calls);
    expect(sent.calls.map((c) => c.how)).toEqual(["reply"]);
    expect(sent.calls[0].payload.flags).toBe(PRIVATE);
    expect(bodyText(sent.calls[0].payload).startsWith(`### ${T.helpSentTitle}`)).toBe(true);
    expect(sent.db).toEqual(["shift_quest_help_create"]);
  });

  it("offers a plot, not an error, when someone without one checks in", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const { calls, db, order } = await run("sq|lp|checkin", session({ current_project_id: null }), {
        answers: { ...ANSWERS, shift_quest_island: islandView({ project: null }) },
      });
      expectPostUntouched(calls);
      expect(order).toEqual(["db:shift_quest_session", "deferReply", "db:shift_quest_island", "editReply"]);
      // The check-in would only refuse with no_project: it is never called.
      expect(db).toEqual(["shift_quest_island"]);
      const card = calls[1].payload;
      expect(bodyText(card)).toBe(`### ${I.header}\n${I.noPlot}`);
      expect(accentColor(card)).toBe(TONE_COLORS.island);
      expect(customIds(card)).toEqual(["sq|is_claim", "sq|is_view"]);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("offers 🌱 on how to play only to someone without a project", async () => {
    const withTree = await run("sq|lp|how", session());
    expect(customIds(withTree.calls[1].payload)).toEqual(["sq|is_view"]);
    const noTree = await run("sq|lp|how", session({ current_project_id: null }));
    expect(customIds(noTree.calls[1].payload)).toEqual(["sq|is_claim", "sq|is_view"]);
    for (const { calls, db } of [withTree, noTree]) {
      expectPostUntouched(calls);
      expect(db).toEqual([]);
    }
  });

  it("names the quest button after the card it opens, which keeps 📋 งานที่ส่งไว้ one tap away", async () => {
    expect(LIVE.panel.quests).toBe(I.btnBoard);
    const { calls } = await run("sq|lp|quests", session());
    expect(bodyText(calls[1].payload).startsWith(`### ${LIVE.panel.quests}\n`)).toBe(true);
    expect(customIds(calls[1].payload)).toEqual(expect.arrayContaining(["sq|is_work", "sq|is_ms", "sq|qb_side"]));
  });

  it("shows a failure in the private reply, never on the post, with a retry of the same panel button", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const { calls } = await run("sq|lp|checkin", session(), {
        answers: { ...ANSWERS, shift_quest_checkin: new QuestError("busy") },
      });
      expectPostUntouched(calls);
      expect(calls.map((c) => c.how)).toEqual(["deferReply", "editReply"]);
      expect(accentColor(calls[1].payload)).toBe(TONE_COLORS.error);
      expect(customIds(calls[1].payload)).toEqual(["sq|lp|checkin", "sq|is_view"]);
    } finally {
      warn.mockRestore();
    }
  });

  it("gives someone outside the pilot the slash commands' own polite 'not yet', privately, before any database read", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const cases: [Partial<Session["settings"]>, string][] = [
        [{}, T.notEligible],
        [{ student_role_ids: [] }, T.pilotClosed],
      ];
      for (const [settings, words] of cases) {
        for (const target of PANEL_TARGETS) {
          const { calls, db } = await run(panelId(target), session({}, settings), { roles: ["999"] });
          expectPostUntouched(calls);
          expect([target, calls.map((c) => c.how)]).toEqual([target, ["reply"]]);
          expect(calls[0].payload.flags).toBe(PRIVATE);
          expect(bodyText(calls[0].payload)).toBe(`### ${T.notYetTitle}\n${words}`);
          expect(accentColor(calls[0].payload)).toBe(TONE_COLORS.warn);
          expect(db).toEqual([]);
        }
      }
    } finally {
      warn.mockRestore();
    }
  });

  it("gives someone in the pilot who has not started the story /start shows, from its first page", async () => {
    for (const target of PANEL_TARGETS) {
      const { calls, db } = await run(panelId(target), session({ onboarded: false, member_id: null, current_project_id: null }));
      expectPostUntouched(calls);
      expect([target, calls.map((c) => c.how)]).toEqual([target, ["reply"]]);
      expect(calls[0].payload.flags).toBe(PRIVATE);
      expect(bodyText(calls[0].payload).startsWith(`### ${T.storyPages[0].title}\n`)).toBe(true);
      expect(customIds(calls[0].payload)).toEqual(["sq|story|1", "sq|story|4"]);
      expect(db).toEqual([]);
    }
  });

  it("lets staff in like the existing cards do, without a student role", async () => {
    const { calls } = await run("sq|lp|how", session({ roles: ["reviewer"] }), { roles: [] });
    expectPostUntouched(calls);
    expect(calls.map((c) => c.how)).toEqual(["deferReply", "editReply"]);
    expect(bodyText(calls[1].payload).startsWith(`### ${I.btnHow}\n`)).toBe(true);
  });

  it("stays silent on a target it does not know, and touches nothing", async () => {
    for (const id of ["sq|lp|nope", "sq|lp|", "sq|lp|constructor", "sq|lp"]) {
      const { calls, db } = await run(id, session());
      expect([id, calls]).toEqual([id, []]);
      expect(db).toEqual([]);
    }
  });

  it("answers every button the live post carries", async () => {
    const ids = customIds({ components: livePost().components });
    expect(ids).toEqual(PANEL_TARGETS.map(panelId));
    for (const id of ids) {
      const { calls } = await run(id, session());
      expectPostUntouched(calls);
      expect([id, calls.length > 0]).toEqual([id, true]);
    }
  });
});
