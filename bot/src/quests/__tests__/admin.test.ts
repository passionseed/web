/**
 * @jest-environment node
 */
import { MessageFlags } from "discord.js";

import { ACTION_HANDLERS, COMMAND_HANDLERS } from "..";
import type { QuestApi, Session } from "../api";
import type { Ctx } from "../context";
import { BLOCKER, T } from "../copy";
import { reportView, seasonView, statusView } from "../handlers/admin";
import { LIMITS, TONE_COLORS, renderView } from "../ui";
import { accentColor, bodyText, componentCount, customIds, textLength, viewText } from "../test-helpers/view";

const UUID = "3f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e5f";
const V2 = MessageFlags.IsComponentsV2;

function session(roles: string[]): Session {
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

function ctx(call: (fn: string, ...args: unknown[]) => unknown, roles: string[] = ["admin"]): Ctx {
  const api = { call: jest.fn(async (fn: string, ...args: unknown[]) => call(fn, ...args)), rows: jest.fn() };
  return { api: api as unknown as QuestApi, userId: "1111111111", name: "x", memberRoleIds: ["555"], session: session(roles) };
}

type Sent = { flags?: number; components?: unknown[]; allowedMentions?: unknown; content?: unknown };

/** A minimal Discord interaction that records what the bot sent and how (reply, update, editReply). */
function interaction(kind: "button" | "select" | "modal" | "command", over: Record<string, unknown> = {}) {
  const sent: Sent[] = [];
  const via: string[] = [];
  const modals: { custom_id: string }[] = [];
  const record = (how: string) => async (p: Sent) => {
    via.push(how);
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
    deferReply: async () => {
      i.deferred = true;
    },
    showModal: async (m: { toJSON: () => { custom_id: string } }) => modals.push(m.toJSON()),
    ...over,
  };
  return { i: i as never, sent, via, modals };
}

const fields = (values: Record<string, string>) => ({
  getTextInputValue: (id: string) => {
    if (!(id in values)) throw new Error("no field");
    return values[id];
  },
});

/** Options for a slash command, by option name. */
function options(values: Record<string, unknown>) {
  const get = (n: string) => (values[n] as never) ?? null;
  return { getString: get, getInteger: get, getBoolean: get, getUser: get, getMember: get, getRole: get, getChannel: get };
}

/** Every admin card: one V2 card, inside Discord's limits, pinging nobody. */
function expectCard(p: Sent, ephemeral = true) {
  expect(p.content).toBeUndefined();
  expect((p.flags ?? 0) & V2).toBe(V2);
  if (ephemeral) expect((p.flags ?? 0) & MessageFlags.Ephemeral).toBe(MessageFlags.Ephemeral);
  expect(p.allowedMentions).toEqual({ parse: [] });
  expect(p.components).toHaveLength(1);
  expect(componentCount(p)).toBeLessThanOrEqual(LIMITS.components);
  expect(textLength(p)).toBeLessThanOrEqual(LIMITS.text);
}

const status = (over: Record<string, unknown> = {}) => ({
  settings: {
    student_role_ids: ["777"],
    help_channel_id: "801",
    staff_channel_id: null,
    celebrate_channel_id: "803",
    coworking_channel_id: null,
    awards_enabled: true,
    redemption_enabled: true,
    sharing_enabled: false,
    reminders_enabled: false,
    squads_enabled: true,
    reward_terms: true,
    redemption_terms: false,
    fulfillment_process: true,
    fulfillment_owner: "ครูเอ",
  },
  live: { awards: true, redemption: false },
  blockers: { awards: [], redemption: ["redemption_terms", "catalog_item"], sharing: [], reminders: [] },
  rules: [{ key: "quest", version: 2, amount: 10, cap: 3, team_allocation: "each_confirmed" }],
  staff: { admin: 1, reviewer: 2, fulfillment: 0 },
  outbox: { pending: 4, blocked: 1, failed: 0 },
  data_requests_open: 2,
  ...over,
});

describe("admin status card", () => {
  it("reads as a checklist: what is set, what is missing, what is on", () => {
    const p = renderView(statusView(status() as never));
    expectCard(p);
    expect(accentColor(p)).toBe(TONE_COLORS.staff);
    const body = bodyText(p);
    expect(body.startsWith("### ⚙️ สถานะ SHIFT High quests\n")).toBe(true);
    expect(body).toContain("✅ บทบาทนักเรียน: <@&777>");
    expect(body).toContain("✅ ห้อง help: <#801>");
    expect(body).toContain("⚠️ ห้องทีมพี่เลี้ยง: ยังไม่ตั้ง");
    expect(body).toContain("⚠️ ห้อง coworking: ยังไม่ตั้ง");
    expect(body).toContain("-# ตั้งห้อง: /admin channel");
    expect(body).toContain("✅ กติกาเหรียญ · ⚠️ เงื่อนไขการแลก · ✅ ขั้นตอนจัดส่ง");
    expect(body).toContain("✅ ผู้รับผิดชอบจัดส่ง: ครูเอ");
    // Switches: on and working, on but held back (with what it needs), off.
    expect(body).toContain("✅ เหรียญ: เปิด ใช้งานอยู่");
    expect(body).toContain(`⚠️ แลกของ: เปิด แต่ยังใช้ไม่ได้\n- ${BLOCKER.redemption_terms}\n- ${BLOCKER.catalog_item}`);
    expect(body).toContain("⚪ แชร์สาธารณะ: ปิด");
    expect(body).toContain("⚪ การเตือน: ปิด");
    expect(body).toContain("✅ สควอด: เปิด");
    // The counts are fine print.
    expect(body).toContain("-# กติกาเหรียญที่เผยแพร่: quest v2 = 10 (สูงสุด 3) ทีม: each_confirmed");
    expect(body).toContain("-# ทีม: admin 1 · reviewer 2 · fulfillment 0");
    expect(body).toContain("-# ข้อความรอส่ง 4 · รอตั้งห้อง/รอเปิดแชร์ 1 · ส่งไม่สำเร็จ 0");
    expect(body).toContain("-# คำขอเรื่องข้อมูลที่เปิดอยู่: 2 · ดูที่ /admin data");
  });

  it("says students cannot use it yet without a student role, and names the command", () => {
    const s = status();
    s.settings.student_role_ids = [];
    s.settings.staff_channel_id = "802" as never;
    s.settings.coworking_channel_id = "804" as never;
    s.settings.fulfillment_owner = null as never;
    const body = bodyText(renderView(statusView(s as never)));
    expect(body).toContain("⚠️ บทบาทนักเรียน: ยังไม่ตั้ง นักเรียนยังใช้ไม่ได้ (/admin student-role)");
    expect(body).toContain("⚠️ ผู้รับผิดชอบจัดส่ง: ยังไม่ระบุ");
    // Every channel set: no channel hint.
    expect(body).not.toContain("/admin channel");
  });

  it("lists what an off switch still needs, and escapes the owner name", () => {
    const s = status({
      blockers: { awards: ["reward_terms", "reward_rule"], redemption: [], sharing: ["celebrate_channel"], reminders: [] },
      live: { awards: false, redemption: false },
      data_requests_open: 0,
    });
    s.settings.awards_enabled = false;
    s.settings.fulfillment_owner = "**@everyone**";
    const body = bodyText(renderView(statusView(s as never)));
    expect(body).toContain(`⚪ เหรียญ: ปิด\n- ${BLOCKER.reward_terms}\n- ${BLOCKER.reward_rule}`);
    expect(body).toContain(`⚪ แชร์สาธารณะ: ปิด\n- ${BLOCKER.celebrate_channel}`);
    expect(body).not.toContain("**@everyone**");
    expect(body.endsWith("-# คำขอเรื่องข้อมูลที่เปิดอยู่: 0")).toBe(true);
  });

  it("is what /admin status shows, and every setting change shows it again as saved", async () => {
    const c = ctx(() => status());
    const cmd = interaction("command");
    await COMMAND_HANDLERS.get("admin status")!(cmd.i, c);
    expectCard(cmd.sent[0]);
    expect(bodyText(cmd.sent[0])).toMatch(/^### ⚙️ สถานะ SHIFT High quests\n/);

    const set = interaction("command", { options: options({ name: "squads", state: "on" }) });
    await COMMAND_HANDLERS.get("admin feature")!(set.i, c);
    expect((c.api.call as jest.Mock).mock.calls.at(-1)).toEqual(["shift_quest_admin_set", "1111111111", "squads", "on"]);
    expectCard(set.sent[0]);
    expect(bodyText(set.sent[0])).toMatch(/^### ✅ บันทึกแล้ว\n✅ บทบาทนักเรียน/);

    const terms = interaction("modal", { fields: fields({ text: "กติกา" }) });
    await ACTION_HANDLERS.get("ad_terms")!(terms.i, c, ["reward_terms"]);
    expect((c.api.call as jest.Mock).mock.calls.at(-1)).toEqual(["shift_quest_admin_set", "1111111111", "reward_terms", "กติกา"]);
    expect(viewText(terms.sent[0])).toContain("✅ บันทึกแล้ว");
  });

  it("names only a real subcommand for an empty catalog", () => {
    expect(BLOCKER.catalog_item).toContain("(/admin catalog)");
  });
});

describe("admin season card", () => {
  const season = (over: Record<string, unknown> = {}) => ({
    id: UUID,
    name: "Season_1",
    status: "active",
    starts_on: "2027-01-01",
    ends_on: "2027-06-01",
    demo_day: "2027-05-15",
    table_bar: 2,
    stage_bar: 3,
    surprise_cap: 1,
    goal: { milestone: 3, target: 30, count: 12, deadline: "2027-05-01", unlock: "ปาร์ตี้พิซซ่า", reached: false },
    unlocks: Array.from({ length: 8 }, (_, k) => ({
      id: `u${k}`,
      label: `ของ ${k}`,
      milestone_count: 3,
      deadline: "2027-05-01",
      reward_rule_key: k === 0 ? "bonus" : null,
      earned: k,
    })),
    ...over,
  });

  it("shows the bars, the goal as a progress bar, unlocks cut to six, and one unlock button", () => {
    const p = renderView(seasonView(season() as never));
    expectCard(p);
    expect(accentColor(p)).toBe(TONE_COLORS.season);
    const body = bodyText(p);
    expect(body.startsWith("### 🎪 Season\\_1\n")).toBe(true);
    expect(body).toContain("โต๊ะโชว์งาน **2** ขั้น (รวมขั้น 2) · ขึ้นเวที **3** ขั้น (รวมขั้น 3)");
    expect(body).toContain("-# นับขั้นที่ส่งในซีซันจนจบ Demo Day และพี่เลี้ยงยืนยันแล้ว");
    expect(body).toContain("🎯 เป้าทั้งเกาะ: 30 ต้นผ่านขั้น 3 ภายใน");
    expect(body).toContain("→ ปาร์ตี้พิซซ่า");
    expect(body).toContain("▰▰▰▰▱▱▱▱▱▱ **12**/30");
    expect(body).toContain("🎁 ของ 0: ครบ 3 ขั้นภายใน");
    expect(body).toContain("(กติกา bonus)");
    expect(body).toContain("🎁 ของ 5:");
    expect(body).not.toContain("🎁 ของ 6:");
    expect(body).toContain("และอีก 2");
    expect(body).toContain("🌟 คำชมแบบเซอร์ไพรส์: ได้ 1 ครั้งต่อคนในซีซันนี้");
    // Fairness and how to edit stay, as fine print.
    expect(body).toContain("-# ของปลดล็อกได้เท่ากันทุกคนที่ถึงเกณฑ์ ไม่ผูกกับความเร็ว ไม่มีการจัดอันดับ");
    expect(body).toContain("-# แก้ซีซัน: /admin season");
    expect(customIds(p)).toEqual([`sq|ad_unlock|${UUID}`]);
  });

  it("says when there is no goal and no unlock yet, and when the goal is reached", () => {
    const empty = bodyText(renderView(seasonView(season({ goal: null, unlocks: [], surprise_cap: undefined }) as never)));
    expect(empty).toContain("🎯 ยังไม่มีเป้าทั้งเกาะ");
    expect(empty).toContain("🎁 ยังไม่มีของปลดล็อก");
    expect(empty).not.toContain("🌟");
    const reached = bodyText(
      renderView(seasonView(season({ goal: { milestone: 3, target: 30, count: 31, deadline: "2027-05-01", unlock: null, reached: true, reached_at: null } }) as never))
    );
    expect(reached).toContain("▰▰▰▰▰▰▰▰▰▰ **31**/30 · ถึงเป้าแล้ว");
  });

  it("adds an unlock from its button, then offers to add another", async () => {
    const c = ctx(() => null);
    const b = interaction("button");
    await ACTION_HANDLERS.get("ad_unlock")!(b.i, c, [UUID]);
    expect(b.modals[0].custom_id).toBe(`sq|ad_unlock|${UUID}`);
    const m = interaction("modal", { fields: fields({ label: "สติกเกอร์", count: "3", deadline: "2027-05-01" }) });
    await ACTION_HANDLERS.get("ad_unlock")!(m.i, c, [UUID]);
    expect((c.api.call as jest.Mock).mock.calls.at(-1)).toEqual(["shift_quest_admin_unlock", "1111111111", UUID, "สติกเกอร์", 3, "2027-05-01", null]);
    expectCard(m.sent[0]);
    expect(accentColor(m.sent[0])).toBe(TONE_COLORS.success);
    expect(viewText(m.sent[0])).toContain("ทุกคนที่ถึงเกณฑ์จะได้เท่ากัน และได้รับแจ้งใน /inbox");
    expect(customIds(m.sent[0])).toEqual([`sq|ad_unlock|${UUID}`]);
  });
});

describe("admin report card", () => {
  const report = {
    window_days: 14,
    members_onboarded: 30,
    members_started: 25,
    members_with_progress_in_window: 20,
    members_submitting_in_window: 12,
    quests_by_state: { active: 10, submitted: 3 },
    reviews_in_window: { approved: 5 },
    review_backlog: 3,
    review_median_hours: 12,
    projects_with_feedback_decision: 4,
    ownership: { all_checks_done: 2, projects: 9, with_blocker: 1 },
    help: { opened_in_window: 6, resolved_in_window: 5, open_now: 1 },
    coins: { awarded_in_window: 100, reversed_in_window: 5, members_awarded: 11, awards_not_issued: 2 },
    redemptions: {},
    sharing: { posted: 7, peer_declined: 1 },
    delivery: { failed: 0, blocked: 2 },
    access_denied_in_window: 3,
    island: {
      projects_by_stage: { "1": 4 },
      taps_in_window: 40,
      members_resting: 2,
      season: { demo_day: "2027-05-15", projects_at_table_bar: 6, projects_at_stage_bar: 3, milestones_pending_review: 4 },
    },
  };

  it("groups the counts, says they are aggregate only, and keeps the caveat", () => {
    const p = renderView(reportView(report));
    expectCard(p);
    const body = bodyText(p);
    expect(body.startsWith("### 📊 รายงานรวม 14 วันล่าสุด\n-# ตัวเลขรวมเท่านั้น ไม่ระบุตัวบุคคล\n")).toBe(true);
    for (const fact of [
      "เริ่มใช้แล้ว 30 คน · เริ่มลงมือแล้ว 25",
      "เควสต์ตามสถานะ: active 10, submitted 3",
      "ค้างรีวิว 3 · มัธยฐานเวลารีวิว 12 ชม.",
      "ความเป็นเจ้าของ: เช็กครบ 2/9 โปรเจกต์ · ติดอยู่ 1",
      "เหรียญ: ออก 100 · ปรับคืน 5 · คนที่เคยได้ 11 · อนุมัติแต่ยังไม่ออก 2",
      "การแลก: 0",
      "การเข้าถึงที่ถูกปฏิเสธ 3",
      "**เกาะ**\nต้นไม้ตามขั้น: ขั้น 1: 4",
      "รอพี่เลี้ยงยืนยัน 4 ชิ้น",
    ]) {
      expect(body).toContain(fact);
    }
    expect(body).toContain("-# ตัวเลขกิจกรรมไม่ได้บอกแรงจูงใจภายใน");
  });

  it("leaves the island section out when the report has none", async () => {
    const c = ctx(() => ({ ...report, island: null }));
    const cmd = interaction("command", { options: options({}) });
    await COMMAND_HANDLERS.get("admin report")!(cmd.i, c);
    expect((c.api.call as jest.Mock).mock.calls[0]).toEqual(["shift_quest_admin_report", "1111111111", 14]);
    expectCard(cmd.sent[0]);
    expect(bodyText(cmd.sent[0])).not.toContain("**เกาะ**");
  });
});

describe("admin coin cards", () => {
  it("shows a ledger with the balance first and the reversal picker inside the card", async () => {
    const c = ctx(() => ({
      name: "ฟ้า",
      balance: 40,
      entries: [
        { id: UUID, amount: 30, kind: "award", reason: "quest", created_at: "2027-01-02T03:00:00Z", reversed: 0, title: "แอป" },
        { id: "4f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e5f", amount: -5, kind: "reversal", reason: "ซ้ำ", created_at: "2027-01-03T03:00:00Z", reversed: 0, title: null },
      ],
    }));
    const cmd = interaction("command", { options: options({ user: { id: "4444444444" } }) });
    await COMMAND_HANDLERS.get("admin ledger")!(cmd.i, c);
    const p = cmd.sent[0];
    expectCard(p);
    expect(accentColor(p)).toBe(TONE_COLORS.coins);
    const body = bodyText(p);
    expect(body).toMatch(/^### 🪙 ฟ้า\nยอด \*\*40\*\* เหรียญ/);
    expect(body).toContain("**+30** ได้จากเควสต์: แอป");
    expect(body).toContain("**-5**");
    expect(customIds(p)).toEqual(["sq|ad_rev"]);
    expect(viewText(p)).toContain("ปรับคืนรายการ (ต้องมีเหตุผล นักเรียนจะเห็น)");
  });

  it("confirms a reversal with the new balance", async () => {
    const c = ctx(() => ({ duplicate: false, balance: 35 }));
    const m = interaction("modal", { fields: fields({ amount: "5", reason: "ซ้ำ" }) });
    await ACTION_HANDLERS.get("ad_rev")!(m.i, c, [UUID, "555555555555555555"]);
    expect(m.via).toEqual(["editReply"]);
    expectCard(m.sent[0], false);
    expect(bodyText(m.sent[0])).toBe("### ✅ ปรับคืนแล้ว\nยอดใหม่ **35** · นักเรียนได้รับแจ้งเหตุผลใน /inbox");
    const again = ctx(() => ({ duplicate: true }));
    const m2 = interaction("modal", { fields: fields({ amount: "5", reason: "ซ้ำ" }) });
    await ACTION_HANDLERS.get("ad_rev")!(m2.i, again, [UUID, "555555555555555555"]);
    expect(bodyText(m2.sent[0])).toBe("### ✅ บันทึกไปแล้ว");
  });

  it("saves a catalog item and lists every item as one card", async () => {
    const c = ctx((fn) =>
      fn === "shift_quest_admin_catalog"
        ? { name: "สติกเกอร์", cost: 20, stock_available: 5, active: true }
        : [
            { name: "สติกเกอร์", cost: 20, stock_available: 5, active: true, reserved: 1 },
            { name: "เสื้อ", cost: 200, stock_available: 0, active: false, reserved: 0 },
          ]
    );
    const cmd = interaction("command", { options: options({ name: "สติกเกอร์", cost: 20 }) });
    await COMMAND_HANDLERS.get("admin catalog")!(cmd.i, c);
    expect((c.api.call as jest.Mock).mock.calls[0]).toEqual(["shift_quest_admin_catalog", "1111111111", null, "สติกเกอร์", null, 20, null, null]);
    expectCard(cmd.sent[0]);
    const body = bodyText(cmd.sent[0]);
    expect(body).toContain("### ✅ บันทึก สติกเกอร์ แล้ว");
    expect(body).toContain("- สติกเกอร์ **20** เหรียญ · เหลือ 5 · จองอยู่ 1 · เปิด");
    expect(body).toContain("- เสื้อ **200** เหรียญ · เหลือ 0 · จองอยู่ 0 · ปิด");
    expect(body).toContain("-# แสดงให้นักเรียนเห็นเฉพาะตอนที่การแลกเปิดและตั้งค่าครบแล้ว");
  });

  it("confirms a recognition without pinging the student", async () => {
    const c = ctx(() => ({ duplicate: false }));
    const m = interaction("modal", { fields: fields({ reason: "r" }) });
    await ACTION_HANDLERS.get("ad_recog")!(m.i, c, ["4444444444", "50", "333333333333333333"]);
    expect(m.via).toEqual(["editReply"]);
    expectCard(m.sent[0], false);
    expect(bodyText(m.sent[0])).toBe("### ✅ บันทึกแล้ว\n<@4444444444> ได้รับแจ้งใน /inbox");
  });
});

describe("admin data and fulfillment cards", () => {
  it("lists open data requests with Thai kinds in the picker, values unchanged", async () => {
    const c = ctx(() => [
      { id: UUID, kind: "erasure", note: "ลบ *ทั้งหมด*", name: "ฟ้า", created_at: "2027-01-02T03:00:00Z" },
      { id: "4f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e5f", kind: "correction", note: null, name: "ดิน", created_at: "2027-01-02T03:00:00Z" },
    ]);
    const cmd = interaction("command");
    await COMMAND_HANDLERS.get("admin data")!(cmd.i, c);
    const p = cmd.sent[0];
    expectCard(p);
    const body = bodyText(p);
    expect(body).toMatch(/^### 🗂️ คำขอเรื่องข้อมูล \(2\)\n/);
    expect(body).toContain("**ขอลบ**: ฟ้า: ลบ \\*ทั้งหมด\\*");
    expect(body).toContain("**ขอแก้**: ดิน");
    const json = JSON.stringify(p.components!.map((x) => (x as { toJSON: () => unknown }).toJSON()));
    expect(json).toContain(`"value":"${UUID}:erasure"`);
    expect(viewText(p)).toContain("ขอลบ: ฟ้า");
  });

  it("stays inside Discord's limits with a full page of long requests", async () => {
    const c = ctx(() =>
      Array.from({ length: 25 }, (_, k) => ({ id: UUID, kind: "correction", note: "ก".repeat(300), name: `คน ${k}`, created_at: "2027-01-02T03:00:00Z" }))
    );
    const cmd = interaction("command", { commandName: "admin", options: { getSubcommand: () => "data" } });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      await COMMAND_HANDLERS.get("admin data")!(cmd.i, c);
      // Clipped to fit, and said so in one log line that names the command.
      expect(warn.mock.calls.flat().join(" ")).toContain("view trimmed action=admin/data");
    } finally {
      warn.mockRestore();
    }
    expectCard(cmd.sent[0]);
    expect(customIds(cmd.sent[0])).toEqual(["sq|ad_data"]);
  });

  it("says when nothing is open", async () => {
    const data = interaction("command");
    await COMMAND_HANDLERS.get("admin data")!(data.i, ctx(() => []));
    expect(bodyText(data.sent[0])).toBe("### 🗂️ คำขอเรื่องข้อมูล\nไม่มีคำขอที่เปิดอยู่");
    const fulfill = interaction("command");
    await COMMAND_HANDLERS.get("fulfill")!(fulfill.i, ctx(() => [{ id: UUID, item: "x", cost: 1, status: "reserved", student: "s", created_at: "", own: true }], ["fulfillment"]));
    expect(bodyText(fulfill.sent[0])).toBe("### 📦 คำขอแลก\nไม่มีคำขอแลกที่รออยู่");
  });

  it("asks before erasing, warns it cannot be undone, and keeps the same buttons", async () => {
    const c = ctx(() => null);
    const pick = interaction("select", { values: [`${UUID}:erasure`] });
    await ACTION_HANDLERS.get("ad_data")!(pick.i, c, []);
    expect(pick.via).toEqual(["update"]);
    expectCard(pick.sent[0], false);
    expect(customIds(pick.sent[0])).toEqual([`sq|ad_erase|${UUID}`, `sq|ad_dclose|${UUID}|done`, `sq|ad_dclose|${UUID}|reject`]);
    expect(bodyText(pick.sent[0])).toContain("**ย้อนกลับไม่ได้**");

    const erase = interaction("button");
    await ACTION_HANDLERS.get("ad_erase")!(erase.i, c, [UUID]);
    expect(accentColor(erase.sent[0])).toBe(TONE_COLORS.warn);
    expect(bodyText(erase.sent[0])).toContain("### ⚠️ ยืนยันการลบ");
    expect(bodyText(erase.sent[0])).toContain("ยอดเหรียญและสถานะเควสต์คงไว้แบบไม่ระบุตัวตน");
    expect(customIds(erase.sent[0])).toEqual([`sq|ad_erase_go|${UUID}`, "sq|noop"]);
    expect(viewText(erase.sent[0])).toContain(T.btnCancel);

    const go = interaction("button");
    await ACTION_HANDLERS.get("ad_erase_go")!(go.i, c, [UUID]);
    expect((c.api.call as jest.Mock).mock.calls.at(-1)).toEqual(["shift_quest_admin_erase", "1111111111", UUID]);
    expect(bodyText(go.sent[0])).toBe("### ✅ ลบแล้ว");
  });

  it("shows the fulfillment queue with the address rule, then the status a press moved it to", async () => {
    const c = ctx((fn) =>
      fn === "shift_quest_fulfill_queue"
        ? [
            { id: UUID, item: "สติกเกอร์", cost: 20, status: "reserved", student: "ฟ้า", created_at: "2027-01-02T03:00:00Z", own: false },
            { id: "4f1c2a64-1d2b-4c3d-9e8f-0a1b2c3d4e5f", item: "x", cost: 1, status: "reserved", student: "ตัวเอง", created_at: "", own: true },
          ]
        : "start",
      ["fulfillment"]
    );
    const cmd = interaction("command");
    await COMMAND_HANDLERS.get("fulfill")!(cmd.i, c);
    const p = cmd.sent[0];
    expectCard(p);
    const body = bodyText(p);
    expect(body).toMatch(/^### 📦 คำขอแลกที่รออยู่ \(1\)\n/);
    expect(body).toContain("ฟ้า: **สติกเกอร์** (จองแล้ว)");
    expect(body).not.toContain("ตัวเอง");
    expect(body).toContain("-# ข้อมูลจัดส่งให้ผู้ปกครองเป็นคนกรอก");
    expect(body).toContain("ห้ามถามที่อยู่ในห้องแชทหรือ DM");
    expect(customIds(p)).toEqual(["sq|fl_pick"]);

    const pick = interaction("select", { values: [UUID] });
    await ACTION_HANDLERS.get("fl_pick")!(pick.i, c, []);
    expect(customIds(pick.sent[0])).toEqual([`sq|fl_act|${UUID}|start`, `sq|fl_act|${UUID}|complete`, `sq|fl_act|${UUID}|cancel`]);
    expect(bodyText(pick.sent[0])).toBe("### 📦 อัปเดตคำขอ\n-# นักเรียนจะได้รับแจ้งใน /inbox");

    const act = interaction("button");
    await ACTION_HANDLERS.get("fl_act")!(act.i, c, [UUID, "start"]);
    expect((c.api.call as jest.Mock).mock.calls.at(-1)).toEqual(["shift_quest_fulfill_update", "1111111111", UUID, "start", null]);
    expect(act.via).toEqual(["update"]);
    expect(bodyText(act.sent[0])).toBe(`### ✅ ${T.done}\nสถานะใหม่: **กำลังดำเนินการ**\n-# นักเรียนได้รับแจ้งใน /inbox`);

    const cancel = interaction("modal", { fields: fields({ note: "หมด" }) });
    const stale = ctx(() => "unchanged", ["fulfillment"]);
    await ACTION_HANDLERS.get("fl_act")!(cancel.i, stale, [UUID, "cancel"]);
    expect((stale.api.call as jest.Mock).mock.calls.at(-1)).toEqual(["shift_quest_fulfill_update", "1111111111", UUID, "cancel", "หมด"]);
    expect(cancel.via).toEqual(["reply"]);
    expect(bodyText(cancel.sent[0])).toBe("### ℹ️ ไม่มีอะไรเปลี่ยน\nสถานะเปลี่ยนไปแล้ว");
  });
});

describe("admin templates and roles", () => {
  it("lists templates with the commands that change them, and says which one changed", async () => {
    const c = ctx((fn) =>
      fn === "shift_quest_admin_templates"
        ? [{ slug: "ms-1", version: 2, title: "ขั้น 1", status: "published", reward_rule_key: "quest" }]
        : null
    );
    const list = interaction("command");
    await COMMAND_HANDLERS.get("admin templates")!(list.i, c);
    expectCard(list.sent[0]);
    expect(bodyText(list.sent[0])).toBe(
      "### 📋 เควสต์ตัวอย่าง (1)\n- `ms-1` v2 ขั้น 1: published · กติกา quest\n-# เปิดหรือเก็บ: /admin template · ผูกกติกาเหรียญ: /admin template-rule"
    );

    const set = interaction("command", { options: options({ template: "ms-1", publish: false }) });
    await COMMAND_HANDLERS.get("admin template")!(set.i, c);
    expect((c.api.call as jest.Mock).mock.calls.at(-1)).toEqual(["shift_quest_admin_template_state", "1111111111", "ms-1", false]);
    expect(bodyText(set.sent[0])).toBe(`### ✅ ${T.done}\nเก็บ \`ms-1\` แล้ว`);
  });

  it("shows a member's roles without pinging them", async () => {
    const c = ctx(() => ({ roles: ["reviewer", "admin"] }));
    const cmd = interaction("command", {
      options: options({ user: { id: "4444444444", username: "u" }, role: "admin", action: "grant" }),
    });
    await COMMAND_HANDLERS.get("admin role")!(cmd.i, c);
    expect((c.api.call as jest.Mock).mock.calls[0]).toEqual(["shift_quest_admin_role", "1111111111", "4444444444", "u", "admin", true]);
    expectCard(cmd.sent[0]);
    expect(bodyText(cmd.sent[0])).toBe("### ✅ บันทึกแล้ว\n<@4444444444>: **reviewer, admin**");
  });

  it("refuses a non-admin before any database call", async () => {
    for (const key of ["admin status", "admin data", "admin report"]) {
      const c = ctx(() => null, ["reviewer"]);
      await expect(COMMAND_HANDLERS.get(key)!(interaction("command").i, c)).rejects.toThrow();
      expect(c.api.call).not.toHaveBeenCalled();
    }
  });
});
