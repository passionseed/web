/**
 * @jest-environment node
 *
 * Quest and journal screens as Components V2 cards: what a student sees,
 * which buttons they get (same custom IDs as before), and that every card
 * fits Discord's limits and pings nobody.
 */
import { MessageFlags } from "discord.js";

import { ACTION_HANDLERS, COMMAND_HANDLERS } from "..";
import type { Quest, QuestApi, Session, Template } from "../api";
import type { Ctx } from "../context";
import { STATE, T } from "../copy";
import { I } from "../island/copy";
import { LIMITS, TONE_COLORS } from "../ui";
import { accentColor, bodyText, cardsOf, componentCount, customIds, textLength, viewText } from "../test-helpers/view";

const USER = "1111111111";
const QID = "3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e5f";
const TID = "0a1b2c3d-1d2b-4c3d-9e8f-3f1c2a644e5f";
const EID = "9e8f0a1b-1d2b-4c3d-9e8f-3f1c2a644e5f";

type Sent = { content?: string | null; components?: unknown[]; files?: unknown[]; flags?: number; allowedMentions?: unknown };
type Json = { type?: number; custom_id?: string; disabled?: boolean; label?: string; options?: { value: string }[]; components?: Json[]; accessory?: Json };

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

function ctx(call: (fn: string, ...args: unknown[]) => unknown, s: Session = session()): Ctx {
  const api = { call: jest.fn(async (fn: string, ...args: unknown[]) => call(fn, ...args)), rows: jest.fn() };
  return { api: api as unknown as QuestApi, userId: USER, name: "x", memberRoleIds: ["555"], session: s };
}

const calls = (c: Ctx) => (c.api.call as jest.Mock).mock.calls as unknown[][];

/** A minimal Discord interaction that records what the bot sent and how. */
function interaction(kind: "button" | "select" | "modal" | "command", over: Record<string, unknown> = {}) {
  const sent: Sent[] = [];
  const how: string[] = [];
  const modals: { custom_id: string }[] = [];
  const record = (name: string) => async (p: Sent) => {
    how.push(name);
    sent.push(p);
  };
  const i: Record<string, unknown> = {
    id: "222222222222222222",
    deferred: false,
    replied: false,
    customId: "sq|x",
    isChatInputCommand: () => kind === "command",
    isMessageComponent: () => kind === "button" || kind === "select",
    isButton: () => kind === "button",
    isStringSelectMenu: () => kind === "select",
    isModalSubmit: () => kind === "modal",
    reply: async (p: Sent) => {
      i.replied = true;
      await record("reply")(p);
    },
    update: record("update"),
    editReply: record("editReply"),
    followUp: record("followUp"),
    showModal: async (m: { toJSON: () => never }) => modals.push(m.toJSON()),
    ...over,
  };
  return { i: i as never, sent, how, modals };
}

function fields(values: Record<string, string>, users: string[] = []) {
  return {
    getTextInputValue: (id: string) => {
      if (!(id in values)) throw new Error("no field");
      return values[id];
    },
    getSelectedUsers: () => new Map(users.map((u) => [u, {}])),
    getStringSelectValues: (id: string) => (values[id] ? [values[id]] : []),
  };
}

/** Every button and select in a card, as JSON. */
function controls(p: Sent): Json[] {
  const out: Json[] = [];
  const walk = (c: Json) => {
    if (c.type === 2 || c.type === 3) out.push(c);
    for (const child of c.components ?? []) walk(child);
    if (c.accessory) walk(c.accessory);
  };
  for (const card of cardsOf(p)) walk(card as Json);
  return out;
}

const byId = (p: Sent, id: string) => controls(p).find((c) => c.custom_id === id);

/** One V2 card, inside Discord's limits, pinging nobody; private unless it edits a message. */
function expectCard(p: Sent, how: string) {
  expect(p.flags! & MessageFlags.IsComponentsV2).toBeTruthy();
  expect(Boolean(p.flags! & MessageFlags.Ephemeral)).toBe(how === "reply" || how === "followUp");
  expect(p.content ?? undefined).toBeUndefined();
  expect(p.allowedMentions).toEqual({ parse: [] });
  expect(cardsOf(p)).toHaveLength(1);
  expect(componentCount(p)).toBeLessThanOrEqual(LIMITS.components);
  expect(textLength(p)).toBeLessThanOrEqual(LIMITS.text);
}

const quest = (over: Partial<Quest> = {}): Quest => ({
  id: QID,
  title: "แอป **จด** การบ้าน",
  state: "active",
  version: 3,
  goal: "ให้เพื่อน 3 คนลองใช้",
  why: null,
  next_step: "ทำหน้าแรก",
  criteria: "คลิปเพื่อนลองใช้",
  review_date: "2026-12-01",
  overdue: false,
  proposed: false,
  reward_agreed: false,
  reward: null,
  award_status: null,
  award_note: null,
  project_id: "p",
  reflection_prompt: "ได้เรียนรู้อะไร",
  latest_submission: null,
  latest_review: null,
  ...over,
});

const template = (over: Partial<Template> = {}): Template => ({
  id: TID,
  slug: "first-users",
  title: "ผู้ใช้คนแรก",
  purpose: "ให้คนจริงลองใช้ของที่คุณทำ",
  routes: "เส้นทางแบบซอฟต์แวร์หรือบริการ",
  examples: "ตัวอย่างแอปจดการบ้าน",
  evidence_criteria: "คลิปหรือสรุปสั้นๆ",
  reflection_prompt: "คนลองแล้วคุณเห็นอะไร",
  support_options: "ถามพี่เลี้ยงในห้อง help",
  repeatable: false,
  milestone: null,
  reward: null,
  taken: false,
  ...over,
});

describe("quest cards", () => {
  it("shows one quest: state, what was agreed, coins as fine print, the same buttons and a way back", async () => {
    const c = ctx((fn) => (fn === "shift_quest_my_quests" ? [quest()] : null));
    const { i, sent, how } = interaction("select", { values: [QID] });
    await ACTION_HANDLERS.get("q")!(i, c, []);
    expect(calls(c)).toEqual([["shift_quest_my_quests", USER, true]]);
    expectCard(sent[0], how[0]);
    const body = bodyText(sent[0]);
    // Student text is escaped, even in the heading.
    expect(body.startsWith("### 📋 แอป \\*\\*จด\\*\\* การบ้าน\n")).toBe(true);
    expect(body).toContain(`🔨 **${STATE.active}** · ${T.questReviewOn("")}`);
    for (const text of [`**${T.questGoal}** ให้เพื่อน 3 คนลองใช้`, `**${T.questNext}** ทำหน้าแรก`, `**${T.questCriteria}** คลิปเพื่อนลองใช้`]) {
      expect(body).toContain(text);
    }
    expect(body).toContain(`-# 🪙 ${T.rewardNone}`);
    expect(customIds(sent[0])).toEqual([
      `sq|qa|submit|${QID}|3`,
      `sq|qa|resize|${QID}|3`,
      `sq|qa|help|${QID}|3`,
      `sq|qa|pause|${QID}|3`,
      `sq|qa|archive|${QID}|3`,
      "sq|is_view",
    ]);
    expect(accentColor(sent[0])).toBe(TONE_COLORS.island);
  });

  it("puts the reviewer's words first, quoted, when they are waiting on the student", async () => {
    const c = ctx(() => [quest({ state: "clarification", overdue: true, latest_review: { outcome: "clarification", feedback: "เพิ่มคลิป\nอีกนิด", created_at: "" } })]);
    const { i, sent } = interaction("select", { values: [QID] });
    await ACTION_HANDLERS.get("q")!(i, c, []);
    const body = bodyText(sent[0]);
    expect(body).toContain(`💬 **${STATE.clarification}**`);
    expect(body).toContain(`**${T.questFeedback}**\n> เพิ่มคลิป\n> อีกนิด`);
    expect(body.indexOf("เพิ่มคลิป")).toBeLessThan(body.indexOf(T.questGoal));
    expect(body).toContain(`⏰ ${T.overdue}`);
    expect(accentColor(sent[0])).toBe(TONE_COLORS.warn);
  });

  it("confirms a pause on the same card after the same database call", async () => {
    const c = ctx((fn) => (fn === "shift_quest_my_quests" ? [quest({ state: "paused" })] : null));
    const { i, sent, how } = interaction("button");
    await ACTION_HANDLERS.get("qa")!(i, c, ["pause", QID, "3"]);
    expect(calls(c)[0]).toEqual(["shift_quest_set_state", USER, QID, 3, "pause"]);
    expect(how).toEqual(["update"]);
    expectCard(sent[0], how[0]);
    expect(bodyText(sent[0])).toContain(`✅ ${T.paused}`);
    expect(customIds(sent[0])).toEqual([`sq|qa|resume|${QID}|3`, `sq|qa|resize|${QID}|3`, `sq|qa|archive|${QID}|3`, "sq|is_view"]);
  });

  it("previews a submission before anything is written, then sends it with the same arguments", async () => {
    const c = ctx((fn) => (fn === "shift_quest_my_quests" ? [quest()] : fn === "shift_quest_submit" ? { revision: 2 } : null));
    const form = interaction("modal", {
      fields: fields({ evidence: "**ทำแล้ว** @everyone", reflection: "ได้รู้ว่า", artifact: "https://example.com/demo", part: "หน้าแรก" }, ["4444444444", USER]),
    });
    await ACTION_HANDLERS.get("qa")!(form.i, c, ["submit", QID, "3"]);
    expect(calls(c).map((call) => call[0])).toEqual(["shift_quest_my_quests"]);
    const preview = form.sent[0];
    expectCard(preview, form.how[0]);
    const text = viewText(preview);
    expect(bodyText(preview).startsWith(`### ${T.submitPreview}\n`)).toBe(true);
    for (const part of [T.notSentYet, "\\*\\*ทำแล้ว\\*\\* @​everyone", "https://example.com/demo", "<@4444444444>", T.previewTeammatesNote, T.visibility]) {
      expect(text).toContain(part);
    }
    expect(text).not.toContain(`<@${USER}>`);
    const [reviewers, team, cancel] = customIds(preview);
    const key = reviewers.split("|")[2];
    expect([reviewers, team, cancel]).toEqual([`sq|sub_go|${key}|reviewers`, `sq|sub_go|${key}|team`, `sq|sub_no|${key}`]);
    expect(byId(preview, team)!.disabled).toBeFalsy();

    const go = interaction("button");
    await ACTION_HANDLERS.get("sub_go")!(go.i, c, [key, "team"]);
    expect(calls(c).at(-1)).toEqual([
      "shift_quest_submit",
      USER,
      QID,
      3,
      "**ทำแล้ว** @everyone",
      "ได้รู้ว่า",
      "https://example.com/demo",
      "team",
      "หน้าแรก",
      ["4444444444"],
    ]);
    expectCard(go.sent[0], go.how[0]);
    expect(go.how).toEqual(["update"]);
    expect(bodyText(go.sent[0])).toContain(T.submitted(2));
    expect(viewText(go.sent[0])).toContain(T.submittedNote);
    expect(accentColor(go.sent[0])).toBe(TONE_COLORS.success);

    // The draft is gone: a second press says so instead of sending twice.
    const again = interaction("button");
    await ACTION_HANDLERS.get("sub_go")!(again.i, c, [key, "team"]);
    expect(calls(c).filter((call) => call[0] === "shift_quest_submit")).toHaveLength(1);
    expect(bodyText(again.sent[0])).toBe(T.previewExpired);
    expect(customIds(again.sent[0])).toEqual(["sq|is_work", "sq|is_view"]);
    expect(accentColor(again.sent[0])).toBe(TONE_COLORS.warn);
  });

  it("offers the team choice only for a project quest", async () => {
    const c = ctx(() => [quest({ project_id: null })]);
    const form = interaction("modal", { fields: fields({ evidence: "e", reflection: "r" }) });
    await ACTION_HANDLERS.get("qa")!(form.i, c, ["submit", QID, "3"]);
    const team = customIds(form.sent[0])[1];
    expect(team).toMatch(/\|team$/);
    expect(byId(form.sent[0], team)!.disabled).toBe(true);
  });

  it("lists quests by state, the first five by name and every one in the select", async () => {
    const quests = Array.from({ length: 7 }, (_, n) => quest({ id: `${n}`, title: `งาน ${n}`, state: n === 0 ? "clarification" : "active", overdue: n === 1 }));
    const c = ctx(() => quests);
    const { i, sent, how } = interaction("command", { options: { getBoolean: () => true } });
    await COMMAND_HANDLERS.get("quest status")!(i, c);
    expect(calls(c)).toEqual([["shift_quest_my_quests", USER, true]]);
    expectCard(sent[0], how[0]);
    const body = bodyText(sent[0]);
    expect(body).toContain(`### ${I.btnWork}`);
    expect(body).toContain(`💬 **งาน 0** · ${STATE.clarification}`);
    expect(body).toContain("**งาน 1** · กำลังทำ · ⏰");
    expect(body).not.toContain("งาน 5");
    expect(body).toContain(`-# ${I.more(2)}`);
    expect(customIds(sent[0])).toEqual(["sq|q", "sq|is_view"]);
    expect(controls(sent[0])[0].options).toHaveLength(7);
  });

  it("says so when there is no quest, with the way back", async () => {
    const c = ctx(() => []);
    const { i, sent } = interaction("command", { options: { getBoolean: () => null } });
    await COMMAND_HANDLERS.get("quest status")!(i, c);
    expect(viewText(sent[0])).toContain(T.statusEmpty);
    expect(customIds(sent[0])).toEqual(["sq|is_view"]);
  });

  it("keeps a template's routes and examples behind ℹ️, a registered read-only action", async () => {
    const c = ctx(() => [template({ taken: true })]);
    const pick = interaction("select", { values: [TID] });
    await ACTION_HANDLERS.get("tpl")!(pick.i, c, []);
    expectCard(pick.sent[0], pick.how[0]);
    const card = viewText(pick.sent[0]);
    for (const part of ["ให้คนจริงลองใช้ของที่คุณทำ", `**${T.tplEvidence}** คลิปหรือสรุปสั้นๆ`, T.alreadyTaken]) expect(card).toContain(part);
    expect(card).not.toContain("เส้นทางแบบซอฟต์แวร์");
    expect(customIds(pick.sent[0])).toEqual([`sq|tpl_choose|${TID}`, `sq|tpl_more|${TID}`, "sq|browse"]);
    // Taken and not repeatable: choosing is off, as before.
    expect(byId(pick.sent[0], `sq|tpl_choose|${TID}`)!.disabled).toBe(true);

    expect(ACTION_HANDLERS.has("tpl_more")).toBe(true);
    const more = interaction("button");
    await ACTION_HANDLERS.get("tpl_more")!(more.i, c, [TID]);
    expect(calls(c).every((call) => call[0] === "shift_quest_templates")).toBe(true);
    expectCard(more.sent[0], more.how[0]);
    expect(more.how).toEqual(["update"]);
    const details = viewText(more.sent[0]);
    for (const part of ["เส้นทางแบบซอฟต์แวร์หรือบริการ", "ตัวอย่างแอปจดการบ้าน", "คนลองแล้วคุณเห็นอะไร", "ถามพี่เลี้ยงในห้อง help"]) {
      expect(details).toContain(part);
    }
    expect(customIds(more.sent[0])).toEqual([`sq|tpl_choose|${TID}`, `sq|tpl|${TID}`]);

    // Its back button reopens the template through the existing action.
    const back = interaction("button");
    await ACTION_HANDLERS.get("tpl")!(back.i, c, [TID]);
    expect(customIds(back.sent[0])[1]).toBe(`sq|tpl_more|${TID}`);

    // A forged ID reads nothing.
    const forged = ctx(() => [template()]);
    await ACTION_HANDLERS.get("tpl_more")!(interaction("button").i, forged, ["not-a-uuid"]);
    expect(forged.api.call).not.toHaveBeenCalled();
  });

  it("names the first five templates and keeps every one in the select", async () => {
    const templates = Array.from({ length: 7 }, (_, n) => template({ id: `t${n}`, title: `เควสต์ ${n}` }));
    const c = ctx(() => templates);
    const { i, sent, how } = interaction("button");
    await ACTION_HANDLERS.get("browse")!(i, c, []);
    expectCard(sent[0], how[0]);
    const body = bodyText(sent[0]);
    expect(body).toContain(`### ${T.browseTitle}\n${T.browseIntro}`);
    expect(body).toContain("• **เควสต์ 4**");
    expect(body).not.toContain("เควสต์ 5");
    expect(body).toContain(`-# ${I.more(2)}`);
    expect(controls(sent[0])[0].options).toHaveLength(7);
    expect(customIds(sent[0])).toEqual(["sq|tpl", "sq|is_view"]);
  });

  it("confirms a chosen or proposed quest in a short toast with the next useful buttons", async () => {
    const c = ctx((fn) => (fn === "shift_quest_templates" ? [template()] : null));
    const choose = interaction("modal", { fields: fields({ goal: "g", next: "n", criteria: "c", date: "2026-12-01" }) });
    await ACTION_HANDLERS.get("tpl_choose")!(choose.i, c, [TID]);
    expect(calls(c).at(-1)).toEqual(["shift_quest_choose", USER, TID, "g", "n", "c", "2026-12-01"]);
    expectCard(choose.sent[0], choose.how[0]);
    expect(bodyText(choose.sent[0])).toBe(`### ${T.chosenTitle}\n**ผู้ใช้คนแรก**\n-# ${T.chosenNote}`);
    expect(customIds(choose.sent[0])).toEqual(["sq|is_work", "sq|is_view"]);

    const propose = interaction("modal", { fields: fields({ title: "t", why: "w", goal: "g", criteria: "c", next: "n" }) });
    await ACTION_HANDLERS.get("propose")!(propose.i, c, []);
    expect(calls(c).at(-1)).toEqual(["shift_quest_propose", USER, "t", "w", "g", "c", "n"]);
    expect(bodyText(propose.sent[0])).toBe(`### ${T.proposedTitle}\n${T.proposed}\n-# ${T.proposedCoins}`);
    expect(accentColor(propose.sent[0])).toBe(TONE_COLORS.success);
  });

  it("confirms a resize or an appeal with a way back to the quest", async () => {
    const c = ctx(() => null);
    const resize = interaction("modal", { fields: fields({ goal: "g", next: "n", criteria: "c", date: "-" }) });
    await ACTION_HANDLERS.get("qa")!(resize.i, c, ["resize", QID, "3"]);
    expect(calls(c).at(-1)).toEqual(["shift_quest_update", USER, QID, 3, "g", "n", "c", null, true]);
    expect(bodyText(resize.sent[0])).toBe(`### ✅ ${T.updated}`);
    expect(customIds(resize.sent[0])).toEqual([`sq|q|${QID}`, "sq|is_view"]);

    const appeal = interaction("modal", { fields: fields({ reason: "ดูคลิปอีกที" }) });
    await ACTION_HANDLERS.get("qa")!(appeal.i, c, ["appeal", QID, "3"]);
    expect(calls(c).at(-1)).toEqual(["shift_quest_appeal", USER, QID, "ดูคลิปอีกที"]);
    expect(bodyText(appeal.sent[0])).toBe(`### ${T.appealedTitle}\n${T.appealed}`);

    // The "📋 ดูเควสต์" button opens the quest through the existing q action.
    const open = ctx(() => [quest({ state: "appealed" })]);
    const view = interaction("button");
    await ACTION_HANDLERS.get("q")!(view.i, open, [QID]);
    expect(bodyText(view.sent[0])).toContain(`⚖️ **${STATE.appealed}**`);
    expect(customIds(view.sent[0])).toEqual(["sq|is_view"]);
  });
});

describe("journal cards", () => {
  const entry = (n: number, over: Record<string, unknown> = {}) => ({
    id: `${n}`,
    author: "ฟ้า",
    own: true,
    changed: `เปลี่ยน ${n}`,
    learned: n === 0 ? "ได้รู้ **ว่า**" : null,
    next_step: null,
    blocker: n === 0 ? "ติด API" : null,
    artifact_url: null,
    visibility: n === 0 ? "team" : "private",
    version: 1,
    created_at: "2026-11-10T03:00:00Z",
    ...over,
  });

  it("shows the newest five entries in two lines each, with who can see each one", async () => {
    const c = ctx(() => Array.from({ length: 8 }, (_, n) => entry(n)));
    const { i, sent, how } = interaction("command", { options: { getBoolean: () => false } });
    await COMMAND_HANDLERS.get("progress view")!(i, c);
    expect(calls(c)).toEqual([["shift_quest_progress_list", USER, null, 8]]);
    expectCard(sent[0], how[0]);
    const body = bodyText(sent[0]);
    expect(body).toContain(`### ${T.progressMineTitle}\n👥 **`);
    expect(body).toContain(`· เปลี่ยน 0\n-# ${T.entryLearned}: ได้รู้ \\*\\*ว่า\\*\\* · ${T.entryBlocker}: ติด API`);
    expect(body).toContain("🔒 **");
    expect(body).toContain("เปลี่ยน 4");
    expect(body).not.toContain("เปลี่ยน 5");
    expect(body).toContain(`-# ${T.progressLatest(5)} · ${T.progressLegend}`);
    expect(customIds(sent[0])).toEqual(["sq|is_view"]);
  });

  it("stays inside Discord's limits with five entries at their longest", async () => {
    const long = "ก".repeat(1000);
    const c = ctx(() =>
      Array.from({ length: 8 }, (_, n) => entry(n, { changed: long, learned: long, next_step: long, blocker: long, artifact_url: `https://x.dev/${"a".repeat(480)}` }))
    );
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const { i, sent, how } = interaction("command", { options: { getBoolean: () => false } });
      await COMMAND_HANDLERS.get("progress view")!(i, c);
      expectCard(sent[0], how[0]);
      // Short enough that nothing had to be trimmed.
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("hides another member's blocker in the own view and shows authors in the team view", async () => {
    const own = ctx(() => [entry(0, { own: false })]);
    const a = interaction("command", { options: { getBoolean: () => false } });
    await COMMAND_HANDLERS.get("progress view")!(a.i, own);
    expect(viewText(a.sent[0])).not.toContain("ติด API");

    const team = ctx(() => [entry(0, { own: false })]);
    const b = interaction("command", { options: { getBoolean: () => true } });
    await COMMAND_HANDLERS.get("progress view")!(b.i, team);
    expect(calls(team)).toEqual([["shift_quest_progress_list", USER, "p", 8]]);
    const text = bodyText(b.sent[0]);
    expect(text).toContain(`### ${T.progressTeamTitle}`);
    expect(text).toContain("ฟ้า");
    expect(text).toContain("ติด API");
    expect(text).not.toContain(T.progressLegend);
  });

  it("offers the note button on an empty journal only with a project", async () => {
    const withProject = interaction("command", { options: { getBoolean: () => false } });
    await COMMAND_HANDLERS.get("progress view")!(withProject.i, ctx(() => []));
    expect(bodyText(withProject.sent[0])).toBe(`### ${T.progressMineTitle}\n${T.progressEmpty}`);
    expect(customIds(withProject.sent[0])).toEqual(["sq|is_note", "sq|is_view"]);

    const without = interaction("command", { options: { getBoolean: () => false } });
    await COMMAND_HANDLERS.get("progress view")!(without.i, ctx(() => [], session({ current_project_id: null })));
    expect(customIds(without.sent[0])).toEqual(["sq|is_view"]);

    // The team view without a project: claim a plot, before any database call.
    const noTeam = ctx(() => [], session({ current_project_id: null }));
    const t = interaction("command", { options: { getBoolean: () => true } });
    await COMMAND_HANDLERS.get("progress view")!(t.i, noTeam);
    expect(noTeam.api.call).not.toHaveBeenCalled();
    expect(viewText(t.sent[0])).toContain(T.projectNone);
    expect(customIds(t.sent[0])).toEqual(["sq|is_claim", "sq|is_view"]);
  });

  it("picks an entry to edit from a select, with the same custom ID", async () => {
    const c = ctx(() => [entry(0, { id: EID })]);
    const { i, sent, how } = interaction("command");
    await COMMAND_HANDLERS.get("progress edit")!(i, c);
    expect(calls(c)).toEqual([["shift_quest_progress_list", USER, null, 25]]);
    expectCard(sent[0], how[0]);
    expect(bodyText(sent[0])).toBe(`### ${T.progressEditTitle}`);
    expect(customIds(sent[0])).toEqual(["sq|prog_pick", "sq|is_view"]);
    expect(controls(sent[0])[0].options!.map((o) => o.value)).toEqual([EID]);
  });

  it("saves a note privately and offers sharing, the blocker, and the way back", async () => {
    const c = ctx(() => EID, session({ current_project_id: null }));
    const { i, sent, how } = interaction("modal", { fields: fields({ changed: "ทำหน้าแรก", blocker: "ติด API" }) });
    await ACTION_HANDLERS.get("prog_add")!(i, c, []);
    expect(calls(c)[0]).toEqual(["shift_quest_progress_add", USER, "ทำหน้าแรก", null, null, "ติด API", null, "private", null]);
    expectCard(sent[0], how[0]);
    expect(bodyText(sent[0])).toBe(`### ${T.progressSavedTitle}\n${T.progressSaved}`);
    expect(customIds(sent[0])).toEqual([`sq|prog_vis|${EID}|team`, `sq|prog_help|${EID}`, "sq|is_view"]);
    // No project: nobody to share with.
    expect(byId(sent[0], `sq|prog_vis|${EID}|team`)!.disabled).toBe(true);
  });

  it("starts and ends a session with short cards; the note button only with a project", async () => {
    const start = ctx(() => null);
    const s = interaction("command", { options: { getString: () => "ทำหน้า **login**", getBoolean: () => null } });
    await COMMAND_HANDLERS.get("work start")!(s.i, start);
    expect(calls(start)).toEqual([["shift_quest_work_start", USER, "ทำหน้า **login**"]]);
    expectCard(s.sent[0], s.how[0]);
    expect(bodyText(s.sent[0])).toBe(`### ${T.workStartedTitle}\n**ทำหน้า \\*\\*login\\*\\***\n-# ${T.workStarted}`);

    const end = ctx(() => ({ intention: "ทำหน้า login" }));
    const e = interaction("command", { options: { getString: () => "ได้ปุ่มแล้ว" } });
    await COMMAND_HANDLERS.get("work end")!(e.i, end);
    expect(calls(end)).toEqual([["shift_quest_work_end", USER, "ได้ปุ่มแล้ว"]]);
    expect(bodyText(e.sent[0])).toBe(`### ${T.workEndedTitle}\n**ทำหน้า login**\n-# ${T.workEndedNote}`);
    expect(customIds(e.sent[0])).toEqual(["sq|is_note", "sq|is_view"]);

    const alone = ctx(() => ({ intention: "x" }), session({ current_project_id: null }));
    const n = interaction("command", { options: { getString: () => null } });
    await COMMAND_HANDLERS.get("work end")!(n.i, alone);
    expect(viewText(n.sent[0])).not.toContain(T.workEndedNote);
    expect(customIds(n.sent[0])).toEqual(["sq|is_view"]);
  });

  it("previews a shared intention, quoted, with posting off while sharing is paused", async () => {
    const c = ctx((fn) =>
      fn === "shift_quest_share_create"
        ? EID
        : fn === "shift_quest_share_get"
          ? { id: EID, kind: "intention", body: "ทำหน้า login", status: "draft", author: "ฟ้า", peer: null, title: null }
          : null
    );
    const s = interaction("command", { options: { getString: () => "ทำหน้า login", getBoolean: () => true } });
    await COMMAND_HANDLERS.get("work start")!(s.i, c);
    expect(s.how).toEqual(["reply", "followUp"]);
    const preview = s.sent[1];
    expectCard(preview, s.how[1]);
    expect(bodyText(preview)).toBe(`### ${T.sharePreview}\n> 🔨 ฟ้า กำลังทำ: ทำหน้า login\n-# ${T.notPostedYet}\n-# ${T.sharePaused}`);
    expect(customIds(preview)).toEqual([`sq|share_go|${EID}`, `sq|share_no|${EID}`]);
    expect(byId(preview, `sq|share_go|${EID}`)!.disabled).toBe(true);
  });

  it("says a thank-you posts only once the friend accepts, and confirms in place", async () => {
    const c = ctx(
      (fn) =>
        fn === "shift_quest_share_create"
          ? EID
          : fn === "shift_quest_share_get"
            ? { id: EID, kind: "recognition", body: "ช่วยแก้บั๊ก\n@everyone", status: "draft", author: "ฟ้า", peer: "ดิน", title: null }
            : "awaiting_peer",
      session({}, { sharing: true })
    );
    const form = interaction("modal", { fields: fields({ body: "ช่วยแก้บั๊ก" }) });
    await ACTION_HANDLERS.get("celebrate")!(form.i, c, ["", "4444444444"]);
    expect(calls(c)[0]).toEqual(["shift_quest_share_create", USER, "recognition", "ช่วยแก้บั๊ก", null, "4444444444"]);
    const body = bodyText(form.sent[0]);
    expect(body).toContain("> 🙌 ฟ้า ขอบคุณ ดิน\n> ช่วยแก้บั๊ก\n> @​everyone");
    expect(body).toContain(`-# ${T.sharePeerNote}`);
    expect(body).not.toContain(T.sharePaused);
    expect(byId(form.sent[0], `sq|share_go|${EID}`)!.disabled).toBeFalsy();

    const go = interaction("button");
    await ACTION_HANDLERS.get("share_go")!(go.i, c, [EID]);
    expect(go.how).toEqual(["update"]);
    expectCard(go.sent[0], go.how[0]);
    expect(bodyText(go.sent[0])).toBe(`✅ ${T.shareAwaitingPeer}`);
    expect(customIds(go.sent[0])).toEqual(["sq|is_view"]);
  });

  it("confirms a help request and keeps the no-private-chat promise for mentors", async () => {
    const c = ctx(() => null);
    const { i, sent, how } = interaction("modal", { fields: fields({ summary: "ติด deploy", visibility: "mentors" }) });
    await ACTION_HANDLERS.get("help_new")!(i, c, [QID]);
    expect(calls(c)[0]).toEqual(["shift_quest_help_create", USER, "ติด deploy", "mentors", "student", QID]);
    expectCard(sent[0], how[0]);
    expect(bodyText(sent[0])).toBe(`### ${T.helpSentTitle}\n${T.helpSent(false)}`);
    expect(T.helpSent(false)).toContain("ไม่ใช่ทางแชทส่วนตัว");
    // Whether someone picked it up is in the inbox.
    expect(customIds(sent[0])).toEqual(["sq|inbox", "sq|is_view"]);
  });
});
