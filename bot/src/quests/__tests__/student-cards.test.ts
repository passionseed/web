/**
 * @jest-environment node
 */
import { MessageFlags } from "discord.js";

import { ACTION_HANDLERS, COMMAND_HANDLERS } from "..";
import type { QuestApi, Session } from "../api";
import type { Ctx } from "../context";
import { DAY_NAMES, T } from "../copy";
import { I } from "../island/copy";
import { LIMITS, NO_MENTIONS, TONE_COLORS } from "../ui";
import { MORNING_GIF } from "../island/morning";
import { STORY_PAGES, storyPage, storyPictureName } from "../story";
import { ISLAND_LINK_LABEL } from "../weblink";
import { accentColor, bodyText, cardsOf, componentCount, customIds, mediaUrls, textLength, viewText } from "../test-helpers/view";

/**
 * The student screens (/start, /inbox, /coins, /rewards, /settings, /data)
 * are compact Components V2 cards: a heading, the few facts that matter now,
 * fine print small or behind ℹ️, and the buttons inside the card. Same
 * database calls, custom IDs and gates as before the cards.
 */

const PRIVATE = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;
const V2 = MessageFlags.IsComponentsV2;
const ID = (n: number) => `3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e5${n}`;

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

function session(over: Partial<Session> = {}, settings: Partial<Session["settings"]> = {}): Session {
  return {
    member_id: "m",
    onboarded: true,
    roles: [],
    current_project_id: null,
    unread: 0,
    prefs: null,
    ...over,
    settings: {
      student_role_ids: ["555"],
      awards: true,
      redemption: false,
      sharing: false,
      reminders: false,
      reward_terms: null,
      redemption_terms: null,
      squads: true,
      ...settings,
    },
  };
}

function ctx(call: (fn: string, ...args: unknown[]) => unknown = () => null, s: Session = session()): Ctx {
  const api = { call: jest.fn(async (fn: string, ...args: unknown[]) => call(fn, ...args)), rows: jest.fn() };
  return { api: api as unknown as QuestApi, userId: "1111111111", name: "x", memberRoleIds: ["555"], session: s };
}

const calls = (c: Ctx) => (c.api.call as jest.Mock).mock.calls;

type Payload = { flags?: number; allowedMentions?: unknown; components?: unknown[]; files?: unknown[] };

/** A Discord interaction that records how each card was sent. */
function interaction(kind: "command" | "button" | "select" | "modal", over: Record<string, unknown> = {}) {
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
    commandName: "x",
    options: { getSubcommand: () => null },
    message: { content: "", embeds: [] },
    isChatInputCommand: () => kind === "command",
    isMessageComponent: () => kind === "button" || kind === "select",
    isButton: () => kind === "button",
    isStringSelectMenu: () => kind === "select",
    isModalSubmit: () => kind === "modal",
    reply: record("reply"),
    update: record("update"),
    editReply: record("editReply"),
    followUp: record("followUp"),
    showModal: async (m: { toJSON: () => unknown }) => modals.push(m.toJSON()),
    ...over,
  };
  return { i: i as never, sent, modals };
}

/** Every card fits Discord: one container, at most 40 components and 4000 characters, nobody pinged. */
function expectCard(p: Payload, flags = PRIVATE): void {
  expect(p.flags).toBe(flags);
  expect(p.allowedMentions).toEqual(NO_MENTIONS);
  expect(cardsOf(p)).toHaveLength(1);
  expect(componentCount(p)).toBeLessThanOrEqual(LIMITS.components);
  expect(textLength(p)).toBeLessThanOrEqual(LIMITS.text);
}

type Json = {
  type: number;
  style?: number;
  disabled?: boolean;
  custom_id?: string;
  url?: string;
  label?: string;
  components?: Json[];
  options?: { description?: string }[];
};

/** The custom IDs of each action row, row by row. */
function rowsOf(p: Payload): (string | undefined)[][] {
  const card = cardsOf(p)[0] as unknown as Json;
  return (card.components ?? []).filter((c) => c.type === 1).map((r) => (r.components ?? []).map((b) => b.custom_id));
}

function buttonOf(p: Payload, id: string): Json {
  const card = cardsOf(p)[0] as unknown as Json;
  for (const row of (card.components ?? []).filter((c) => c.type === 1)) {
    for (const b of row.components ?? []) if (b.custom_id === id) return b;
  }
  throw new Error(`no ${id}`);
}

describe("/start", () => {
  it("opens the island's story on its first page: a moving picture, a few lines, ▶ as the main button", async () => {
    const c = ctx(() => null, session({ onboarded: false }));
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("start")!(i, c);
    const p = sent[0].payload;
    expectCard(p);
    expect(sent[0].how).toBe("reply");
    expect(bodyText(p).startsWith(`### ${T.storyPages[0].title}\n${T.storyPages[0].text}`)).toBe(true);
    expect(mediaUrls(p)).toEqual([`attachment://${storyPictureName(0)}`]);
    expect(viewText(p)).toContain("● ○ ○ ○ ○");
    expect(customIds(p)).toEqual(["sq|story|1", `sq|story|${STORY_PAGES - 1}`]);
    expect(buttonOf(p, "sq|story|1").style).toBe(1); // primary
    expect(accentColor(p)).toBe(TONE_COLORS.island);
    expect(calls(c)).toEqual([]);
  });

  it("steps through the story in place, without a database call; the last page holds the promise and start", async () => {
    const c = ctx(() => null, session({ onboarded: false }));
    const mid = interaction("button");
    await ACTION_HANDLERS.get("story")!(mid.i, c, ["2"]);
    expect(mid.sent[0].how).toBe("update");
    expect(bodyText(mid.sent[0].payload).startsWith(`### ${T.storyPages[2].title}\n`)).toBe(true);
    expect(customIds(mid.sent[0].payload)).toEqual(["sq|story|1", "sq|story|3", `sq|story|${STORY_PAGES - 1}`]);
    expect(mediaUrls(mid.sent[0].payload)).toEqual([`attachment://${storyPictureName(2)}`]);

    const last = interaction("button");
    await ACTION_HANDLERS.get("story")!(last.i, c, ["99"]);
    const p = last.sent[0].payload;
    expect(bodyText(p).startsWith(`### ${T.storyPages[STORY_PAGES - 1].title}\n`)).toBe(true);
    expect(viewText(p)).toContain(T.introPromise);
    expect(viewText(p)).not.toContain("ไม่นับเวลาในห้องเสียง");
    expect(customIds(p)).toEqual(["sq|start", "sq|start_info", `sq|story|${STORY_PAGES - 2}`]);
    expect(buttonOf(p, "sq|start").style).toBe(1);
    expect(calls(c)).toEqual([]);
  });

  it("clamps a page out of range, and keeps people outside the pilot out of the story", async () => {
    expect([storyPage("-3"), storyPage("x"), storyPage("1.7"), storyPage(99)]).toEqual([0, 0, 1, STORY_PAGES - 1]);
    const c = ctx();
    c.memberRoleIds = [];
    await expect(ACTION_HANDLERS.get("story")!(interaction("button").i, c, ["1"])).rejects.toThrow(T.notEligible);
  });

  it("starts with the same call and makes the island the next step", async () => {
    const c = ctx(() => null, session({ onboarded: false }));
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("start")!(i, c, []);
    expect(calls(c)).toEqual([["shift_quest_start", "1111111111", "x", false]]);
    expect(sent[0].how).toBe("update");
    const p = sent[0].payload;
    expectCard(p, V2);
    expect(bodyText(p).startsWith(`### ${T.startedTitle}\n${T.started}`)).toBe(true);
    expect(mediaUrls(p)).toEqual([`attachment://${MORNING_GIF}`]);
    expect(customIds(p)).toEqual(["sq|nav|project_new", "sq|nav|island", "sq|is_how"]);
    expect(buttonOf(p, "sq|nav|project_new").style).toBe(3); // success
  });

  it("sends someone with a project back to their island", async () => {
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("start")!(i, ctx(() => null, session({ current_project_id: ID(1) })));
    const p = sent[0].payload;
    expect(bodyText(p)).toBe(`### ${T.returnedTitle}\n${T.returned}`);
    expect(customIds(p)).toEqual(["sq|nav|island", "sq|start_info"]);
    expect(buttonOf(p, "sq|nav|island").style).toBe(1);
  });

  it("shows the started card again to someone already in", async () => {
    const c = ctx();
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("start")!(i, c);
    expect(customIds(sent[0].payload)).toContain("sq|nav|island");
    expect(calls(c)).toEqual([]);
  });

  it("ℹ️ shows the whole agreement in place, without a database call, then the one next step", async () => {
    const before = ctx(() => null, session({ onboarded: false }, { awards: false }));
    const a = interaction("button");
    await ACTION_HANDLERS.get("start_info")!(a.i, before, []);
    expect(a.sent[0].how).toBe("update");
    expectCard(a.sent[0].payload, V2);
    const text = viewText(a.sent[0].payload);
    for (const fact of ["สมัครใจ", "ดูตัวอย่างและกดยืนยันก่อนเสมอ", "ไม่นับเวลาในห้องเสียง", "/help", "/data", "ยังไม่มีการให้เหรียญ"]) {
      expect([fact, text.includes(fact)]).toEqual([fact, true]);
    }
    expect(customIds(a.sent[0].payload)).toEqual(["sq|start"]);
    expect(calls(before)).toEqual([]);

    const after = ctx();
    const b = interaction("button");
    await ACTION_HANDLERS.get("start_info")!(b.i, after, []);
    expect(viewText(b.sent[0].payload)).toContain("/coins");
    expect(customIds(b.sent[0].payload)).toEqual(["sq|nav|island", "sq|nav|project_new"]);
  });

  it("keeps people outside the pilot out of the agreement card too", async () => {
    const c = ctx();
    c.memberRoleIds = [];
    await expect(ACTION_HANDLERS.get("start_info")!(interaction("button").i, c, [])).rejects.toThrow(T.notEligible);
  });
});

/** Each action row, row by row: a custom ID, or "link:<url>" for a link button. */
function rowsWithLinks(p: Payload): string[][] {
  const card = cardsOf(p)[0] as unknown as Json;
  return (card.components ?? []).filter((c) => c.type === 1).map((r) => (r.components ?? []).map((b) => b.custom_id ?? `link:${b.url}`));
}

/** The link buttons on a card. */
function linksOf(p: Payload): Json[] {
  const card = cardsOf(p)[0] as unknown as Json;
  return (card.components ?? []).filter((c) => c.type === 1).flatMap((r) => (r.components ?? []).filter((b) => b.style === 5));
}

describe("/start link to the website", () => {
  const SITE = "https://www.passionseed.org";
  const ISLAND_URL = `${SITE}/shift/island`;

  it("puts 🏝️ ขึ้นเกาะ first on the story's last page, start still the main button", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = `${SITE}/`;
    const c = ctx(() => null, session({ onboarded: false }));
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("story")!(i, c, [String(STORY_PAGES - 1)]);
    const p = sent[0].payload;
    expectCard(p, V2);
    expect(rowsWithLinks(p)).toEqual([[`link:${ISLAND_URL}`, "sq|start", "sq|start_info", `sq|story|${STORY_PAGES - 2}`]]);
    expect(linksOf(p)).toEqual([expect.objectContaining({ type: 2, style: 5, url: ISLAND_URL, label: T.btnBoard })]);
    expect(buttonOf(p, "sq|start").style).toBe(1);
    expect(calls(c)).toEqual([]);
  });

  it("adds 🌐 to the started card, after /start and for someone already in", async () => {
    process.env.SHIFT_ISLAND_URL = ISLAND_URL;
    const c = ctx(() => null, session({ onboarded: false }));
    const a = interaction("button");
    await ACTION_HANDLERS.get("start")!(a.i, c, []);
    expect(calls(c)).toEqual([["shift_quest_start", "1111111111", "x", false]]);
    expectCard(a.sent[0].payload, V2);
    expect(rowsWithLinks(a.sent[0].payload)).toEqual([["sq|nav|project_new", "sq|nav|island", "sq|is_how", `link:${ISLAND_URL}`]]);
    expect(buttonOf(a.sent[0].payload, "sq|nav|project_new").style).toBe(3);

    const b = interaction("command");
    await COMMAND_HANDLERS.get("start")!(b.i, ctx());
    expectCard(b.sent[0].payload);
    expect(linksOf(b.sent[0].payload)).toEqual([expect.objectContaining({ url: ISLAND_URL, label: ISLAND_LINK_LABEL })]);
  });

  it("leaves the agreement card as it was", async () => {
    process.env.SHIFT_ISLAND_URL = ISLAND_URL;
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("start_info")!(i, ctx(), []);
    expect(linksOf(sent[0].payload)).toEqual([]);
  });

  it("is absent without an address, or with a refused one", async () => {
    for (const site of [undefined, "http://example.com", "not a url"]) {
      if (site) process.env.NEXT_PUBLIC_SITE_URL = site;
      const intro = interaction("button");
      await ACTION_HANDLERS.get("story")!(intro.i, ctx(() => null, session({ onboarded: false })), [String(STORY_PAGES - 1)]);
      expect(rowsWithLinks(intro.sent[0].payload)).toEqual([["sq|start", "sq|start_info", `sq|story|${STORY_PAGES - 2}`]]);
      const started = interaction("command");
      await COMMAND_HANDLERS.get("start")!(started.i, ctx());
      expect(rowsWithLinks(started.sent[0].payload)).toEqual([["sq|nav|project_new", "sq|nav|island", "sq|is_how"]]);
      expect(viewText(started.sent[0].payload)).not.toContain(ISLAND_LINK_LABEL);
    }
  });
});

const notice = (kind: string, unread: boolean, params: Record<string, unknown>, day = 1) => ({
  id: `n${day}`,
  kind,
  params,
  unread,
  created_at: `2026-11-${String(day).padStart(2, "0")}T05:00:00Z`,
});

function inboxCtx(inbox: Record<string, unknown>, help: unknown[] = [], squads: unknown[] = [], s: Session = session()) {
  return ctx((fn) => {
    if (fn === "shift_quest_inbox_list") return { items: [], recognitions: [], contributions: [], invites: [], ...inbox };
    if (fn === "shift_quest_help_mine") return help;
    if (fn === "shift_quest_squad_mine") return squads;
    return null;
  }, s);
}

describe("/inbox", () => {
  it("lists new and older notices, then what waits for an answer right above its numbered, named buttons", async () => {
    const c = inboxCtx(
      {
        items: [
          notice("review_approved", true, { title: "แอป", feedback: "ดีมาก", award: { issued: true, amount: 10 } }, 9),
          // The database sends newest first.
          ...Array.from({ length: 7 }, (_, n) => notice("award_issued", false, { title: `งาน ${6 - n}`, amount: 5 }, 7 - n)),
        ],
        recognitions: [{ share_id: ID(1), from: "ฟ้า", body: "ช่วยแก้บั๊ก" }],
        contributions: [{ submission_id: ID(2), title: "เว็บ", owner: "ต้น" }],
        invites: [{ project_id: ID(3), name: "ร้านค้า", from: "บี" }],
      },
      [{ id: ID(4), summary: "ติดเรื่อง deploy", status: "open" }],
      [{ id: "s1", name: "ทีมเช้า", status: "invited", invite_expires_at: null }]
    );
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("inbox")!(i, c);
    expect(calls(c).map((x) => x[0])).toEqual(["shift_quest_inbox_list", "shift_quest_help_mine", "shift_quest_squad_mine"]);
    expect(calls(c)[0]).toEqual(["shift_quest_inbox_list", "1111111111", true]);
    const p = sent[0].payload;
    expectCard(p);
    expect(accentColor(p)).toBe(TONE_COLORS.neutral);
    const body = bodyText(p);
    expect(body.startsWith(`### ${T.inboxTitle}\n-# ${T.onlyYou}\n\n✅ **แอป**`)).toBe(true);
    // The requests come last, so the last text above the buttons is what they answer.
    expect(body).toContain(`**${T.inboxAsks}**\n**1** 🙌 ฟ้า`);
    expect(body.indexOf(`**${T.inboxAsks}**`)).toBeGreaterThan(body.indexOf(T.helpMine));
    expect(body).toContain("> ช่วยแก้บั๊ก");
    expect(body).toContain("**4** 👥");
    // The new notice in full with a relative time; older ones one small line each, then a count.
    expect(body).toContain("✅ **แอป** ผ่านแล้ว · ได้ **10** Passioncoin · <t:");
    expect(body).toContain("> ความเห็น: ดีมาก");
    expect(body).toContain("-# 7 พ.ย. · 🪙 ได้ **5** Passioncoin จาก **งาน 6**");
    expect(body).toContain(`-# ${T.inboxOlder(2)}`);
    expect(body).toContain(`• ติดเรื่อง deploy · ${T.helpWaiting}`);
    expect(customIds(p)).toEqual([
      `sq|rec|${ID(1)}|y`,
      `sq|rec|${ID(1)}|n`,
      `sq|contrib|${ID(2)}`,
      `sq|notmine|${ID(2)}`,
      `sq|invite|${ID(3)}|y`,
      `sq|invite|${ID(3)}|n`,
      "sq|squad_rsvp|s1|y",
      "sq|squad_rsvp|s1|n",
      `sq|help_close|${ID(4)}`,
      "sq|is_view",
    ]);
    // Each kind's buttons say what they answer.
    const text = viewText(p);
    expect(text).toContain(`1 · ${T.btnRecYes}`);
    expect(text).toContain(`1 · ${T.btnRecNo}`);
    expect(text).toContain(`2 · ${T.btnConfirmPart}`);
    expect(text).toContain(`3 · ${T.btnInviteYes}`);
    expect(text).toContain(`3 · ${T.btnInviteNo}`);
    expect(text).toContain(`4 · ${T.btnSquadYes}`);
    expect(text).toContain(`4 · ${T.btnSquadNo}`);
  });

  it("keeps one request's buttons on a row of their own, unnumbered when it is the only one", async () => {
    const c = inboxCtx({ recognitions: [{ share_id: ID(1), from: "ฟ้า", body: "ขอบคุณ" }] }, [
      { id: ID(4), summary: "ช่วยด้วย", status: "claimed" },
    ]);
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("inbox")!(i, c);
    const p = sent[0].payload;
    expect(rowsOf(p)).toEqual([[`sq|rec|${ID(1)}|y`, `sq|rec|${ID(1)}|n`], [`sq|help_close|${ID(4)}`], ["sq|is_view"]]);
    expect(viewText(p)).toContain(T.btnRecYes);
    expect(viewText(p)).toContain(T.btnRecNo);
    expect(viewText(p)).not.toContain(`1 · ${T.btnRecYes}`);
    expect(viewText(p)).toContain(T.helpClaimed);
  });

  it("stays inside Discord's limits with every kind of request and a full page of long notices", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const long = "ก".repeat(600);
      const c = inboxCtx(
        {
          items: Array.from({ length: 15 }, (_, n) => notice("review_clarification", true, { title: `งาน ${n}`, feedback: long }, n + 1)),
          recognitions: [1, 2, 3].map((n) => ({ share_id: ID(n), from: "ฟ้า", body: long })),
          contributions: [4, 5, 6].map((n) => ({ submission_id: ID(n), title: "เว็บ", owner: "ต้น" })),
          invites: [7, 8, 9].map((n) => ({ project_id: ID(n), name: "ร้านค้า", from: "บี" })),
        },
        [1, 2, 3, 4, 5].map((n) => ({ id: ID(n), summary: long, status: "open" })),
        [1, 2].map((n) => ({ id: `s${n}`, name: "ทีม", status: "invited" }))
      );
      const { i, sent } = interaction("command");
      await COMMAND_HANDLERS.get("inbox")!(i, c);
      const p = sent[0].payload;
      expectCard(p);
      expect(rowsOf(p).length).toBeLessThanOrEqual(5);
      // Every request keeps both its buttons (22), as before the cards.
      expect(customIds(p).filter((id) => /\|(rec|contrib|notmine|invite|squad_rsvp)\|/.test(id))).toHaveLength(22);
      for (const label of rowsOf(p).flat()) expect(label).toBeDefined();
      // Every numbered request is still there, and the card fits without the renderer trimming anything.
      expect(bodyText(p)).toContain("**11** 👥");
      expect(warn.mock.calls.flat().join(" ")).not.toContain("[shift-quests] view trimmed");
    } finally {
      warn.mockRestore();
    }
  });

  it("shows a pending request once, not again as its notice; an answered one's notice stays as history", async () => {
    const c = inboxCtx({
      items: [
        notice("recognition_request", true, { share_id: ID(1), from: "ฟ้า", body: "ช่วยแก้บั๊ก" }, 3),
        notice("project_invite", true, { project_id: ID(7), project_name: "เก่า", from: "บี" }, 2),
      ],
      recognitions: [{ share_id: ID(1), from: "ฟ้า", body: "ช่วยแก้บั๊ก" }],
    });
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("inbox")!(i, c);
    const body = bodyText(sent[0].payload);
    expect(body.split("🙌 ฟ้า")).toHaveLength(2);
    expect(body).not.toContain("ตอบได้ด้านล่าง");
    // An invite no longer waiting (answered or withdrawn) is still listed.
    expect(body).toContain("👋 บี ชวนคุณเข้าโปรเจกต์ **เก่า**");
  });

  it("offers 📋 งานที่ส่งไว้ next to a review result that asks for a change", async () => {
    const c = inboxCtx({ items: [notice("review_clarification", true, { title: "แอป", feedback: "ขอลิงก์" }, 2)] });
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("inbox")!(i, c);
    const p = sent[0].payload;
    expect(rowsOf(p)).toEqual([["sq|is_work", "sq|is_view"]]);
    expect(viewText(p)).toContain(I.btnWork);
    expect(bodyText(p)).toContain("📋 งานที่ส่งไว้");
    expect(bodyText(p)).not.toContain("/island กด");

    const quiet = inboxCtx({ items: [notice("award_issued", true, { title: "แอป", amount: 5 })] });
    const other = interaction("command");
    await COMMAND_HANDLERS.get("inbox")!(other.i, quiet);
    expect(customIds(other.sent[0].payload)).toEqual(["sq|is_view"]);
  });

  it("shows every new notice (opening marks them read), and counts only read ones as read", async () => {
    const c = inboxCtx({
      items: [
        ...Array.from({ length: 12 }, (_, n) => notice("help_resolve", true, { summary: `เรื่อง ${n}`, note: `บันทึก ${n}` }, 20 - n)),
        ...Array.from({ length: 3 }, (_, n) => notice("proposal_agreed", false, { title: `เสนอ ${n}`, amount: 5, note: `หมายเหตุ ${n}` }, 5 - n)),
      ],
    });
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("inbox")!(i, c);
    const body = bodyText(sent[0].payload);
    for (let n = 0; n < 12; n++) {
      expect(body).toContain(`ปิดเรื่อง "เรื่อง ${n}" แล้ว`);
      expect(body).toContain(`> บันทึก ${n}`);
    }
    // Read notices keep the mentor's note, and nothing is called read that was not shown.
    expect(body).toContain("> หมายเหตุ: หมายเหตุ 2");
    expect(body).not.toContain("ที่อ่านแล้ว");
  });

  it("fits five long new notices without the renderer cutting one away", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const long = "ข".repeat(800);
      const c = inboxCtx(
        {
          items: [
            ...Array.from({ length: 5 }, (_, n) => notice("review_clarification", true, { title: `รุ่นที่ ${n}`, feedback: long }, 20 - n)),
            ...Array.from({ length: 5 }, (_, n) => notice("review_declined", false, { title: `เก่า ${n}`, feedback: long }, 10 - n)),
          ],
          recognitions: [{ share_id: ID(1), from: "ฟ้า", body: long }],
        },
        [1, 2].map((n) => ({ id: ID(n + 2), summary: long, status: "open" }))
      );
      // As in production: every /command becomes a clickable mention.
      const { setCommandIds, commandIdMap } = await import("../ui");
      setCommandIds(commandIdMap(["island", "inbox", "help", "celebrate", "data"].map((name, n) => ({ id: `12345678901234567${n}`, name }))));
      try {
        const { i, sent } = interaction("command");
        await COMMAND_HANDLERS.get("inbox")!(i, c);
        const p = sent[0].payload;
        expectCard(p);
        const body = bodyText(p);
        for (let n = 0; n < 5; n++) expect(body).toContain(`💬 **รุ่นที่ ${n}** ขอข้อมูลเพิ่ม`);
        expect(body.split("\n").filter((line) => line.trim() === "…")).toEqual([]);
        expect(warn.mock.calls.flat().join(" ")).not.toContain("view trimmed");
      } finally {
        setCommandIds(new Map());
      }
    } finally {
      warn.mockRestore();
    }
  });

  it("says when there is nothing new, and gives staff no island button", async () => {
    const c = inboxCtx({}, [], [], session({ onboarded: false, roles: ["reviewer"] }));
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("inbox")!(i, c);
    expect(calls(c).map((x) => x[0])).toEqual(["shift_quest_inbox_list"]);
    expect(viewText(sent[0].payload)).toContain(T.inboxEmpty);
    expect(customIds(sent[0].payload)).toEqual([]);
  });

  it("reopens in place from the 📬 button, with the same call as /inbox", async () => {
    const c = inboxCtx({ invites: [{ project_id: ID(3), name: "ร้านค้า", from: "บี" }] });
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("inbox")!(i, c, []);
    expect(sent[0].how).toBe("update");
    expectCard(sent[0].payload, V2);
    expect(calls(c)[0]).toEqual(["shift_quest_inbox_list", "1111111111", true]);
    expect(customIds(sent[0].payload)).toContain(`sq|invite|${ID(3)}|y`);
  });
});

describe("answers from the inbox", () => {
  it("confirm in one line, with the way back to the inbox and the island", async () => {
    const c = ctx(() => "queued");
    const a = interaction("button");
    await ACTION_HANDLERS.get("rec")!(a.i, c, [ID(1), "y"]);
    expect(calls(c)).toEqual([["shift_quest_share_respond", "1111111111", ID(1), true]]);
    expect(a.sent[0].how).toBe("update");
    expectCard(a.sent[0].payload, V2);
    expect(bodyText(a.sent[0].payload)).toBe(`✅ ${T.sharePosted}`);
    expect(customIds(a.sent[0].payload)).toEqual(["sq|inbox", "sq|is_view"]);
    expect(accentColor(a.sent[0].payload)).toBe(TONE_COLORS.success);

    const b = interaction("button");
    await ACTION_HANDLERS.get("invite")!(b.i, ctx(), [ID(3), "n"]);
    expect(bodyText(b.sent[0].payload)).toBe(T.projectDeclined);
    expect(accentColor(b.sent[0].payload)).toBe(TONE_COLORS.neutral);

    const m = interaction("modal", { fields: { getTextInputValue: () => "ทำหน้าเว็บ" } });
    const cm = ctx();
    await ACTION_HANDLERS.get("contrib")!(m.i, cm, [ID(2)]);
    expect(calls(cm)).toEqual([["shift_quest_contribution_respond", "1111111111", ID(2), true, "ทำหน้าเว็บ"]]);
    expect(m.sent[0].how).toBe("reply");
    expect(bodyText(m.sent[0].payload)).toBe(`✅ ${T.contributionDone}`);
  });

  it("names a declined or already answered recognition in a neutral card, never a bare ✅", async () => {
    const declined = ctx(() => "peer_declined");
    const a = interaction("button");
    await ACTION_HANDLERS.get("rec")!(a.i, declined, [ID(1), "n"]);
    expect(calls(declined)).toEqual([["shift_quest_share_respond", "1111111111", ID(1), false]]);
    expect(bodyText(a.sent[0].payload)).toBe(T.shareDeclined);
    expect(accentColor(a.sent[0].payload)).toBe(TONE_COLORS.neutral);
    expect(customIds(a.sent[0].payload)).toEqual(["sq|inbox", "sq|is_view"]);

    const closed = interaction("button");
    await ACTION_HANDLERS.get("rec")!(closed.i, ctx(() => "cancelled"), [ID(1), "y"]);
    expect(bodyText(closed.sent[0].payload)).toBe(T.shareClosed);
  });

  it("closes a help request with a new private toast, leaving the inbox card as it was", async () => {
    const c = ctx();
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("help_close")!(i, c, [ID(4)]);
    expect(calls(c)).toEqual([["shift_quest_help_withdraw", "1111111111", ID(4)]]);
    expect(sent[0].how).toBe("reply");
    expectCard(sent[0].payload);
    expect(bodyText(sent[0].payload)).toBe(`✅ ${T.helpClosed}`);
  });
});

const ledger = (n: number) => ({ amount: 5, kind: "award", reason: "quest", created_at: `2026-11-${String(n).padStart(2, "0")}T05:00:00Z`, title: "แอป" });

describe("/coins", () => {
  it("leads with the balance, lists the newest entries, and keeps the rules one tap away", async () => {
    const c = ctx(
      () => ({ balance: 120, reserved: 10, entries: Array.from({ length: 10 }, (_, n) => ledger(n + 1)), awards_live: true }),
      session({}, { reward_terms: "งานที่รีวิวผ่านได้ 10 เหรียญ", redemption: true })
    );
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("coins")!(i, c);
    expect(calls(c)).toEqual([["shift_quest_coins", "1111111111"]]);
    const p = sent[0].payload;
    expectCard(p);
    expect(accentColor(p)).toBe(TONE_COLORS.coins);
    const body = bodyText(p);
    expect(body.startsWith(`### ${T.coinsTitle}\n${T.coinsBalance(120, 10)}`)).toBe(true);
    expect(body).toContain("`+5` ได้จากเควสต์: แอป · 1 พ.ย.");
    expect(body).toContain(`-# ${T.coinsMore(5)}`);
    expect(body).toContain(`-# ${T.coinsRules}`);
    expect(body).not.toContain("งานที่รีวิวผ่านได้ 10 เหรียญ");
    expect(customIds(p)).toEqual(["sq|rw_terms|coins", "sq|rw_view", "sq|is_view"]);
  });

  it("says when coins are paused, with no rules or rewards button", async () => {
    const c = ctx(() => ({ balance: 3, reserved: 0, entries: [], awards_live: false }), session({}, { reward_terms: "x" }));
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("coins")!(i, c);
    expect(viewText(sent[0].payload)).toContain(T.coinsOff);
    expect(viewText(sent[0].payload)).toContain(T.coinsEmpty);
    expect(customIds(sent[0].payload)).toEqual(["sq|is_view"]);
  });

  it("ℹ️ shows the published rules or redemption terms from the session, without a database call", async () => {
    const c = ctx(() => null, session({}, { reward_terms: "**กติกา**", redemption_terms: "แลกได้เดือนละครั้ง" }));
    const a = interaction("button");
    await ACTION_HANDLERS.get("rw_terms")!(a.i, c, ["coins"]);
    expect(a.sent[0].how).toBe("reply");
    expectCard(a.sent[0].payload);
    expect(bodyText(a.sent[0].payload)).toBe(`### ${T.coinTermsTitle}\n\\*\\*กติกา\\*\\*`);
    const b = interaction("button");
    await ACTION_HANDLERS.get("rw_terms")!(b.i, c, ["redeem"]);
    expect(bodyText(b.sent[0].payload)).toBe(`### ${T.redeemTermsTitle}\nแลกได้เดือนละครั้ง`);
    expect(calls(c)).toEqual([]);
  });
});

const catalog = (over: Record<string, unknown> = {}) => ({
  live: true,
  terms: "ผู้ปกครองต้องยินยอม",
  balance: 50,
  items: [
    { id: ID(1), name: "สติกเกอร์", description: "สติกเกอร์ SHIFT 3 แผ่น", cost: 30, in_stock: true },
    { id: ID(2), name: "เสื้อ", description: null, cost: 70, in_stock: true },
    { id: ID(3), name: "หมวก", description: null, cost: 40, in_stock: false },
  ],
  mine: [
    { id: ID(5), item: "สติกเกอร์", cost: 30, status: "reserved", created_at: "2026-11-01T00:00:00Z" },
    { id: ID(6), item: "สมุด", cost: 10, status: "completed", created_at: "2026-11-01T00:00:00Z" },
  ],
  ...over,
});

describe("/rewards", () => {
  it("lists what can be had, picks from the select, and cancels a reserved request", async () => {
    const c = ctx(() => catalog());
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("rewards")!(i, c);
    expect(calls(c)).toEqual([["shift_quest_catalog_list", "1111111111"]]);
    const p = sent[0].payload;
    expectCard(p);
    const body = bodyText(p);
    expect(body).toContain("• **สติกเกอร์** · 30 เหรียญ");
    expect(body).toContain(`• **หมวก** · 40 เหรียญ · ${T.rewardsSoldOut}`);
    expect(body).toContain(`• สมุด · 10 เหรียญ · ${T.redemptionStatus.completed}`);
    expect(body).not.toContain("ผู้ปกครองต้องยินยอม");
    expect(customIds(p)).toEqual(["sq|rw_pick", `sq|rw_cancel|${ID(5)}`, "sq|rw_terms|redeem", "sq|is_view"]);
    const select = (cardsOf(p)[0] as unknown as Json).components!.find((x) => x.type === 1)!.components![0];
    expect(select.options!.map((o) => o.description)).toEqual(["สติกเกอร์ SHIFT 3 แผ่น", undefined]);
  });

  it("says when redemption is closed", async () => {
    const c = ctx(() => catalog({ live: false, terms: null, items: [], mine: [] }));
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("rewards")!(i, c);
    expect(viewText(sent[0].payload)).toContain(T.rewardsOff);
    expect(customIds(sent[0].payload)).toEqual(["sq|is_view"]);
  });

  it("previews a redemption with the guardian rule, and keeps confirm off when coins are short", async () => {
    const c = ctx(() => catalog());
    const { i, sent } = interaction("select", { values: [ID(2)] });
    await ACTION_HANDLERS.get("rw_pick")!(i, c, []);
    expect(sent[0].how).toBe("update");
    const p = sent[0].payload;
    expectCard(p, V2);
    const text = viewText(p);
    expect(text).toContain("ผู้ปกครอง");
    expect(text).toContain("ทีมจะไม่ขอทาง DM");
    expect(text).toContain("ยังขาดอีก **20**");
    // Cancel redraws the rewards card (read only) instead of leaving a card with no buttons.
    expect(customIds(p)).toEqual([`sq|rw_go|${ID(2)}|222222222222222222|70`, "sq|rw_view"]);
    expect(buttonOf(p, `sq|rw_go|${ID(2)}|222222222222222222|70`).disabled).toBe(true);
  });

  it("keeps a way on when the picked reward is gone or redemption has closed", async () => {
    const c = ctx(() => catalog({ live: false }));
    const { i, sent } = interaction("select", { values: [ID(2)] });
    await ACTION_HANDLERS.get("rw_pick")!(i, c, []);
    expect(sent[0].how).toBe("update");
    expect(viewText(sent[0].payload)).toContain(T.rewardsOff);
    expect(customIds(sent[0].payload)).toEqual(["sq|rw_view", "sq|is_view"]);
  });

  it("confirms a redemption in one line, with the way to the student's requests", async () => {
    const c = ctx(() => ({ duplicate: false }));
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("rw_go")!(i, c, [ID(1), "k", "30"]);
    expect(calls(c)).toEqual([["shift_quest_redeem", "1111111111", ID(1), "k", 30]]);
    const body = bodyText(sent[0].payload);
    expect(body).toBe(`✅ ${T.redeemed}\n-# ${T.redeemedNext}`);
    expect(customIds(sent[0].payload)).toEqual(["sq|rw_view", "sq|is_view"]);
  });

  it("opens the rewards card in place from 🎁", async () => {
    const c = ctx(() => catalog());
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("rw_view")!(i, c, []);
    expect(sent[0].how).toBe("update");
    expect(calls(c)).toEqual([["shift_quest_catalog_list", "1111111111"]]);
    expect(bodyText(sent[0].payload).startsWith(`### ${T.rewardsTitle}\n`)).toBe(true);
  });

  it("cancels anything with a neutral card and no buttons", async () => {
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("noop")!(i, ctx(), []);
    expect(bodyText(sent[0].payload)).toBe(T.cancelled);
    expect(customIds(sent[0].payload)).toEqual([]);
  });
});

describe("/settings", () => {
  it("puts each setting on one line and keeps the same buttons", async () => {
    const prefs = { reminders_opt_in: true, reminder_days: [1, 3], reminder_hour: 19, notify_dm: true } as Session["prefs"];
    const c = ctx(() => null, session({ prefs }));
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("settings")!(i, c);
    const p = sent[0].payload;
    expectCard(p);
    const body = bodyText(p);
    expect(body).toContain(T.remindersOn(`${DAY_NAMES[1]} ${DAY_NAMES[3]}`, 19));
    expect(body).toContain(`-# ${T.remindersPaused}`);
    expect(body).toContain(T.dmOn);
    expect(customIds(p)).toEqual(["sq|rem_on", "sq|rem_off", "sq|dm|off", "sq|is_view"]);
    expect(calls(c)).toEqual([]);
  });
});

describe("/data", () => {
  it("says what is kept and offers export, correction and erasure", async () => {
    const c = ctx(() => null, session({ onboarded: false }));
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("data")!(i, c);
    const p = sent[0].payload;
    expectCard(p);
    expect(viewText(p)).toContain(T.dataBody);
    expect(viewText(p)).toContain(T.dataRights);
    expect(customIds(p)).toEqual(["sq|data_export", "sq|data_fix", "sq|data_erase"]);
  });

  it("sends the export as a file inside the private card", async () => {
    const c = ctx(() => ({ member: { display_name: "x" } }));
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("data_export")!(i, c, []);
    expect(calls(c)).toEqual([["shift_quest_data_export", "1111111111"]]);
    const p = sent[0].payload;
    expect(sent[0].how).toBe("reply");
    expectCard(p);
    expect(mediaUrls(p)).toEqual(["attachment://shift-high-quests-my-data.json"]);
    expect(p.files).toHaveLength(1);
    expect(viewText(p)).toContain(T.exportReady);
  });

  it("asks before an erasure request, in the warning colour, and sends it with the same call", async () => {
    const a = interaction("button");
    await ACTION_HANDLERS.get("data_erase")!(a.i, ctx(), []);
    const p = a.sent[0].payload;
    expect(accentColor(p)).toBe(TONE_COLORS.warn);
    expect(viewText(p)).toContain(T.erasureKept);
    // Cancel brings the /data card back, export included.
    expect(customIds(p)).toEqual(["sq|data_erase_go", "sq|data_view"]);
    const back = interaction("button");
    const quiet = ctx();
    await ACTION_HANDLERS.get("data_view")!(back.i, quiet, []);
    expect(back.sent[0].how).toBe("update");
    expectCard(back.sent[0].payload, V2);
    expect(customIds(back.sent[0].payload)).toEqual(["sq|data_export", "sq|data_fix", "sq|data_erase"]);
    expect(calls(quiet)).toEqual([]);
    const outsider = ctx(() => null, session({ member_id: null, onboarded: false }));
    await expect(ACTION_HANDLERS.get("data_view")!(interaction("button").i, outsider, [])).rejects.toThrow(T.notStarted);

    const c = ctx();
    const b = interaction("button");
    await ACTION_HANDLERS.get("data_erase_go")!(b.i, c, []);
    expect(calls(c)).toEqual([["shift_quest_data_request", "1111111111", "erasure", null]]);
    expect(bodyText(b.sent[0].payload)).toBe(`✅ ${T.requestSent}`);
  });
});

describe("student copy", () => {
  it("uses no em dashes and never writes น้องๆ", () => {
    const story = T.storyPages.flatMap((p) => [p.title, p.text, p.alt]);
    const text = [...story, T.introPromise, T.rules(true), T.rules(false), T.started, T.startedFine, T.returned, T.dataBody, T.dataRights, I.howSeason].join("\n");
    expect(text).not.toContain("\u2014");
    expect(text).not.toContain("น้องๆ");
    expect(I.btnBack).toBe("🏝️ กลับเกาะ");
  });

  it("tells the story in five pages, ending on festival night without a hardcoded Demo Day date", () => {
    expect(T.storyPages).toHaveLength(5);
    const all = T.storyPages.map((p) => p.text).join("\n");
    expect(all).toContain("เจอกันบนเกาะ");
    expect(T.storyPages.at(-1)!.text).toContain("คืนเทศกาล Demo Day");
    expect(`${all}\n${I.howSeason}`).not.toMatch(/\d{1,2}\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)/);
    expect(all).not.toContain("ปลูก");
  });

  it("keeps the season's ending on the how card", () => {
    expect(I.howSeason.split("\n").at(-1)).toBe("🌅 ซีซันจบ ต้นไม้ยังอยู่ วันหนึ่งคุณกลับมาช่วยคนที่เพิ่งขึ้นเกาะได้");
  });
});
