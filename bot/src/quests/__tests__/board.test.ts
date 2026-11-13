/**
 * @jest-environment node
 */
import { ButtonStyle, MessageFlags } from "discord.js";

import { ACTION_HANDLERS } from "..";
import type { Quest, QuestApi, Session } from "../api";
import type { Ctx } from "../context";
import { T } from "../copy";
import { boardView, nextMain, pickSide, sideView } from "../handlers/board";
import { I, QB } from "../island/copy";
import { LIMITS, renderView } from "../ui";
import { BOARD_LINK_LABEL, boardLinkButton } from "../weblink";
import { INSTANCE_ID, SIDE_IDS, boardFixture, main, mine, side } from "../test-helpers/board";
import { bodyText, cardsOf, componentCount, customIds, textLength, viewText } from "../test-helpers/view";

/**
 * The quest card (handlers/board.ts): the web quest board in Discord, one
 * line per quest, read with shift_quest_board. Every card is private.
 */

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

function ctx(call: (fn: string, ...args: unknown[]) => unknown = () => null): Ctx {
  const api = { call: jest.fn(async (fn: string, ...args: unknown[]) => call(fn, ...args)), rows: jest.fn() };
  return { api: api as unknown as QuestApi, userId: "1111111111", name: "x", memberRoleIds: ["555"], session: session() };
}
const calls = (c: Ctx) => (c.api.call as jest.Mock).mock.calls;

function interaction(kind: "button" | "select" | "modal", o: { values?: string[]; fields?: Record<string, string> } = {}) {
  const sent: { how: string; payload: unknown }[] = [];
  const modals: { custom_id?: string; title?: string; components?: unknown[] }[] = [];
  const record = (how: string) => async (payload: unknown) => {
    if (how === "reply") i.replied = true;
    sent.push({ how, payload });
  };
  const i: Record<string, unknown> = {
    id: "2",
    deferred: false,
    replied: false,
    customId: "sq|x",
    values: o.values ?? [],
    message: { content: "", embeds: [] },
    isChatInputCommand: () => false,
    isMessageComponent: () => kind !== "modal",
    isButton: () => kind === "button",
    isStringSelectMenu: () => kind === "select",
    isModalSubmit: () => kind === "modal",
    fields: { getTextInputValue: (id: string) => o.fields?.[id] ?? "" },
    reply: record("reply"),
    update: record("update"),
    editReply: record("editReply"),
    followUp: record("followUp"),
    deferReply: async (payload: unknown) => {
      i.deferred = true;
      sent.push({ how: "deferReply", payload });
    },
    deferUpdate: async () => {
      i.deferred = true;
    },
    showModal: async (m: { toJSON: () => { custom_id?: string } }) => modals.push(m.toJSON()),
  };
  return { i: i as never, sent, modals };
}

const card = (view: Parameters<typeof renderView>[0]) => renderView(view);
const lines = (payload: unknown) => bodyText(payload).split("\n");

describe("boardView", () => {
  it("lists the next main quest, the community quests and the side quests, one line each with its state", () => {
    const p = card(boardView(boardFixture()));
    expect(lines(p)[0]).toBe(`### ${QB.title}`);
    const text = bodyText(p);
    // The tree is at stage 2: main quest 3 is next.
    expect(text).toContain(QB.main);
    expect(text).toContain(QB.line("▫️", "หลัก 3", QB.status.available, 3));
    expect(text).not.toContain("หลัก 4");
    expect(text).toContain(QB.community);
    expect(text).toContain(QB.line("▫️", "หลัก 6", QB.status.available, 6));
    expect(text).toContain(QB.line("▫️", "หลัก 7", QB.status.available, 7));
    // Side quests: the caller's own open one first, then the ones open to take; the locked one is counted.
    const sideLines = lines(p).filter((l) => l.includes("เสริม "));
    expect(sideLines).toEqual([
      QB.line("🔨", "เสริม 1", QB.status.active),
      QB.line("▫️", "เสริม 0", QB.status.available),
      QB.line("▫️", "เสริม 3", QB.status.available),
    ]);
    expect(text).toContain(QB.locked(1));
    expect(text).toContain(QB.legend);
    expect(text).toContain(QB.growth);
  });

  it("acts where Discord already can: the side quest menu, 🌟 for main quests, 📋 for your own work, the way back", () => {
    const p = card(boardView(boardFixture()));
    expect(customIds(p)).toEqual(["sq|qb_side", "sq|is_ms", "sq|is_work", "sq|is_view"]);
    // Every side quest is in the menu, the locked one too (its card says what opens it).
    expect(viewText(p)).toContain(QB.pickSide);
    for (const k of [0, 1, 2, 3]) expect(viewText(p)).toContain(`เสริม ${k}`);
  });

  it("links to the board on the website when the island has an address, and only then", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.passionseed.org";
    const p = card(boardView(boardFixture(), boardLinkButton()));
    const row = cardsOf(p)[0].components as { type: number; components?: { label?: string; url?: string; style?: number }[] }[];
    const buttons = row.flatMap((c) => c.components ?? []);
    expect(buttons.at(-1)).toEqual(
      expect.objectContaining({ label: BOARD_LINK_LABEL, url: "https://www.passionseed.org/shift/island?at=board", style: ButtonStyle.Link })
    );
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(boardLinkButton()).toBeNull();
  });

  it("shows a teammate's open main quest as theirs, and the caller's own open ones after the next", () => {
    const b = boardFixture({
      main: [1, 2, 3, 4, 5, 6, 7].map((n) =>
        n === 3
          ? main(3, { in_flight: { instance_id: "x", state: "active", version: 1, mine: false, owner: "ฟ้า" } as never })
          : n === 5
            ? main(5, { in_flight: { instance_id: INSTANCE_ID, state: "submitted", version: 2, mine: true } as never, mine: mine("submitted") })
            : main(n, { done: n <= 2 })
      ),
    });
    const text = bodyText(card(boardView(b)));
    expect(text).toContain(QB.line("👥", "หลัก 3", I.heldBy("ฟ้า"), 3));
    expect(text).toContain(QB.line("⏳", "หลัก 5", QB.status.submitted, 5));
  });

  it("says so when every main quest outside the community ones has passed", () => {
    const b = boardFixture({ main: [1, 2, 3, 4, 5, 6, 7].map((n) => main(n, { done: n <= 5 })) });
    expect(nextMain(b)).toBeNull();
    const text = bodyText(card(boardView(b)));
    expect(text).toContain(QB.coreDone);
    expect(text).toContain(QB.line("▫️", "หลัก 6", QB.status.available, 6));
  });

  it("without side quests says none are open, with no menu", () => {
    const p = card(boardView(boardFixture({ side: [] })));
    expect(bodyText(p)).toContain(QB.noSide);
    expect(customIds(p)).toEqual(["sq|is_ms", "sq|is_work", "sq|is_view"]);
  });

  it("without a plot offers one: every quest belongs to a project", () => {
    const p = card(boardView(boardFixture({ project: null })));
    expect(bodyText(p)).toContain(QB.noPlot);
    expect(customIds(p)).toEqual(["sq|is_claim", "sq|is_view"]);
  });

  it("stays inside Discord's limits with a full board", () => {
    const sides = Array.from({ length: 40 }, (_, k) => side(k % 4, { template_id: SIDE_IDS[k % 4], title: `เควสต์เสริมที่มีชื่อยาวมาก ${k} ${"ก".repeat(70)}` }));
    const p = card(boardView(boardFixture({ side: sides })));
    expect(componentCount(p)).toBeLessThanOrEqual(LIMITS.components);
    expect(textLength(p)).toBeLessThanOrEqual(LIMITS.text);
    expect(bodyText(p)).toContain(I.more(40 - 5));
  });
});

describe("sideView", () => {
  it("open to take: what it is for, when it is done, and 🧭 take it or 🌟 send it", () => {
    const b = boardFixture();
    const p = card(sideView(b, b.side[0]));
    expect(lines(p)[0]).toBe(`### ${QB.sideTitle("เสริม 0")}`);
    expect(bodyText(p)).toContain(`▫️ **${QB.status.available}**`);
    expect(bodyText(p)).toContain(`**${QB.doneWhen}** ลิงก์ที่เปิดได้จริง`);
    expect(bodyText(p)).toContain(QB.sideFine);
    expect(customIds(p)).toEqual([`sq|qb_take|${SIDE_IDS[0]}`, `sq|qb_send|${SIDE_IDS[0]}`, "sq|is_board", "sq|is_view"]);
  });

  it("in progress: opens the caller's own quest, with its usual buttons", () => {
    const b = boardFixture();
    expect(customIds(card(sideView(b, b.side[1])))).toEqual([`sq|q|${INSTANCE_ID}`, "sq|is_board", "sq|is_view"]);
  });

  it("locked: what opens it, and no action", () => {
    const b = boardFixture();
    const p = card(sideView(b, b.side[2]));
    expect(bodyText(p)).toContain(QB.needs("หลัก 3"));
    expect(customIds(p)).toEqual(["sq|is_board", "sq|is_view"]);
  });

  it("off the project's route: still open, and says so", () => {
    const b = boardFixture();
    expect(bodyText(card(sideView(b, b.side[3])))).toContain(QB.offRoute);
  });

  it("passed: sends again only when it can be repeated", () => {
    const b = boardFixture();
    expect(customIds(card(sideView(b, side(0, { approved: true }))))).toEqual(["sq|is_board", "sq|is_view"]);
    expect(customIds(card(sideView(b, side(0, { approved: true, repeatable: true }))))).toEqual([
      `sq|qb_send|${SIDE_IDS[0]}`,
      "sq|is_board",
      "sq|is_view",
    ]);
  });
});

describe("pickSide", () => {
  it("starts from the same place for a round, and takes the first quest the person can take, on their route first", () => {
    const b = boardFixture();
    for (let round = 1000; round < 1100; round++) {
      const s = pickSide(b, round)!;
      expect(s).toBe(pickSide(b, round));
      expect([SIDE_IDS[0], SIDE_IDS[3]]).toContain(s.template_id);
      // Side 3 is off the route: side 0 is open and on it, so it wins.
      expect(s.template_id).toBe(SIDE_IDS[0]);
    }
    const spread = new Set(
      Array.from({ length: 100 }, (_, k) => pickSide(boardFixture({ side: [side(0), side(1), side(3)] }), k)!.template_id)
    );
    expect(spread.size).toBeGreaterThan(1);
  });

  it("is null when nothing is open to take, or without a project", () => {
    expect(pickSide(boardFixture({ side: [side(1, { mine: mine("active") }), side(2, { locked: true })] }), 5)).toBeNull();
    expect(pickSide(boardFixture({ project: null }), 5)).toBeNull();
    expect(pickSide(boardFixture({ side: [] }), 5)).toBeNull();
  });
});

const QUEST: Quest = {
  id: INSTANCE_ID,
  title: "เสริม 0",
  state: "active",
  version: 1,
  goal: "เป้าของเควสต์เสริม 0",
  why: null,
  next_step: "เริ่ม",
  criteria: "ลิงก์ที่เปิดได้จริง",
  review_date: null,
  overdue: false,
  proposed: false,
  reward_agreed: true,
  reward: null,
  award_status: null,
  award_note: null,
  project_id: "p",
  reflection_prompt: "อะไรที่ไม่เป็นอย่างที่คิด",
  latest_submission: null,
  latest_review: null,
};

describe("quest card buttons", () => {
  it("📜 reads the board and shows the card in place of the private card it was opened from", async () => {
    const c = ctx((fn) => (fn === "shift_quest_board" ? boardFixture() : null));
    const b = interaction("button");
    await ACTION_HANDLERS.get("is_board")!(b.i, c, []);
    expect(calls(c)).toEqual([["shift_quest_board", "1111111111"]]);
    expect(b.sent.map((x) => x.how)).toEqual(["update"]);
    expect(lines(b.sent[0].payload)[0]).toBe(`### ${QB.title}`);
  });

  it("the menu opens one side quest; one gone from the board says so", async () => {
    const c = ctx((fn) => (fn === "shift_quest_board" ? boardFixture() : null));
    const b = interaction("select", { values: [SIDE_IDS[3]] });
    await ACTION_HANDLERS.get("qb_side")!(b.i, c, []);
    expect(lines(b.sent[0].payload)[0]).toBe(`### ${QB.sideTitle("เสริม 3")}`);

    const gone = interaction("select", { values: ["7a1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e99"] });
    await ACTION_HANDLERS.get("qb_side")!(gone.i, c, []);
    expect(bodyText(gone.sent[0].payload)).toContain(QB.gone);
  });

  it("🧭 takes the side quest with the website's own function, then shows it as 📋 does", async () => {
    const c = ctx((fn) => {
      if (fn === "shift_quest_side_choose") return { instance_id: INSTANCE_ID, version: 1, created: true };
      if (fn === "shift_quest_my_quests") return [QUEST];
      return null;
    });
    const b = interaction("button");
    await ACTION_HANDLERS.get("qb_take")!(b.i, c, [SIDE_IDS[0]]);
    expect(calls(c)).toEqual([
      ["shift_quest_side_choose", "1111111111", SIDE_IDS[0]],
      ["shift_quest_my_quests", "1111111111", true],
    ]);
    expect(bodyText(b.sent[0].payload)).toContain(`✅ ${QB.taken}`);
    expect(customIds(b.sent[0].payload)).toContain(`sq|qa|submit|${INSTANCE_ID}|1`);
  });

  it("🌟 asks for proof and the quest's own question, then sends it with the website's own function", async () => {
    const read = ctx((fn) => (fn === "shift_quest_board" ? boardFixture() : null));
    const b = interaction("button");
    await ACTION_HANDLERS.get("qb_send")!(b.i, read, [SIDE_IDS[0]]);
    expect(b.modals[0].custom_id).toBe(`sq|qb_send|${SIDE_IDS[0]}`);
    expect(b.modals[0].title).toBe("เสริม 0");
    expect(JSON.stringify(b.modals[0])).toContain("อะไรที่ไม่เป็นอย่างที่คิด");

    const c = ctx();
    const m = interaction("modal", { fields: { proof: "ลองแล้ว https://example.org/app.", note: "คนกดปุ่มผิดที่" } });
    await ACTION_HANDLERS.get("qb_send")!(m.i, c, [SIDE_IDS[0]]);
    expect(calls(c)).toEqual([
      ["shift_quest_side_submit", "1111111111", SIDE_IDS[0], "ลองแล้ว https://example.org/app.", "คนกดปุ่มผิดที่", "https://example.org/app"],
    ]);
    expect(m.sent.map((x) => x.how)).toEqual(["deferReply", "editReply"]);
    expect((m.sent[0].payload as { flags: number }).flags & MessageFlags.Ephemeral).toBeTruthy();
    expect(bodyText(m.sent[1].payload)).toContain(QB.sent);
    expect(customIds(m.sent[1].payload)).toEqual(["sq|is_board", "sq|is_view"]);
  });

  it("ignores forged ids and is for students who have started", async () => {
    const c = ctx();
    for (const action of ["qb_take", "qb_send", "qb_side"]) {
      const b = interaction("button");
      await ACTION_HANDLERS.get(action)!(b.i, c, ["not-a-uuid"]);
      expect([action, b.sent, b.modals]).toEqual([action, [], []]);
    }
    expect(calls(c)).toEqual([]);
    c.session = { ...c.session, member_id: null, onboarded: false };
    await expect(ACTION_HANDLERS.get("is_board")!(interaction("button").i, c, [])).rejects.toThrow(T.notStarted);
  });
});

describe("quest card copy", () => {
  it("is in the house style: no em dash, never น้องๆ, no ปลูก, no coin numbers", () => {
    const text = JSON.stringify(QB) + I.btnBoard + I.howRounds + BOARD_LINK_LABEL;
    expect(text).not.toContain("—");
    expect(text).not.toContain("น้องๆ");
    expect(text).not.toContain("ปลูก");
    expect(text).not.toMatch(/\d+\s*(coin|เหรียญ)/i);
  });
});
