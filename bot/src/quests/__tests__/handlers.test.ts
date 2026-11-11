/**
 * @jest-environment node
 */
import fs from "node:fs";
import path from "node:path";

import { SPRITES } from "../../../assets/island/sprites";
import { ACTION_HANDLERS, COMMAND_HANDLERS, REQUIRED_SCHEMA, checkQuestSchema } from "..";
import { QuestDbError, QuestError, type QuestApi, type Session } from "../api";
import { questCommands } from "../commands";
import type { Ctx } from "../context";
import { STATE, T, errorText, renderInbox } from "../copy";
import { renderIslandReport } from "../handlers/admin";
import { islandMessage, milestoneModal, proofLink } from "../handlers/island";
import { squadLines } from "../handlers/squad";
import { ledgerReason } from "../handlers/student";
import { I, SQ } from "../island/copy";
import { showError } from "../ui";

const QUEST_SRC = path.join(__dirname, "..");

function session(roles: string[] = []): Session {
  return {
    member_id: "m",
    onboarded: true,
    roles,
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

function ctx(call: (fn: string, ...args: unknown[]) => unknown, roles: string[] = []): Ctx {
  const api = { call: jest.fn(async (fn: string, ...args: unknown[]) => call(fn, ...args)), rows: jest.fn() };
  return { api: api as unknown as QuestApi, userId: "1111111111", name: "x", memberRoleIds: ["555"], session: session(roles) };
}

/** A minimal Discord interaction: records what the bot sent. */
function interaction(kind: "button" | "modal" | "command", over: Record<string, unknown> = {}) {
  const sent: { content?: string; components?: unknown[]; files?: unknown[] }[] = [];
  const modals: { custom_id: string; components: unknown[] }[] = [];
  const i: Record<string, unknown> = {
    id: "222222222222222222",
    deferred: false,
    replied: false,
    customId: "sq|x",
    isChatInputCommand: () => kind === "command",
    isMessageComponent: () => kind === "button",
    isButton: () => kind === "button",
    isStringSelectMenu: () => false,
    isModalSubmit: () => kind === "modal",
    reply: async (p: never) => {
      i.replied = true;
      sent.push(p);
    },
    update: async (p: never) => sent.push(p),
    editReply: async (p: never) => sent.push(p),
    followUp: async (p: never) => sent.push(p),
    deferReply: async () => {
      i.deferred = true;
    },
    deferUpdate: async () => {
      i.deferred = true;
    },
    showModal: async (m: { toJSON: () => never }) => modals.push(m.toJSON()),
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
  purpose: "p",
  evidence_criteria: n === 1 ? "ก".repeat(107) : "ลิงก์หรือคำอธิบายสิ่งที่ทำ",
  reflection_prompt: "ตอนนี้ทำอะไรได้",
  done,
  in_flight: null,
});

const islandView = (over: Record<string, unknown> = {}) => ({
  project: { id: "p", name: "แอปจดการบ้าน", route: "software", slot: 4, stage: 2, milestones_done: [1, 2], next_milestone: 3, show_name: false, name_visible: false },
  milestones: [milestone(1, true), milestone(2, true), milestone(3)],
  taps_today: 0,
  resting: false,
  season: null,
  ...over,
});

const plot = (slot: number, name: string | null = null) => ({ slot, stage: 2, visitor: false, key: false, helper: false, lantern: false, name, mine: slot === 4 });

describe("/island", () => {
  it("still replies with the text view when the picture cannot be drawn", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const boat = SPRITES.boat;
    delete SPRITES.boat;
    try {
      const c = ctx((fn) => (fn === "shift_quest_island" ? islandView() : { plots: [plot(4, "ความลับ")] }));
      const view = await islandMessage(c);
      expect(view.files).toEqual([]);
      expect(view.content).toContain("แปลง #4");
      expect(view.content).toContain("รูปเกาะโหลดไม่ขึ้นรอบนี้");
      const ref = /อ้างอิง ([A-Z0-9]{6})/.exec(view.content)![1];
      const logged = spy.mock.calls.flat().join(" ");
      expect(logged).toContain(`ref=${ref}`);
      expect(logged).toContain("code=missing_sprite detail=boat");
      expect(logged).not.toContain("ความลับ");
    } finally {
      SPRITES.boat = boat;
      spy.mockRestore();
    }
  });

  it("numbers the caller's plot and the signs by slot, with the picture", async () => {
    const c = ctx((fn) => (fn === "shift_quest_island" ? islandView() : { plots: [plot(1, "ร้านข้าวมันไก่"), plot(4)] }));
    const view = await islandMessage(c);
    expect(view.files).toHaveLength(1);
    expect(view.content).toContain("แปลง #4");
    expect(view.content).toContain("#1 ร้านข้าวมันไก่");
  });

  it("offers a plot and how the island works when there is no project, never the old quest form", async () => {
    const c = ctx((fn) => (fn === "shift_quest_island" ? islandView({ project: null }) : { plots: [] }));
    const view = await islandMessage(c);
    const ids = JSON.stringify(view.rows.map((r) => r.toJSON()));
    expect(ids).toContain("sq|is_claim");
    expect(ids).toContain("sq|is_how");
    expect(ids).not.toContain("sq|browse");
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("is_how")!(i, c, []);
    expect(sent[0].content).toBe(I.how);
  });

  it("asks for proof once, with the evidence criteria on the form", () => {
    const short = milestoneModal(milestone(2)).toJSON() as { components: { type: number; component?: { custom_id: string } ; description?: string }[] };
    expect(short.components.map((c) => c.component?.custom_id)).toEqual(["proof", "note"]);
    expect(short.components[0].description).toBe("ลิงก์หรือคำอธิบายสิ่งที่ทำ");
    // Too long for a field description: shown in full above the fields instead of cut.
    const long = milestoneModal(milestone(1)).toJSON() as { components: { type: number; content?: string; description?: string }[] };
    expect(long.components[0].type).toBe(10);
    expect(long.components[0].content).toContain("ก".repeat(107));
    expect(long.components[1].description).toBeUndefined();
    expect(proofLink("ดูได้ที่ https://example.com/demo). ขอบคุณ")).toBe("https://example.com/demo");
    expect(proofLink("เล่าว่าเพื่อนสองคนลองแล้ว")).toBeNull();
  });

  it("says a repeat is reviewed for new learning, and promises growth only for a new milestone", async () => {
    for (const [n, expected] of [
      ["2", I.sentRepeat],
      ["3", I.sent],
    ] as const) {
      const c = ctx((fn) => (fn === "shift_quest_island" ? islandView() : { instance_id: "x" }));
      const { i, sent } = interaction("modal", { fields: fields({ proof: "https://example.com", note: "n" }) });
      await ACTION_HANDLERS.get("is_msgo")!(i, c, [n]);
      expect(sent[0].content).toBe(expected);
      expect((c.api.call as jest.Mock).mock.calls.at(-1)).toEqual(["shift_quest_milestone_submit", "1111111111", Number(n), "https://example.com", "n", "https://example.com"]);
    }
  });

  it("names the teammate who holds a milestone and leaves it out of the picker", async () => {
    const held = { ...milestone(3), in_flight: { instance_id: "i", state: "submitted", version: 1, mine: false, owner: "ฟ้า" } };
    const c = ctx((fn) => (fn === "shift_quest_island" ? islandView({ milestones: [milestone(1, true), milestone(2, true), held] }) : { plots: [plot(4)] }));
    const view = await islandMessage(c);
    expect(view.content).toContain(I.inFlightHeld("ขั้น 3", STATE.submitted, "ฟ้า"));
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("is_ms")!(i, c, []);
    const values = JSON.stringify(sent[0].components!.map((r) => (r as { toJSON: () => unknown }).toJSON()));
    expect(values).not.toContain('"value":"3"');
    expect(sent[0].content).toContain(I.heldBy("ฟ้า"));
    // Only held milestones left: no empty select (Discord refuses one), just the list and the way back.
    const onlyHeld = ctx((fn) => (fn === "shift_quest_island" ? islandView({ milestones: [held] }) : null));
    const b = interaction("button");
    await ACTION_HANDLERS.get("is_ms")!(b.i, onlyHeld, []);
    expect(b.sent[0].content).toContain(I.nothingToPick);
    expect(JSON.stringify(b.sent[0].components!.map((r) => (r as { toJSON: () => unknown }).toJSON()))).toContain("sq|is_view");
  });

  it("says there is nothing to pause when nothing is open", async () => {
    const c = ctx(() => ({ paused: 0, resumed: 0 }));
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("is_rest")!(i, c, ["on"]);
    expect(sent[0].content).toBe(I.nothingToRest);
    const c2 = ctx(() => ({ paused: 2, resumed: 0 }));
    const b = interaction("button");
    await ACTION_HANDLERS.get("is_rest")!(b.i, c2, ["on"]);
    expect(b.sent[0].content).toBe(I.rested(2));
  });
});

describe("admin", () => {
  it("keys a recognition to the command that opened the form, so a resubmit is a no-op", async () => {
    const c = ctx(() => ({ duplicate: false }), ["admin"]);
    const cmd = interaction("command", {
      id: "333333333333333333",
      options: { getUser: () => ({ id: "4444444444" }), getInteger: () => 50, getString: () => null },
    });
    await COMMAND_HANDLERS.get("admin recognize")!(cmd.i, c);
    const customId = cmd.modals[0].custom_id;
    expect(customId).toBe("sq|ad_recog|4444444444|50|333333333333333333");
    expect(customId.length).toBeLessThanOrEqual(100);
    const args = customId.split("|").slice(2);
    for (const submitId of ["900000000000000001", "900000000000000002"]) {
      const { i } = interaction("modal", { id: submitId, fields: fields({ reason: "r", category: "บทเรียนดีที่สุด" }) });
      await ACTION_HANDLERS.get("ad_recog")!(i, c, args);
    }
    const keys = (c.api.call as jest.Mock).mock.calls.map((call) => call.at(-1));
    expect(keys).toEqual(["recog:333333333333333333", "recog:333333333333333333"]);
  });

  it("keys a partial reversal to the select that opened the form", async () => {
    const c = ctx(() => ({ duplicate: false, balance: 1 }), ["admin"]);
    const entry = "3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e5f";
    const pick = interaction("button", { id: "555555555555555555", isStringSelectMenu: () => true, values: [entry] });
    await ACTION_HANDLERS.get("ad_rev")!(pick.i, c, []);
    const args = pick.modals[0].custom_id.split("|").slice(2);
    expect(args).toEqual([entry, "555555555555555555"]);
    const { i } = interaction("modal", { id: "900000000000000003", fields: fields({ amount: "5", reason: "r" }) });
    await ACTION_HANDLERS.get("ad_rev")!(i, c, args);
    expect((c.api.call as jest.Mock).mock.calls.at(-1)!.at(-1)).toBe(`${entry}:555555555555555555`);
  });

  it("reports the island in counts, never names", () => {
    const lines = renderIslandReport({
      projects_by_stage: { "2": 3, "0": 5 },
      taps_in_window: 40,
      members_resting: 2,
      unlocks_earned_in_window: 4,
      recognitions_in_window: 1,
      squads_active: 2,
      squads_forming: 1,
      season: {
        demo_day: "2027-05-15",
        goal: { count: 12, target: 30 },
        projects_at_table_bar: 6,
        projects_at_stage_bar: 3,
        projects_at_table_bar_with_pending: 8,
        projects_at_stage_bar_with_pending: 3,
        milestones_pending_review: 4,
        unlocks_earned: 9,
      },
    }).join("\n");
    expect(lines).toContain("ขั้น 0: 5 · ขั้น 2: 3");
    // squads_active counts running squads only; forming ones are their own number.
    for (const n of ["40", "ถึงเกณฑ์โต๊ะ 6", "ถึงเกณฑ์เวที 3", "12/30", "สควอดที่กำลังวิ่ง 2", "กำลังรวมคน 1"]) expect(lines).toContain(n);
    // Staff see what would qualify once pending work is confirmed, and how much is left to review.
    expect(lines).toContain("ถึงเกณฑ์โต๊ะ 6 (รวมงานที่รอพี่เลี้ยงยืนยัน 8)");
    expect(lines).toContain("ถึงเกณฑ์เวที 3 ·");
    expect(lines).toContain("รอพี่เลี้ยงยืนยัน 4 ชิ้น");
    const none = renderIslandReport({ season: { demo_day: "2027-05-15", projects_at_table_bar: 1, projects_at_table_bar_with_pending: 1, milestones_pending_review: 0 } }).join("\n");
    expect(none).not.toContain("รอพี่เลี้ยงยืนยัน");
    expect(renderIslandReport({ season: null }).join("\n")).toContain("ไม่มีที่เปิดอยู่");
    expect(renderIslandReport(undefined)).toEqual([]);
  });
});

describe("admin season", () => {
  it("passes only what the admin typed, so an edit keeps the rest, and can clear the goal", async () => {
    const calls: unknown[][] = [];
    const c = ctx((fn, ...args) => {
      calls.push([fn, ...args]);
      return { id: "3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e5f", name: "S1", status: "active", starts_on: "2027-01-01", ends_on: "2027-06-01", demo_day: "2027-05-15", table_bar: 2, stage_bar: 3, goal: null, unlocks: [] };
    }, ["admin"]);
    const opts: Record<string, unknown> = { name: "S1", goal_target: 20, clear_goal: null };
    const cmd = interaction("command", {
      options: {
        getString: (n: string) => (opts[n] as string | undefined) ?? null,
        getInteger: (n: string) => (opts[n] as number | undefined) ?? null,
        getBoolean: (n: string) => (opts[n] as boolean | undefined) ?? null,
      },
    });
    await COMMAND_HANDLERS.get("admin season")!(cmd.i, c);
    expect(calls[0]).toEqual(["shift_quest_admin_season", "1111111111", "S1", null, null, null, null, null, null, 20, null, null, false, false, null]);
    expect(cmd.sent[0].content).toContain("ยังไม่มีเป้าทั้งเกาะ");
    const required = (questCommands().find((x) => x.name === "admin")!.options as { name: string; options?: { name: string; required?: boolean }[] }[])
      .find((o) => o.name === "season")!
      .options!.filter((o) => o.required)
      .map((o) => o.name);
    expect(required).toEqual(["name"]);
  });
});

describe("squads", () => {
  const view = (over: Record<string, unknown> = {}) => ({
    id: "s",
    name: "Sprint Crew",
    target: "Ship it",
    starts_on: "2027-01-01",
    ends_on: "2027-01-14",
    days_left: 5,
    phase: "running",
    running: true,
    members_active: 3,
    milestones_gained: 2,
    members: [
      { name: "A", me: true },
      { name: "B", me: false },
      { name: "C", me: false },
    ],
    ...over,
  });

  it("shows one group number once running, never a number per member", () => {
    const text = squadLines(view() as never).join("\n");
    expect(text).toContain(SQ.together(2)); // the database's own total, never 4 (a shared project counts once)
    expect(text).toContain("• A (คุณ)");
    expect(text).not.toMatch(/\+\d+ ขั้น/);
  });

  it("says a squad of fewer than 3 is still forming, with no progress number", () => {
    const text = squadLines(view({ phase: "forming", running: false, members_active: 2, milestones_gained: null }) as never).join("\n");
    expect(text).toContain(SQ.forming(2));
    expect(text).not.toMatch(/โตไปแล้ว|\d+ ขั้นในรอบนี้/);
  });

  it("answers a friendly not-open-yet while the squads switch is off, before any database call", async () => {
    for (const key of ["squad new", "squad invite", "squad withdraw", "squad view"]) {
      const c = ctx(() => []);
      c.session.settings.squads = false;
      const { i } = interaction("command");
      await expect(COMMAND_HANDLERS.get(key)!(i, c)).rejects.toThrow(SQ.notOpen);
      expect(c.api.call).not.toHaveBeenCalled();
    }
    const c = ctx(() => []);
    delete c.session.settings.squads; // an older database without the switch
    await expect(ACTION_HANDLERS.get("squad_rsvp")!(interaction("button").i, c, ["3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e5f", "y"])).rejects.toThrow(SQ.notOpen);
    expect(c.api.call).not.toHaveBeenCalled();
    expect(errorText("squads_off")).not.toBe(T.generic);
  });

  it("lets /admin feature switch squads", () => {
    const feature = (questCommands().find((x) => x.name === "admin")!.options as { name: string; options?: { name: string; choices?: { value: string }[] }[] }[])
      .find((o) => o.name === "feature")!
      .options!.find((o) => o.name === "name")!;
    expect(feature.choices!.map((c) => c.value)).toContain("squads");
  });

  it("keeps staff out of every squad action before any database call", async () => {
    for (const key of ["squad new", "squad invite", "squad withdraw", "squad view"]) {
      const c = ctx(() => [], ["reviewer"]);
      const { i } = interaction("command");
      await expect(COMMAND_HANDLERS.get(key)!(i, c)).rejects.toThrow(errorText("staff_no_squad"));
      expect(c.api.call).not.toHaveBeenCalled();
    }
    const c = ctx(() => [], ["admin"]);
    await expect(ACTION_HANDLERS.get("squad_rsvp")!(interaction("button").i, c, ["3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e5f", "y"])).rejects.toThrow();
    expect(c.api.call).not.toHaveBeenCalled();
  });

  it("withdraws an invite from the current squad by Discord ID", async () => {
    const c = ctx((fn) =>
      fn === "shift_quest_squad_mine" ? [{ id: "sq1", name: "S", status: "active", starts_on: "", ends_on: "", phase: "forming", running: false }] : null
    );
    const { i, sent } = interaction("command", { options: { getUser: () => ({ id: "4444444444" }) } });
    await COMMAND_HANDLERS.get("squad withdraw")!(i, c);
    expect((c.api.call as jest.Mock).mock.calls.at(-1)).toEqual(["shift_quest_squad_withdraw", "1111111111", "sq1", "4444444444"]);
    expect(sent[0].content).toBe(SQ.withdrawn("<@4444444444>"));
  });
});

describe("startup schema check", () => {
  const api = (result: () => unknown) => ({ call: jest.fn(async () => result()), rows: jest.fn() }) as unknown as QuestApi;

  it("accepts the schema this bot needs, or a newer one", async () => {
    await expect(checkQuestSchema(api(() => REQUIRED_SCHEMA))).resolves.toBe(REQUIRED_SCHEMA);
    await expect(checkQuestSchema(api(() => REQUIRED_SCHEMA + 1))).resolves.toBe(REQUIRED_SCHEMA + 1);
  });

  it("refuses an older database with a message that says what to apply", async () => {
    await expect(checkQuestSchema(api(() => 1))).rejects.toThrow(/needs quest database schema 2, but the database has 1.*20261111090800_shift_quests_seasons/);
    // No version function at all: not even the island core is applied.
    await expect(
      checkQuestSchema(
        api(() => {
          throw new QuestDbError("shift_quest_schema_version", "42883");
        })
      )
    ).rejects.toThrow(/the database has 0/);
    await expect(
      checkQuestSchema(
        api(() => {
          throw new QuestDbError("shift_quest_schema_version", "28P01");
        })
      )
    ).rejects.toThrow(/could not read the quest database schema version \(SQLSTATE 28P01\)/);
  });
});

describe("coins", () => {
  it("names recognitions and season unlocks, never a raw key", () => {
    expect(ledgerReason("recognition", "recognition", null)).toBe("คำชมจากทีมพี่เลี้ยง");
    expect(ledgerReason("recognition", "recognition", null, "บทเรียนดีที่สุด")).toBe("คำชมจากทีมพี่เลี้ยง: บทเรียนดีที่สุด");
    expect(ledgerReason("award", "season_unlock", null)).toBe("ปลดล็อกของซีซัน");
    expect(ledgerReason("award", "quest", "แอป")).toBe("ได้จากเควสต์: แอป");
    expect(ledgerReason("mystery_kind", "mystery_kind", null)).not.toContain("mystery");
  });
});

describe("error replies", () => {
  it("carry a short reference that matches one log line, without student text", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const a = interaction("button", { customId: "sq|is_ms" });
      const ref = await showError(a.i, new QuestError("not_found", "student text here", "shift_quest_island"));
      expect(a.sent[0].content).toContain(`อ้างอิง ${ref}`);
      expect(ref).toMatch(/^[A-Z2-9]{6}$/);
      const line = warn.mock.calls.flat().join(" ");
      expect(line).toContain(`ref=${ref} action=is_ms fn=shift_quest_island code=sq:not_found`);
      expect(line).not.toContain("student text");

      // A code with no Thai words yet shows the code itself.
      const b = interaction("button");
      await showError(b.i, new QuestError("brand_new_code"));
      expect(b.sent[0].content).toContain(T.generic);
      expect(b.sent[0].content).toContain("sq:brand_new_code");

      const c = interaction("button");
      const ref2 = await showError(c.i, new QuestDbError("shift_quest_submit", "23514"));
      expect(error.mock.calls.flat().join(" ")).toContain(`ref=${ref2} action=x fn=shift_quest_submit code=sqlstate:23514`);
      expect(c.sent[0].content).toContain(`อ้างอิง ${ref2}`);
    } finally {
      warn.mockRestore();
      error.mockRestore();
    }
  });
});

describe("copy points only at registered commands", () => {
  /** Every "/word" a student or admin could be told to type, from string literals (comment lines skipped). */
  function slashCommands(file: string): string[] {
    const code = fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n");
    // "/word" not followed by ":" (that is a URL scheme in a regex, not a command).
    return [...code.matchAll(/(?:^|[\s"'`(])\/([a-z][a-z-]*)(?![a-z:-])/g)].map((m) => m[1]);
  }

  it("names no command Discord does not have", () => {
    const registered = new Set(questCommands().map((c) => c.name));
    const files = [
      path.join(QUEST_SRC, "copy.ts"),
      path.join(QUEST_SRC, "island", "copy.ts"),
      ...fs.readdirSync(path.join(QUEST_SRC, "handlers")).map((f) => path.join(QUEST_SRC, "handlers", f)),
    ];
    let seen = 0;
    for (const file of files) {
      for (const name of slashCommands(file)) {
        seen++;
        expect([path.basename(file), name, registered.has(name)]).toEqual([path.basename(file), name, true]);
      }
    }
    expect(seen).toBeGreaterThan(20);
  });

  it("sends notices to /island, never /quest or /progress", () => {
    for (const kind of ["review_approved", "review_clarification", "review_declined"]) {
      const text = renderInbox(kind, { title: "t", feedback: "f" });
      expect([kind, /\/(quest|progress)\b/.test(text)]).toEqual([kind, false]);
    }
    expect(T.statusEmpty).toContain("/island");
    expect(T.alreadyTaken).toContain("/island");
  });

  it("shows the recognition's reason to the student", () => {
    const text = renderInbox("recognized", { category: "บทเรียนดีที่สุด", amount: 0, reason: "เปลี่ยนการทดสอบที่ล้มเป็นก้าวต่อไปที่ชัด" });
    expect(text).toBe("🌟 ทีมพี่เลี้ยงชื่นชมงานของคุณ (บทเรียนดีที่สุด): เปลี่ยนการทดสอบที่ล้มเป็นก้าวต่อไปที่ชัด");
    expect(renderInbox("recognized", { amount: 10 })).toBe("🌟 ทีมพี่เลี้ยงชื่นชมงานของคุณ พร้อม 10 Passioncoin");
  });

  it("never tells a student an adult will collect an address privately", () => {
    const text = T.rewardsPreview("ของ", 10, 20);
    expect(text).toContain("ผู้ปกครอง");
    expect(text).not.toContain("ช่องทางส่วนตัว");
  });
});
