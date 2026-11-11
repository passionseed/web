/**
 * @jest-environment node
 */
import { MessageFlags } from "discord.js";

import { ACTION_HANDLERS, COMMAND_HANDLERS } from "..";
import type { QuestApi, Session } from "../api";
import type { Ctx } from "../context";
import { RV, reviewCard, type ReviewDetail } from "../handlers/review";
import { LIMITS, TONE_COLORS, renderView } from "../ui";
import { accentColor, bodyText, componentCount, customIds, mediaUrls, textLength, viewText } from "../test-helpers/view";

const SUB = "11111111-1111-4111-8111-111111111111";
const INST = "22222222-2222-4222-8222-222222222222";
const HELP = "33333333-3333-4333-8333-333333333333";

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
      redemption: true,
      sharing: false,
      reminders: false,
      reward_terms: null,
      redemption_terms: null,
      squads: true,
    },
  };
}

function ctx(call: (fn: string, ...args: unknown[]) => unknown, roles: string[] = ["reviewer"]) {
  const api = { call: jest.fn(async (fn: string, ...args: unknown[]) => call(fn, ...args)), rows: jest.fn() };
  const c: Ctx = { api: api as unknown as QuestApi, userId: "1111111111", name: "x", memberRoleIds: [], session: session(roles) };
  return { c, api };
}

type Sent = { components?: unknown[]; files?: unknown[]; flags?: number; allowedMentions?: unknown };

/** A minimal Discord interaction: records what the bot sent and how. */
function interaction(kind: "button" | "select" | "modal" | "command", over: Record<string, unknown> = {}) {
  const sent: Sent[] = [];
  const via: string[] = [];
  const modals: { custom_id: string; title: string }[] = [];
  const record = (how: string) => async (p: Sent) => {
    via.push(how);
    sent.push(p);
  };
  const i: Record<string, unknown> = {
    id: "222222222222222222",
    deferred: false,
    replied: false,
    customId: "sq|x",
    values: [],
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
  return { i: i as never, sent, via, modals };
}

const fields = (values: Record<string, string>) => ({
  getTextInputValue: (id: string) => {
    if (!(id in values)) throw new Error("no field");
    return values[id];
  },
});

/** Custom IDs of the disabled buttons in a sent card. */
function disabledIds(p: Sent): string[] {
  const found: string[] = [];
  const walk = (c: { components?: unknown[]; custom_id?: string; disabled?: boolean }) => {
    if (c.disabled && c.custom_id) found.push(c.custom_id);
    for (const child of c.components ?? []) walk(child as typeof c);
  };
  for (const c of p.components ?? []) walk((c as { toJSON: () => never }).toJSON());
  return found;
}

/** Every card the review area sends: one V2 container inside Discord's limits, pinging nobody. */
function expectCard(p: Sent, tone: keyof typeof TONE_COLORS = "staff") {
  expect((p.flags ?? 0) & MessageFlags.IsComponentsV2).toBeTruthy();
  expect(p).not.toHaveProperty("content");
  expect(p.components).toHaveLength(1);
  expect(p.allowedMentions).toEqual({ parse: [] });
  expect(accentColor(p)).toBe(TONE_COLORS[tone]);
  expect(componentCount(p)).toBeLessThanOrEqual(LIMITS.components);
  expect(textLength(p)).toBeLessThanOrEqual(LIMITS.text);
}

const detail = (over: Partial<ReviewDetail> = {}): ReviewDetail => ({
  submission_id: SUB,
  revision: 2,
  status: "pending",
  is_latest: true,
  appeal: false,
  appeal_reason: null,
  instance_state: "submitted",
  student: "ฝน",
  title: "แอปจดการบ้าน",
  why: "เพื่อนลืมส่งงานบ่อย",
  goal: "ให้เพื่อน 5 คนลองใช้",
  criteria: "ลิงก์แอปและรูปหน้าจอ",
  template_evidence: null,
  proposed: false,
  repeatable: false,
  prior_approved: 0,
  evidence: "ทำแอปเสร็จ เพื่อน 6 คนลองใช้",
  reflection: "ได้เรียนรู้ว่าต้องถามผู้ใช้ก่อน",
  artifact_url: "https://example.com/app",
  reward: { amount: 10, team_allocation: null },
  reward_agreed: false,
  awards_live: true,
  contributions: [],
  history: [],
  ...over,
});

describe("/review queue", () => {
  it("is one staff card: counts, the fine print in small text, the menus and the other lists as buttons", async () => {
    const { c, api } = ctx(() => ({
      submissions: [{ submission_id: SUB, title: "แอป", revision: 1, student: "ฝน", created_at: "2026-11-10T03:00:00Z", appeal: true }],
      proposals: [{ instance_id: INST, title: "พอดแคสต์", student: "บีม", created_at: "2026-11-09T03:00:00Z" }],
      help_open: 3,
    }));
    const { i, sent, via } = interaction("command");
    await COMMAND_HANDLERS.get("review queue")!(i, c);

    expect(api.call).toHaveBeenCalledWith("shift_quest_review_queue", "1111111111");
    expect(via).toEqual(["reply"]);
    expectCard(sent[0]);
    expect((sent[0].flags ?? 0) & MessageFlags.Ephemeral).toBeTruthy();
    const body = bodyText(sent[0]);
    expect(body.startsWith(`### ${RV.queueTitle}\n`)).toBe(true);
    expect(body).toContain("งานรอรีวิว **1** · เควสต์ที่เสนอรอตกลง **1**");
    expect(body).toContain(`-# ${RV.queueHidden}`);
    // "(/review help)" became a button.
    expect(body).not.toContain("/review help");
    expect(viewText(sent[0])).toContain("[อุทธรณ์] แอป");
    expect(viewText(sent[0])).toContain("🙋 คำขอความช่วยเหลือ (3)");
    expect(customIds(sent[0])).toEqual(["sq|rv_sub", "sq|rv_prop", "sq|rv_list|help", "sq|rv_list|awards"]);
  });

  it("stays inside Discord's limits with a full queue and says the menu shows the first 25", async () => {
    const many = Array.from({ length: 40 }, (_, n) => ({
      submission_id: SUB,
      title: `งาน ${n}`,
      revision: 1,
      student: "ฝน",
      created_at: "2026-11-10T03:00:00Z",
      appeal: false,
    }));
    const { c } = ctx(() => ({ submissions: many, proposals: [], help_open: 0 }));
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("review queue")!(i, c);
    expectCard(sent[0]);
    expect(bodyText(sent[0])).toContain(RV.menuCap);
  });

  it("refuses anyone without a reviewer role before reading the queue", async () => {
    const { c, api } = ctx(() => ({}), []);
    const { i } = interaction("command");
    await expect(COMMAND_HANDLERS.get("review queue")!(i, c)).rejects.toThrow();
    expect(api.call).not.toHaveBeenCalled();
  });
});

describe("a submission under review", () => {
  it("separates the student's words (escaped quotes) from the bot's labels, reward first, rubric last", () => {
    const view = reviewCard(
      detail({
        evidence: "# ใหญ่มาก\n**ตัวหนา** @everyone",
        contributions: [
          { name: "ฝน", contribution: "ทำหน้าเว็บ", status: "confirmed" },
          { name: "บีม", contribution: null, status: "pending" },
        ],
        reward: { amount: 10, team_allocation: null },
      })
    );
    const p = renderView(view);
    expectCard(p);
    const body = bodyText(p);
    expect(body.startsWith("### 📝 แอปจดการบ้าน\n")).toBe(true);
    expect(body).toContain("โดย **ฝน** · ครั้งที่ **2**");
    expect(body).toContain("🪙 อนุมัติแล้วได้ **10** เหรียญ (งานทีม: ยังไม่มีกติกาแบ่ง)");
    expect(body).toContain("-# สิ่งที่ทำ\n> \\# ใหญ่มาก\n> \\*\\*ตัวหนา\\*\\* @​everyone");
    expect(body).toContain("-# เป้าหมาย\n> ให้เพื่อน 5 คนลองใช้");
    expect(body).toContain("> **ฝน**: ทำหน้าเว็บ\n> **บีม**: (ยังไม่ยืนยัน)");
    expect(body.indexOf("🪙")).toBeLessThan(body.indexOf("-# สิ่งที่ทำ"));
    expect(body.trim().endsWith("ผลลบที่สะท้อนคิดดีก็ผ่านได้")).toBe(true);
    expect(customIds(p)).toEqual([
      `sq|rv_dec|${SUB}|approved|0`,
      `sq|rv_dec|${SUB}|clarification|0`,
      `sq|rv_dec|${SUB}|declined|0`,
      "sq|rv_list|queue",
    ]);
    expect(mediaUrls(p)).toEqual([]);
  });

  it("offers the repeat approval only for a repeat, and no decisions on an older revision", () => {
    const repeat = renderView(reviewCard(detail({ repeatable: true, prior_approved: 2 })));
    expect(bodyText(repeat)).toContain("นักเรียนเคยผ่านเควสต์นี้ **2** ครั้ง");
    expect(customIds(repeat)).toContain(`sq|rv_dec|${SUB}|approved|1`);
    expect(viewText(repeat)).toContain(RV.btnApproveDistinct);

    const old = renderView(reviewCard(detail({ is_latest: false })));
    expect(bodyText(old)).toContain(`-# ${RV.notLatest}`);
    expect(customIds(old)).toEqual(["sq|rv_list|queue"]);
  });

  it("titles an appeal and shows its reason with earlier rounds", () => {
    const p = renderView(
      reviewCard(
        detail({
          appeal: true,
          appeal_reason: "ทำตามที่ตกลงครบแล้ว",
          history: [{ revision: 1, outcome: "declined", feedback: "ขอรูปหน้าจอ", created_at: "2026-11-01T00:00:00Z" }],
        })
      )
    );
    const body = bodyText(p);
    expect(body.startsWith("### ⚖️ อุทธรณ์: แอปจดการบ้าน\n")).toBe(true);
    expect(body).toContain("ครั้งที่ 1: **ยังไม่ผ่าน**\n> ขอรูปหน้าจอ");
    expect(body).toContain("-# เหตุผลอุทธรณ์\n> ทำตามที่ตกลงครบแล้ว");
  });

  it("cuts very long work on the card and attaches the whole text as a file, inside Discord's limits", () => {
    const long = "ก".repeat(3500);
    const view = reviewCard(
      detail({
        evidence: long,
        reflection: "ข".repeat(2000),
        contributions: Array.from({ length: 8 }, (_, n) => ({ name: `คน${n}`, contribution: "ค".repeat(400), status: "confirmed" })),
        history: Array.from({ length: 6 }, (_, n) => ({ revision: n + 1, outcome: "clarification", feedback: "ง".repeat(900), created_at: "" })),
        appeal_reason: "จ".repeat(1500),
      })
    );
    // Extreme input is over 4000 characters even after the per-field cuts: the
    // renderer clips the longest block and logs one line; the file keeps it all.
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const p = renderView(view, { action: "rv_sub" });
    expect(warn.mock.calls.flat().join(" ")).toContain("view trimmed action=rv_sub");
    warn.mockRestore();
    expectCard(p);
    expect(mediaUrls(p)).toEqual(["attachment://submission.txt"]);
    expect(bodyText(p)).toContain(RV.fullFile);
    const file = (view.files ?? [])[0];
    expect(String((file as unknown as { attachment: Buffer }).attachment)).toContain(long);
    expect(bodyText(p)).toContain("และอีก 3");
  });

  it("fits a long but ordinary submission without trimming, with the full text in a file", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const view = reviewCard(detail({ evidence: "ก".repeat(1800), reflection: "ข".repeat(900), why: "ค".repeat(300) }));
    const p = renderView(view, { action: "rv_sub" });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    expectCard(p);
    expect(mediaUrls(p)).toEqual(["attachment://submission.txt"]);
    // A short one has no file.
    expect(mediaUrls(renderView(reviewCard(detail())))).toEqual([]);
  });

  it("opens from the queue menu in place, with the same database call", async () => {
    const { c, api } = ctx(() => detail());
    const { i, sent, via } = interaction("select", { values: [SUB], customId: "sq|rv_sub" });
    await ACTION_HANDLERS.get("rv_sub")!(i, c, []);
    expect(api.call).toHaveBeenCalledWith("shift_quest_review_get", "1111111111", SUB);
    expect(via).toEqual(["update"]);
    expectCard(sent[0]);
    // An edit keeps the message's privacy: only the V2 flag.
    expect(sent[0].flags).toBe(MessageFlags.IsComponentsV2);
  });
});

describe("review decisions", () => {
  it("asks for feedback in the same modal", async () => {
    const { c } = ctx(() => null);
    const { i, modals } = interaction("button");
    await ACTION_HANDLERS.get("rv_dec")!(i, c, [SUB, "declined", "0"]);
    expect(modals[0].custom_id).toBe(`sq|rv_dec|${SUB}|declined|0`);
    expect(modals[0].title).toBe("ยังไม่ผ่าน");
  });

  it("confirms in a small toast with the coins and a way back to the queue", async () => {
    const { c, api } = ctx(() => ({ already: false, award: { issued: true, amount: 10 } }));
    const { i, sent, via } = interaction("modal", { fields: fields({ feedback: "ชัดมาก" }) });
    await ACTION_HANDLERS.get("rv_dec")!(i, c, [SUB, "approved", "1"]);
    expect(api.call).toHaveBeenCalledWith("shift_quest_review_decide", "1111111111", SUB, "approved", "ชัดมาก", true);
    expect(via).toEqual(["reply"]);
    expectCard(sent[0], "success");
    expect(bodyText(sent[0])).toBe(`### ✅ บันทึกแล้ว: อนุมัติ\n🪙 ออกเหรียญแล้ว **10**\n-# ${RV.studentSees}`);
    expect(customIds(sent[0])).toEqual(["sq|rv_list|queue"]);
  });

  it("says when a review was already saved, and why no coins were issued", async () => {
    const already = ctx(() => ({ already: true, award: null }));
    const a = interaction("modal", { fields: fields({}) });
    await ACTION_HANDLERS.get("rv_dec")!(a.i, already.c, [SUB, "clarification", "0"]);
    expectCard(a.sent[0], "neutral");
    expect(bodyText(a.sent[0])).toBe(`### ${RV.already}`);

    const none = ctx(() => ({ already: false, award: { issued: false, reason: "cap_reached" } }));
    const b = interaction("modal", { fields: fields({}) });
    await ACTION_HANDLERS.get("rv_dec")!(b.i, none.c, [SUB, "approved", "0"]);
    expect(bodyText(b.sent[0])).toContain("🪙 ไม่มีเหรียญ: ครบจำนวนครั้งสูงสุดของกติกานี้แล้ว");
  });
});

describe("proposed quests", () => {
  const proposal = {
    title: "พอดแคสต์ **ดัง**",
    why: null,
    goal: "อัด 3 ตอน",
    criteria: "ลิงก์ตอน",
    next_step: "เขียนบท",
    student: "บีม",
    state: "active",
    rules: [{ key: "build_small", amount: 5 }],
  };

  it("shows the proposal quoted, the group-room rule, and the coin rules in one menu", async () => {
    const { c, api } = ctx(() => proposal);
    const { i, sent, via } = interaction("select", { values: [INST] });
    await ACTION_HANDLERS.get("rv_prop")!(i, c, []);
    expect(api.call).toHaveBeenCalledWith("shift_quest_proposal_get", "1111111111", INST);
    expect(via).toEqual(["update"]);
    expectCard(sent[0]);
    const body = bodyText(sent[0]);
    expect(body.startsWith("### 🧭 พอดแคสต์ \\*\\*ดัง\\*\\*\n")).toBe(true);
    expect(body).toContain("เสนอโดย **บีม** · กำลังทำ");
    expect(body).toContain("-# เป้าหมาย\n> อัด 3 ตอน");
    expect(body).toContain("ตกลงขอบเขตและหลักฐานกับนักเรียนในห้องกลุ่มก่อน");
    expect(body).toContain(`-# ${RV.agreeFair}`);
    expect(viewText(sent[0])).toContain("build_small (5 เหรียญ)");
    const json = JSON.stringify(sent[0].components!.map((x) => (x as { toJSON: () => unknown }).toJSON()));
    expect(json).toContain(`"custom_id":"sq|rv_agree|${INST}"`);
    expect(json).toContain('"value":"-"');
  });

  it("records the agreement with the same call and says where the student sees it", async () => {
    const { c, api } = ctx(() => null);
    const { i, sent } = interaction("select", { values: ["build_small"] });
    await ACTION_HANDLERS.get("rv_agree")!(i, c, [INST]);
    expect(api.call).toHaveBeenCalledWith("shift_quest_proposal_agree", "1111111111", INST, "build_small", null);
    expectCard(sent[0], "success");
    expect(bodyText(sent[0])).toContain("🪙 กติกา **build\\_small**");
    expect(bodyText(sent[0])).toContain("นักเรียนจะเห็นใน /inbox");

    const none = ctx(() => null);
    const b = interaction("select", { values: ["-"] });
    await ACTION_HANDLERS.get("rv_agree")!(b.i, none.c, [INST]);
    expect(none.api.call).toHaveBeenCalledWith("shift_quest_proposal_agree", "1111111111", INST, null, null);
    expect(bodyText(b.sent[0])).toContain(RV.agreedNoCoins);
  });
});

describe("/review help", () => {
  const item = (n: number, over: Record<string, unknown> = {}) => ({
    id: HELP,
    student: `นักเรียน${n}`,
    summary: `ติด deploy\nไม่ขึ้น ${n}`,
    visibility: "mentors",
    source: "help",
    status: "open",
    claimed_by: null,
    project: "แอป",
    created_at: "2026-11-10T03:00:00Z",
    ...over,
  });

  it("lists the first five as quotes, says how many more, and keeps every request in the menu", async () => {
    const items = Array.from({ length: 8 }, (_, n) => item(n, n === 0 ? { status: "claimed", claimed_by: "พี่โอ๊ต" } : {}));
    const { c, api } = ctx(() => items);
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("review help")!(i, c);
    expect(api.call).toHaveBeenCalledWith("shift_quest_help_queue", "1111111111");
    expectCard(sent[0]);
    const body = bodyText(sent[0]);
    expect(body).toContain("เปิดอยู่ **8** · ยังไม่มีคนรับ **7**");
    expect(body).toContain("**นักเรียน0** · แอป · <t:");
    expect(body).toContain("> ติด deploy ไม่ขึ้น 0");
    expect(body).toContain("-# รับโดย พี่โอ๊ต");
    expect(body).toContain("นักเรียน4");
    expect(body).not.toContain("นักเรียน5");
    expect(body).toContain("-# และอีก 3");
    expect(customIds(sent[0])).toEqual(["sq|rv_help", "sq|rv_list|queue"]);
    expect(viewText(sent[0])).toContain("นักเรียน7: ติด deploy");
  });

  it("says when nothing is open", async () => {
    const { c } = ctx(() => []);
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("review help")!(i, c);
    expectCard(sent[0]);
    expect(bodyText(sent[0])).toBe(`### ${RV.helpTitle}\n${RV.helpEmpty}`);
  });

  it("shows one request with the group-room rule and the same claim, resolve and release buttons", async () => {
    const { c } = ctx(() => [item(1, { visibility: "community" })]);
    const { i, sent, via } = interaction("select", { values: [HELP] });
    await ACTION_HANDLERS.get("rv_help")!(i, c, []);
    expect(via).toEqual(["update"]);
    expectCard(sent[0]);
    const body = bodyText(sent[0]);
    expect(body).toContain("**นักเรียน1** · แอป · ห้อง help");
    expect(body).toContain("> ติด deploy\n> ไม่ขึ้น 1");
    expect(body).toContain("ตอบในห้องกลุ่มเท่านั้น ห้ามย้ายไปคุยส่วนตัวกับนักเรียน");
    expect(customIds(sent[0])).toEqual([`sq|rv_hact|${HELP}|claim`, `sq|rv_hact|${HELP}|resolve`, `sq|rv_hact|${HELP}|release`, "sq|rv_list|help"]);
    // Open: claim enabled, release disabled (the same rule as before).
    expect(disabledIds(sent[0])).toEqual([`sq|rv_hact|${HELP}|release`]);
    const claimed = ctx(() => [item(1, { status: "claimed", claimed_by: "พี่โอ๊ต" })]);
    const b = interaction("select", { values: [HELP] });
    await ACTION_HANDLERS.get("rv_help")!(b.i, claimed.c, []);
    expect(disabledIds(b.sent[0])).toEqual([`sq|rv_hact|${HELP}|claim`]);
    expect(bodyText(b.sent[0])).toContain("-# รับโดย พี่โอ๊ต");
  });

  it("claims with the same call and confirms in a toast", async () => {
    const { c, api } = ctx(() => null);
    const { i, sent, via } = interaction("button");
    await ACTION_HANDLERS.get("rv_hact")!(i, c, [HELP, "claim"]);
    expect(api.call).toHaveBeenCalledWith("shift_quest_help_update", "1111111111", HELP, "claim", null);
    expect(via).toEqual(["update"]);
    expectCard(sent[0], "success");
    expect(bodyText(sent[0])).toBe(`### ✅ รับเรื่องแล้ว\n-# นักเรียนจะได้รับแจ้งใน /inbox`);
    expect(customIds(sent[0])).toEqual(["sq|rv_list|help"]);

    // Resolve asks for a note first, then replies privately.
    const r = interaction("button");
    await ACTION_HANDLERS.get("rv_hact")!(r.i, c, [HELP, "resolve"]);
    expect(r.modals[0].custom_id).toBe(`sq|rv_hact|${HELP}|resolve`);
    const m = interaction("modal", { fields: fields({ note: "ดูแลแล้ว" }) });
    await ACTION_HANDLERS.get("rv_hact")!(m.i, c, [HELP, "resolve"]);
    expect(api.call).toHaveBeenCalledWith("shift_quest_help_update", "1111111111", HELP, "resolve", "ดูแลแล้ว");
    expect(m.via).toEqual(["reply"]);
  });
});

describe("/review awards", () => {
  it("lists stuck coins with the reason and retries with the same call", async () => {
    const items = [{ instance_id: INST, title: "แอป", student: "ฝน", reason: "contributions_pending" }];
    const { c, api } = ctx(() => items);
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("review awards")!(i, c);
    expect(api.call).toHaveBeenCalledWith("shift_quest_awards_pending", "1111111111");
    expectCard(sent[0], "coins");
    expect(bodyText(sent[0])).toContain("**แอป** · ฝน\n-# รอเพื่อนร่วมทีมยืนยันส่วนที่ทำก่อน");
    expect(customIds(sent[0])).toEqual(["sq|rv_award", "sq|rv_list|queue"]);

    const retry = ctx(() => ({ issued: false, reason: "cap_reached" }));
    const r = interaction("select", { values: [INST] });
    await ACTION_HANDLERS.get("rv_award")!(r.i, retry.c, []);
    expect(retry.api.call).toHaveBeenCalledWith("shift_quest_issue_award", "1111111111", INST);
    expectCard(r.sent[0], "warn");
    expect(bodyText(r.sent[0])).toContain("ครบจำนวนครั้งสูงสุดของกติกานี้แล้ว");
    expect(customIds(r.sent[0])).toEqual(["sq|rv_list|awards"]);

    const ok = ctx(() => ({ issued: true }));
    const o = interaction("select", { values: [INST] });
    await ACTION_HANDLERS.get("rv_award")!(o.i, ok.c, []);
    expectCard(o.sent[0], "success");
    expect(bodyText(o.sent[0])).toBe(`### ${RV.retried}`);
  });
});

describe("moving between the mentor lists (rv_list)", () => {
  it("re-shows a list in place with the same call as its command", async () => {
    const calls: [string, string][] = [
      ["queue", "shift_quest_review_queue"],
      ["help", "shift_quest_help_queue"],
      ["awards", "shift_quest_awards_pending"],
    ];
    for (const [which, fn] of calls) {
      const { c, api } = ctx((name) => (name === "shift_quest_review_queue" ? { submissions: [], proposals: [], help_open: 0 } : []));
      const { i, sent, via } = interaction("button");
      await ACTION_HANDLERS.get("rv_list")!(i, c, [which]);
      expect([which, api.call.mock.calls]).toEqual([which, [[fn, "1111111111"]]]);
      expect(via).toEqual(["update"]);
      expectCard(sent[0], which === "awards" ? "coins" : "staff");
    }
  });

  it("ignores an unknown list and refuses non-reviewers", async () => {
    const { c, api } = ctx(() => []);
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("rv_list")!(i, c, ["constructor"]);
    expect(api.call).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);

    const student = ctx(() => [], []);
    await expect(ACTION_HANDLERS.get("rv_list")!(interaction("button").i, student.c, ["queue"])).rejects.toThrow();
    expect(student.api.call).not.toHaveBeenCalled();
  });
});

describe("/fulfill", () => {
  const request = (n: number) => ({
    id: INST,
    item: `สติกเกอร์ ${n}`,
    cost: 10,
    status: "reserved",
    student: `นักเรียน${n}`,
    created_at: "2026-11-10T03:00:00Z",
    own: false,
  });

  it("is one staff card that keeps the parent-only delivery rule and fits a long queue", async () => {
    const { c, api } = ctx(() => Array.from({ length: 40 }, (_, n) => request(n)), ["fulfillment"]);
    const { i, sent } = interaction("command");
    await COMMAND_HANDLERS.get("fulfill")!(i, c);
    expect(api.call).toHaveBeenCalledWith("shift_quest_fulfill_queue", "1111111111");
    expectCard(sent[0]);
    const text = bodyText(sent[0]);
    expect(text).toContain("ผู้ปกครองเป็นคนกรอก");
    expect(text).toContain("ห้ามถามที่อยู่ในห้องแชทหรือ DM");
    expect(customIds(sent[0])).toEqual(["sq|fl_pick"]);
  });

  it("updates a request with the same call", async () => {
    const { c, api } = ctx(() => "processing", ["fulfillment"]);
    const { i, sent } = interaction("button");
    await ACTION_HANDLERS.get("fl_act")!(i, c, [INST, "start"]);
    expect(api.call).toHaveBeenCalledWith("shift_quest_fulfill_update", "1111111111", INST, "start", null);
    expectCard(sent[0], "success");
  });
});
