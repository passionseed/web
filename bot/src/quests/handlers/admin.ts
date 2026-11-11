/**
 * Program administrators and fulfillment operators. Every setting change is a
 * database call that refuses incomplete reward configurations.
 */
import { MessageFlags } from "discord.js";

import { QuestError } from "../api";
import { requireStaff } from "../context";
import { BLOCKER, T, bkkDate, safe } from "../copy";
import { cid, isUuid } from "../ids";
import { ButtonStyle, button, buttonRows, modal, parseDate, selectRow, show, textValue } from "../ui";
import { ledgerReason } from "./student";
import { picked, type HandlerSet } from "./types";

const ADMIN = ["admin"];
const FULFILLMENT = ["fulfillment"];
const SNOWFLAKE = /^\d{5,25}$/;

interface SeasonAdmin {
  id: string;
  name: string;
  status: string;
  starts_on: string;
  ends_on: string;
  demo_day: string;
  table_bar: number;
  stage_bar: number;
  /** Surprise recognitions (no category) per member in this season. */
  surprise_cap?: number;
  goal: {
    milestone: number;
    target: number;
    count: number;
    deadline: string;
    unlock: string | null;
    reached?: boolean;
    reached_at?: string | null;
  } | null;
  unlocks: { id: string; label: string; milestone_count: number; deadline: string; reward_rule_key: string | null; earned: number }[];
}

function renderGoal(goal: SeasonAdmin["goal"]): string {
  if (!goal) return "🎯 ยังไม่มีเป้าทั้งเกาะ";
  const unlock = goal.unlock ? ` → ${safe(goal.unlock, 80)}` : "";
  let reached = "";
  if (goal.reached) reached = ` · ถึงเป้าแล้ว${goal.reached_at ? ` (${bkkDate(goal.reached_at)})` : ""}`;
  return `🎯 เป้าทั้งเกาะ: ${goal.count}/${goal.target} ต้นผ่านขั้น ${goal.milestone} ภายใน ${bkkDate(goal.deadline)}${unlock}${reached}`;
}

/** The season as admins see it: dates, bars, the island goal and unlocks (counts only). */
export function renderSeason(s: SeasonAdmin): string {
  return [
    `🎪 **${safe(s.name, 60)}** (${s.status}) ${bkkDate(s.starts_on)} ถึง ${bkkDate(s.ends_on)} · Demo Day ${bkkDate(s.demo_day)}`,
    `โต๊ะโชว์งาน: ${s.table_bar} ขั้น รวมขั้น 2 · ขึ้นเวที: ${s.stage_bar} ขั้น รวมขั้น 3 (นับขั้นที่ส่งในซีซันจนจบ Demo Day และพี่เลี้ยงยืนยันแล้ว)`,
    renderGoal(s.goal),
    ...(s.unlocks.length
      ? s.unlocks.map((u) => `🎁 ${safe(u.label, 60)}: ครบ ${u.milestone_count} ขั้นภายใน ${bkkDate(u.deadline)}${u.reward_rule_key ? ` (กติกา ${u.reward_rule_key})` : ""} · ได้แล้ว ${u.earned} คน`)
      : ["🎁 ยังไม่มีของปลดล็อก"]),
    ...(typeof s.surprise_cap === "number"
      ? [`🌟 คำชมแบบเซอร์ไพรส์: ได้ ${s.surprise_cap} ครั้งต่อคนในซีซันนี้ (รางวัลตามหมวดไม่นับ)`]
      : []),
    "",
    "ของปลดล็อกได้เท่ากันทุกคนที่ถึงเกณฑ์ ไม่ผูกกับความเร็ว ไม่มีการจัดอันดับ",
    "-# แก้ซีซัน: /admin season ใส่ชื่อกับเฉพาะค่าที่จะเปลี่ยน ค่าที่เว้นไว้คงเดิม · ลบเป้าทั้งเกาะ: clear_goal · เพดานคำชมเซอร์ไพรส์: surprise_cap",
  ].join("\n");
}

interface Status {
  settings: Record<string, unknown> & { student_role_ids: string[] };
  live: { awards: boolean; redemption: boolean };
  blockers: Record<string, string[]>;
  rules: { key: string; version: number; amount: number; cap: number | null; team_allocation: string | null }[];
  staff: Record<string, number>;
  outbox: { pending: number; blocked: number; failed: number };
  data_requests_open: number;
}

function onOff(value: unknown): string {
  return value ? "เปิด" : "ปิด";
}

function channel(id: unknown): string {
  return typeof id === "string" ? `<#${id}>` : "ยังไม่ตั้ง";
}

function renderStatus(s: Status): string {
  const st = s.settings;
  const blockers = (key: string) =>
    s.blockers[key]?.length ? `\n  ยังขาด: ${s.blockers[key].map((b) => BLOCKER[b] ?? b).join(", ")}` : "";
  return [
    "**SHIFT High quests: สถานะ**",
    `บทบาทนักเรียนนำร่อง: ${st.student_role_ids.length ? st.student_role_ids.map((r) => `<@&${r}>`).join(" ") : "ยังไม่ตั้ง (นักเรียนยังใช้ไม่ได้)"}`,
    `ห้อง help: ${channel(st.help_channel_id)} · ห้องทีมพี่เลี้ยง: ${channel(st.staff_channel_id)}`,
    `ห้องโพสต์ความสำเร็จ: ${channel(st.celebrate_channel_id)} · ห้อง coworking: ${channel(st.coworking_channel_id)}`,
    "",
    `เหรียญ: ${onOff(st.awards_enabled)}${s.live.awards ? " (ใช้งานอยู่)" : ""}${blockers("awards")}`,
    `แลกของ: ${onOff(st.redemption_enabled)}${s.live.redemption ? " (ใช้งานอยู่)" : ""}${blockers("redemption")}`,
    `แชร์สาธารณะ: ${onOff(st.sharing_enabled)}${blockers("sharing")}`,
    `การเตือน: ${onOff(st.reminders_enabled)} · สควอด: ${onOff(st.squads_enabled)}`,
    `กติกาเหรียญประกาศแล้ว: ${onOff(st.reward_terms)} · เงื่อนไขแลก: ${onOff(st.redemption_terms)} · ขั้นตอนจัดส่ง: ${onOff(st.fulfillment_process)} · ผู้รับผิดชอบ: ${safe(st.fulfillment_owner as string | null, 60) || "ยังไม่ระบุ"}`,
    "",
    `กติกาเหรียญ: ${s.rules.length ? s.rules.map((r) => `${r.key} v${r.version} = ${r.amount}${r.cap ? ` (สูงสุด ${r.cap})` : ""}${r.team_allocation ? ` ทีม: ${r.team_allocation}` : ""}`).join(" · ") : "ไม่มี"}`,
    `ทีม: admin ${s.staff.admin} · reviewer ${s.staff.reviewer} · fulfillment ${s.staff.fulfillment}`,
    `ข้อความรอส่ง ${s.outbox.pending} · รอตั้งห้อง/รอเปิดแชร์ ${s.outbox.blocked} · ส่งไม่สำเร็จ ${s.outbox.failed}`,
    `คำขอเรื่องข้อมูลที่เปิดอยู่: ${s.data_requests_open}`,
  ].join("\n");
}

const TERMS_LABEL: Record<string, string> = {
  reward_terms: "กติกาเหรียญ (นักเรียนเห็น)",
  redemption_terms: "เงื่อนไขการแลก (นักเรียนเห็น)",
  fulfillment_process: "ขั้นตอนจัดส่ง: ผู้ปกครองกรอกข้อมูลยังไง",
  fulfillment_owner: "ผู้รับผิดชอบจัดส่ง",
};

/** The island block of shift_quest_admin_report: counts only, never a name. */
interface IslandReport {
  projects_by_stage?: Record<string, number> | null;
  taps_in_window?: number | null;
  members_resting?: number | null;
  unlocks_earned_in_window?: number | null;
  recognitions_in_window?: number | null;
  /** Running squads only (3 or more active members inside their window). */
  squads_active?: number | null;
  /** Squads with someone in them but fewer than 3 active members. */
  squads_forming?: number | null;
  season?: {
    demo_day?: string | null;
    goal?: { count?: number; target?: number } | null;
    /** Confirmed: approved work only. */
    projects_at_table_bar?: number | null;
    projects_at_stage_bar?: number | null;
    /** Also counting work submitted in the season that still waits for a mentor. */
    projects_at_table_bar_with_pending?: number | null;
    projects_at_stage_bar_with_pending?: number | null;
    /** Milestone submissions in the season window a mentor has not decided yet. */
    milestones_pending_review?: number | null;
    unlocks_earned?: number | null;
  } | null;
}

function count(n: unknown): string {
  return typeof n === "number" ? String(n) : "-";
}

export function renderIslandReport(isl: IslandReport | null | undefined): string[] {
  if (!isl) return [];
  const stages = Object.entries(isl.projects_by_stage ?? {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([stage, n]) => `ขั้น ${stage}: ${n}`)
    .join(" · ");
  const lines = [
    "",
    "**เกาะ**",
    `ต้นไม้ตามขั้น: ${stages || "ยังไม่มี"}`,
    `กดลงมือในช่วงนี้ ${count(isl.taps_in_window)} ครั้ง · กำลังพัก ${count(isl.members_resting)} คน`,
    `ปลดล็อกในช่วงนี้ ${count(isl.unlocks_earned_in_window)} · คำชมในช่วงนี้ ${count(isl.recognitions_in_window)} · สควอดที่กำลังวิ่ง ${count(isl.squads_active)} · กำลังรวมคน ${count(isl.squads_forming)}`,
  ];
  const s = isl.season;
  if (!s) {
    lines.push("ซีซัน: ไม่มีที่เปิดอยู่");
    return lines;
  }
  const withPending = (confirmed: unknown, pending: unknown): string =>
    `${count(confirmed)}${typeof pending === "number" && pending !== confirmed ? ` (รวมงานที่รอพี่เลี้ยงยืนยัน ${pending})` : ""}`;
  lines.push(
    `ซีซัน: Demo Day ${bkkDate(s.demo_day)} · ถึงเกณฑ์โต๊ะ ${withPending(s.projects_at_table_bar, s.projects_at_table_bar_with_pending)} โปรเจกต์ · ถึงเกณฑ์เวที ${withPending(s.projects_at_stage_bar, s.projects_at_stage_bar_with_pending)} · ปลดล็อกทั้งซีซัน ${count(s.unlocks_earned)}${
      s.goal ? ` · เป้าทั้งเกาะ ${count(s.goal.count)}/${count(s.goal.target)}` : ""
    }`
  );
  if (typeof s.milestones_pending_review === "number" && s.milestones_pending_review > 0) {
    lines.push(
      `⏳ งานขั้นในซีซันที่รอพี่เลี้ยงยืนยัน ${s.milestones_pending_review} ชิ้น (ส่งทันกำหนดแล้ว) ตรวจใน /review queue ก่อน Demo Day เพื่อให้รู้โต๊ะและเวทีจริง`
    );
  }
  return lines;
}

function renderReport(r: Record<string, any>): string {
  const breakdown = (o: Record<string, number> | null | undefined): string =>
    o && Object.keys(o).length ? Object.entries(o).map(([k, v]) => `${k} ${v}`).join(", ") : "0";
  return [
    `**รายงานรวม ${r.window_days} วันล่าสุด** (ตัวเลขรวมเท่านั้น ไม่ระบุตัวบุคคล)`,
    `เริ่มใช้แล้ว ${r.members_onboarded} คน · เริ่มลงมือแล้ว ${r.members_started}`,
    `บันทึกความคืบหน้าในช่วงนี้ ${r.members_with_progress_in_window} คน · ส่งงาน ${r.members_submitting_in_window} คน`,
    `เควสต์ตามสถานะ: ${breakdown(r.quests_by_state)}`,
    `ผลรีวิวในช่วงนี้: ${breakdown(r.reviews_in_window)} · ค้างรีวิว ${r.review_backlog} · มัธยฐานเวลารีวิว ${r.review_median_hours ?? "-"} ชม.`,
    `โปรเจกต์ที่มีผลทดสอบกับคนจริงและการตัดสินใจ: ${r.projects_with_feedback_decision}`,
    `ความเป็นเจ้าของ: เช็กครบ ${r.ownership.all_checks_done}/${r.ownership.projects} โปรเจกต์ · ติดอยู่ ${r.ownership.with_blocker}`,
    `ความช่วยเหลือ: เปิดใหม่ ${r.help.opened_in_window} · ปิดแล้ว ${r.help.resolved_in_window} · ค้าง ${r.help.open_now}`,
    `เหรียญ: ออก ${r.coins.awarded_in_window} · ปรับคืน ${r.coins.reversed_in_window} · คนที่เคยได้ ${r.coins.members_awarded} · อนุมัติแต่ยังไม่ออก ${r.coins.awards_not_issued}`,
    `การแลก: ${breakdown(r.redemptions)}`,
    `แชร์: โพสต์ ${r.sharing.posted} · เพื่อนปฏิเสธ ${r.sharing.peer_declined}`,
    `ส่งข้อความไม่สำเร็จ ${r.delivery.failed} · รอห้อง ${r.delivery.blocked} · การเข้าถึงที่ถูกปฏิเสธ ${r.access_denied_in_window}`,
    ...renderIslandReport(r.island),
    "",
    "ตัวเลขกิจกรรมไม่ได้บอกแรงจูงใจภายใน อ่านคู่กับความเห็นของนักเรียนและเกณฑ์ที่ตกลงไว้ก่อนนำร่อง",
  ].join("\n");
}

export const admin: HandlerSet = {
  commands: {
    async "admin status"(i, ctx) {
      requireStaff(ctx, ADMIN);
      await show(i, { content: renderStatus(await ctx.api.call<Status>("shift_quest_admin_status", ctx.userId)) });
    },

    async "admin feature"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const status = await ctx.api.call<Status>(
        "shift_quest_admin_set",
        ctx.userId,
        i.options.getString("name", true),
        i.options.getString("state", true)
      );
      await show(i, { content: renderStatus(status) });
    },

    async "admin channel"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const status = await ctx.api.call<Status>(
        "shift_quest_admin_set",
        ctx.userId,
        `${i.options.getString("kind", true)}_channel`,
        i.options.getChannel("channel")?.id ?? ""
      );
      await show(i, { content: renderStatus(status) });
    },

    async "admin student-role"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const status = await ctx.api.call<Status>(
        "shift_quest_admin_set",
        ctx.userId,
        i.options.getString("action", true) === "remove" ? "student_role_remove" : "student_role_add",
        i.options.getRole("role", true).id
      );
      await show(i, { content: renderStatus(status) });
    },

    async "admin terms"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const kind = i.options.getString("kind", true);
      if (!TERMS_LABEL[kind]) return;
      await i.showModal(
        modal(cid("ad_terms", kind), TERMS_LABEL[kind], [
          {
            kind: "text",
            id: "text",
            label: TERMS_LABEL[kind],
            description: "เว้นว่างเพื่อล้าง (ฟีเจอร์ที่ต้องใช้ข้อความนี้จะปิดเอง)",
            long: true,
            max: 3000,
          },
        ])
      );
    },

    async "admin role"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const user = i.options.getUser("user", true);
      const member = i.options.getMember("user");
      const name = member && "displayName" in member ? member.displayName : user.globalName ?? user.username;
      const result = await ctx.api.call<{ roles: string[] }>(
        "shift_quest_admin_role",
        ctx.userId,
        user.id,
        name,
        i.options.getString("role", true),
        i.options.getString("action", true) === "grant"
      );
      await show(i, { content: `<@${user.id}>: ${result.roles.join(", ") || "ไม่มีบทบาท"}` });
    },

    async "admin rule"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const key = i.options.getString("key", true);
      const amount = i.options.getInteger("amount", true);
      const cap = i.options.getInteger("cap");
      const team = i.options.getString("team_allocation");
      await i.showModal(
        modal(cid("ad_rule", key, amount, cap ?? "", team ?? ""), `กติกา ${key}: ${amount} เหรียญ`, [
          { kind: "text", id: "eligibility", label: "ได้เมื่อไหร่ (นักเรียนเห็น)", long: true, required: true, max: 1000 },
          { kind: "text", id: "review", label: "รีวิวยังไง", long: true, required: true, max: 1000 },
          { kind: "text", id: "reversal", label: "ปรับคืนและอุทธรณ์ยังไง", long: true, required: true, max: 1000 },
        ])
      );
    },

    async "admin template-rule"(i, ctx) {
      requireStaff(ctx, ADMIN);
      await ctx.api.call(
        "shift_quest_admin_template_rule",
        ctx.userId,
        i.options.getString("template", true),
        i.options.getString("rule") ?? null
      );
      await show(i, { content: `${T.done} มีผลกับเควสต์ที่เลือกหลังจากนี้ เควสต์เดิมใช้กติกาเดิม` });
    },

    async "admin templates"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const list = await ctx.api.call<{ slug: string; version: number; title: string; status: string; reward_rule_key: string | null }[]>(
        "shift_quest_admin_templates",
        ctx.userId
      );
      await show(i, {
        content: list.map((t) => `• \`${t.slug}\` v${t.version} ${safe(t.title, 60)}: ${t.status}${t.reward_rule_key ? ` · กติกา ${t.reward_rule_key}` : ""}`).join("\n"),
      });
    },

    async "admin template"(i, ctx) {
      requireStaff(ctx, ADMIN);
      await ctx.api.call(
        "shift_quest_admin_template_state",
        ctx.userId,
        i.options.getString("template", true),
        i.options.getBoolean("publish", true)
      );
      await show(i, { content: T.done });
    },

    async "admin catalog"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const item = i.options.getString("item");
      const result = await ctx.api.call<{ name: string; cost: number; stock_available: number; active: boolean }>(
        "shift_quest_admin_catalog",
        ctx.userId,
        item && isUuid(item) ? item : null,
        i.options.getString("name"),
        i.options.getString("description"),
        i.options.getInteger("cost"),
        i.options.getInteger("stock_change"),
        i.options.getBoolean("active")
      );
      const list = await ctx.api.call<{ name: string; cost: number; stock_available: number; active: boolean; reserved: number }[]>(
        "shift_quest_admin_catalog_list",
        ctx.userId
      );
      await show(i, {
        content: [
          `บันทึก **${safe(result.name, 80)}** แล้ว`,
          "",
          ...list.map((x) => `• ${safe(x.name, 60)} ${x.cost} เหรียญ · เหลือ ${x.stock_available} · จองอยู่ ${x.reserved} · ${x.active ? "เปิด" : "ปิด"}`),
          "",
          "แสดงให้นักเรียนเห็นเฉพาะตอนที่การแลกเปิดและตั้งค่าครบแล้ว",
        ].join("\n"),
      });
    },

    async "admin ledger"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const user = i.options.getUser("user", true);
      const ledger = await ctx.api.call<{
        name: string | null;
        balance: number;
        entries: { id: string; amount: number; kind: string; reason: string; created_at: string; reversed: number; title: string | null; category?: string | null }[];
      }>("shift_quest_admin_ledger", ctx.userId, user.id);
      const awards = ledger.entries.filter((e) => e.kind === "award" && e.reversed < e.amount);
      await show(i, {
        content: [
          `**${safe(ledger.name, 60)}** ยอด ${ledger.balance}`,
          ...ledger.entries.map((e) => `${bkkDate(e.created_at)} ${e.amount > 0 ? "+" : ""}${e.amount} ${ledgerReason(e.kind, e.reason, e.title, e.category)}${e.reversed ? ` (ปรับคืนแล้ว ${e.reversed})` : ""}`),
        ].join("\n"),
        rows: awards.length
          ? [
              selectRow(
                cid("ad_rev"),
                "ปรับคืนรายการ (ต้องมีเหตุผล นักเรียนจะเห็น)",
                awards.map((e) => ({ label: `${bkkDate(e.created_at)} +${e.amount} ${e.title ?? ""}`, value: e.id }))
              ),
            ]
          : [],
      });
    },

    async "admin report"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const report = await ctx.api.call<Record<string, any>>("shift_quest_admin_report", ctx.userId, i.options.getInteger("days") ?? 14);
      await show(i, { content: renderReport(report) });
    },

    async "admin season"(i, ctx) {
      requireStaff(ctx, ADMIN);
      // Every option but the name may be left out: on an edit the database
      // keeps the stored value for each one, so re-running with one change
      // never wipes the goal or the bars. With only the name, this shows the
      // season (and its unlock button) without changing it. clear_goal is the
      // one way to remove the goal.
      const season = await ctx.api.call<SeasonAdmin>(
        "shift_quest_admin_season",
        ctx.userId,
        i.options.getString("name", true),
        parseDate(i.options.getString("starts")),
        parseDate(i.options.getString("ends")),
        parseDate(i.options.getString("demo_day")),
        i.options.getInteger("table_bar"),
        i.options.getInteger("stage_bar"),
        i.options.getInteger("goal_milestone"),
        i.options.getInteger("goal_target"),
        parseDate(i.options.getString("goal_deadline")),
        i.options.getString("goal_unlock"),
        i.options.getBoolean("activate") ?? false,
        i.options.getBoolean("clear_goal") ?? false,
        i.options.getInteger("surprise_cap")
      );
      await show(i, {
        content: renderSeason(season),
        rows: buttonRows([button(cid("ad_unlock", season.id), "🎁 เพิ่มของปลดล็อก", ButtonStyle.Primary)]),
      });
    },

    async "admin recognize"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const user = i.options.getUser("user", true);
      const amount = i.options.getInteger("amount", true);
      // The category rides in the modal, not the custom ID: an ID has room for
      // only part of the 80 characters the option allows, and it is kept forever.
      // This command's interaction ID is the request key: every submit of this
      // one modal (a retry after a slow reply) is the same recognition.
      await i.showModal(
        modal(cid("ad_recog", user.id, amount, i.id), "เหตุผล", [
          {
            kind: "text",
            id: "reason",
            label: "ชมเรื่องอะไร (นักเรียนเห็น)",
            description: "บันทึกถาวร ห้ามใส่ชื่อหรือข้อมูลส่วนตัว เล่าสิ่งที่เขาทำได้จริงแบบเจาะจง",
            long: true,
            required: true,
            max: 500,
          },
          {
            kind: "text",
            id: "category",
            label: "หมวด (ไม่บังคับ)",
            description: "บันทึกถาวร ห้ามใส่ชื่อหรือข้อมูลส่วนตัว",
            max: 80,
            value: i.options.getString("category"),
          },
        ])
      );
    },

    async "admin data"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const list = await ctx.api.call<{ id: string; kind: string; note: string | null; name: string | null; created_at: string }[]>(
        "shift_quest_admin_data_requests",
        ctx.userId
      );
      if (!list.length) {
        await show(i, { content: "ไม่มีคำขอที่เปิดอยู่" });
        return;
      }
      await show(i, {
        content: list
          .map((d) => `• ${bkkDate(d.created_at)} ${d.kind === "erasure" ? "ขอลบ" : "ขอแก้"}: ${safe(d.name, 60)}${d.note ? `: ${safe(d.note, 200)}` : ""}`)
          .join("\n"),
        rows: [selectRow(cid("ad_data"), "เลือกคำขอ", list.map((d) => ({ label: `${d.kind}: ${d.name ?? ""}`, value: `${d.id}:${d.kind}` })))],
      });
    },

    async fulfill(i, ctx) {
      requireStaff(ctx, FULFILLMENT);
      const queue = await ctx.api.call<{ id: string; item: string; cost: number; status: string; student: string | null; created_at: string; own: boolean }[]>(
        "shift_quest_fulfill_queue",
        ctx.userId
      );
      const mine = queue.filter((q) => !q.own);
      if (!mine.length) {
        await show(i, { content: "ไม่มีคำขอแลกที่รออยู่" });
        return;
      }
      await show(i, {
        content: [
          ...mine.map((q) => `• ${bkkDate(q.created_at)} ${safe(q.student, 60)}: ${safe(q.item, 60)} (${T.redemptionStatus[q.status] ?? q.status})`),
          "",
          "ข้อมูลจัดส่งให้ผู้ปกครองเป็นคนกรอก ผ่านแบบฟอร์มที่แชร์ในห้องกลุ่มหรือขั้นตอนที่อนุมัติแล้วเท่านั้น ห้ามถามที่อยู่ในห้องแชทหรือ DM",
        ].join("\n"),
        rows: [selectRow(cid("fl_pick"), "เลือกคำขอ", mine.map((q) => ({ label: `${q.student ?? ""}: ${q.item}`, value: q.id, description: q.status })))],
      });
    },
  },

  actions: {
    async ad_unlock(i, ctx, [seasonId]) {
      requireStaff(ctx, ADMIN);
      if (!isUuid(seasonId)) return;
      if (i.isModalSubmit()) {
        // Free text: anything but a digit 1 to 7 (a Thai numeral, a letter)
        // would reach Postgres as NaN and fail as an unexplained error.
        const milestoneCount = textValue(i, "count") ?? "";
        if (!/^[1-7]$/.test(milestoneCount)) throw new QuestError("bad_input");
        await ctx.api.call(
          "shift_quest_admin_unlock",
          ctx.userId,
          seasonId,
          textValue(i, "label"),
          Number(milestoneCount),
          parseDate(textValue(i, "deadline")),
          textValue(i, "rule")
        );
        await show(i, { content: `${T.done} ทุกคนที่ถึงเกณฑ์จะได้เท่ากัน และได้รับแจ้งใน /inbox` });
        return;
      }
      if (!i.isButton()) return;
      await i.showModal(
        modal(cid("ad_unlock", seasonId), "ของปลดล็อก", [
          { kind: "text", id: "label", label: "ได้อะไร (นักเรียนเห็น)", required: true, max: 80, placeholder: "สติกเกอร์ SHIFT High" },
          { kind: "text", id: "count", label: "ครบกี่ขั้น (1 ถึง 7)", required: true, max: 1 },
          { kind: "text", id: "deadline", label: "ภายในวันที่ (YYYY-MM-DD)", required: true, max: 10 },
          { kind: "text", id: "rule", label: "กติกาเหรียญ (ไม่บังคับ)", description: "ชื่อกติกาที่เผยแพร่แล้ว ถ้าอยากให้เหรียญด้วย", max: 40 },
        ])
      );
    },

    async ad_recog(i, ctx, [userId, amount, requestId]) {
      requireStaff(ctx, ADMIN);
      if (!i.isModalSubmit() || !SNOWFLAKE.test(userId ?? "") || !SNOWFLAKE.test(requestId ?? "") || !/^\d{1,6}$/.test(amount ?? "")) return;
      // Acknowledge first: a reply that misses Discord's window is what makes an admin press Submit again.
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      // The opening command's ID, carried in the custom ID, is the request key:
      // a resubmit of the same modal is a no-op. The modal submit's own ID is
      // new every time, so it must never be the key.
      const result = await ctx.api.call<{ duplicate: boolean }>(
        "shift_quest_admin_recognize",
        ctx.userId,
        userId,
        Number(amount),
        textValue(i, "reason"),
        textValue(i, "category"),
        `recog:${requestId}`
      );
      await show(i, { content: result.duplicate ? "บันทึกไปแล้ว" : `บันทึกแล้ว <@${userId}> ได้รับแจ้งใน /inbox` });
    },

    async ad_terms(i, ctx, [kind]) {
      requireStaff(ctx, ADMIN);
      if (!TERMS_LABEL[kind] || !i.isModalSubmit()) return;
      const status = await ctx.api.call<Status>("shift_quest_admin_set", ctx.userId, kind, textValue(i, "text") ?? "");
      await show(i, { content: renderStatus(status) });
    },

    async ad_rule(i, ctx, [key, amount, cap, team]) {
      requireStaff(ctx, ADMIN);
      if (!i.isModalSubmit()) return;
      const result = await ctx.api.call<{ key: string; version: number }>(
        "shift_quest_admin_rule",
        ctx.userId,
        key,
        Number(amount),
        cap ? Number(cap) : null,
        team || null,
        textValue(i, "eligibility"),
        textValue(i, "review"),
        textValue(i, "reversal")
      );
      await show(i, {
        content: `เผยแพร่ ${result.key} v${result.version} แล้ว เควสต์ที่เลือกไปแล้วใช้เวอร์ชันเดิม ผูกกับเควสต์ตัวอย่างด้วย /admin template-rule`,
      });
    },

    async ad_rev(i, ctx, args) {
      requireStaff(ctx, ADMIN);
      if (i.isModalSubmit()) {
        const [entryId, requestId] = args;
        if (!isUuid(entryId) || !SNOWFLAKE.test(requestId ?? "")) return;
        // Free text: anything but digits would reach Postgres as NaN and fail unexplained.
        const amount = textValue(i, "amount") ?? "";
        if (!/^\d{1,6}$/.test(amount)) throw new QuestError("bad_amount");
        await i.deferReply({ flags: MessageFlags.Ephemeral });
        // The select interaction that opened this modal is the request key: a
        // resubmit of the same modal is a no-op, never a second reversal.
        const result = await ctx.api.call<{ duplicate: boolean; balance?: number }>(
          "shift_quest_admin_reverse",
          ctx.userId,
          entryId,
          Number(amount),
          textValue(i, "reason"),
          `${entryId}:${requestId}`
        );
        await show(i, { content: result.duplicate ? "บันทึกไปแล้ว" : `ปรับคืนแล้ว ยอดใหม่ ${result.balance ?? ""} นักเรียนได้รับแจ้งเหตุผลใน /inbox` });
        return;
      }
      const entryId = picked(i, args);
      if (!isUuid(entryId) || !i.isStringSelectMenu()) return;
      await i.showModal(
        modal(cid("ad_rev", entryId, i.id), "ปรับคืนเหรียญ", [
          { kind: "text", id: "amount", label: "จำนวน", required: true, max: 6 },
          {
            kind: "text",
            id: "reason",
            label: "เหตุผล (นักเรียนจะเห็น)",
            description: "บันทึกถาวรในบัญชีเหรียญ ห้ามใส่ชื่อหรือข้อมูลส่วนตัว",
            long: true,
            required: true,
            max: 500,
          },
        ])
      );
    },

    async ad_data(i, ctx, args) {
      requireStaff(ctx, ADMIN);
      const value = picked(i, args) ?? "";
      const [id, kind] = value.split(":");
      if (!isUuid(id)) return;
      const buttons = [
        button(cid("ad_dclose", id, "done"), "ดำเนินการแล้ว", ButtonStyle.Success),
        button(cid("ad_dclose", id, "reject"), "ปฏิเสธ"),
      ];
      if (kind === "erasure") buttons.unshift(button(cid("ad_erase", id), "ลบข้อมูล", ButtonStyle.Danger));
      await show(
        i,
        { content: kind === "erasure" ? "ลบข้อมูลตามนโยบายที่ประกาศไว้ (ย้อนกลับไม่ได้)" : "แก้ข้อมูลตามที่ขอ แล้วกดดำเนินการแล้ว", rows: buttonRows(buttons) },
        { replace: true }
      );
    },

    async ad_dclose(i, ctx, [id, outcome]) {
      requireStaff(ctx, ADMIN);
      if (!isUuid(id)) return;
      await ctx.api.call("shift_quest_admin_data_close", ctx.userId, id, outcome === "done");
      await show(i, { content: T.done }, { replace: true });
    },

    async ad_erase(i, ctx, [id]) {
      requireStaff(ctx, ADMIN);
      if (!isUuid(id)) return;
      await show(
        i,
        {
          content:
            "**ยืนยันการลบ** บันทึก ข้อความ คำขอความช่วยเหลือ และการเชื่อม Discord ของคนนี้จะถูกลบถาวร ยอดเหรียญและสถานะเควสต์คงไว้แบบไม่ระบุตัวตน ย้อนกลับไม่ได้",
          rows: buttonRows([button(cid("ad_erase_go", id), "ลบถาวร", ButtonStyle.Danger), button(cid("noop"), T.btnCancel)]),
        },
        { replace: true }
      );
    },

    async ad_erase_go(i, ctx, [id]) {
      requireStaff(ctx, ADMIN);
      if (!isUuid(id)) return;
      await ctx.api.call("shift_quest_admin_erase", ctx.userId, id);
      await show(i, { content: "ลบแล้ว" }, { replace: true });
    },

    async fl_pick(i, ctx, args) {
      requireStaff(ctx, FULFILLMENT);
      const id = picked(i, args);
      if (!isUuid(id)) return;
      await show(
        i,
        {
          content: "อัปเดตคำขอ (นักเรียนจะได้รับแจ้งใน /inbox)",
          rows: buttonRows([
            button(cid("fl_act", id, "start"), "เริ่มดำเนินการ", ButtonStyle.Primary),
            button(cid("fl_act", id, "complete"), "เสร็จแล้ว", ButtonStyle.Success),
            button(cid("fl_act", id, "cancel"), "ยกเลิกและคืนเหรียญ", ButtonStyle.Danger),
          ]),
        },
        { replace: true }
      );
    },

    async fl_act(i, ctx, [id, action]) {
      requireStaff(ctx, FULFILLMENT);
      if (!isUuid(id) || !["start", "complete", "cancel"].includes(action)) return;
      if (action === "cancel" && i.isButton()) {
        await i.showModal(
          modal(cid("fl_act", id, action), "ยกเลิกคำขอ", [
            { kind: "text", id: "note", label: "เหตุผล (นักเรียนจะเห็น)", long: true, required: true, max: 500 },
          ])
        );
        return;
      }
      const result = await ctx.api.call<string>(
        "shift_quest_fulfill_update",
        ctx.userId,
        id,
        action,
        i.isModalSubmit() ? textValue(i, "note") : null
      );
      await show(i, { content: result === "unchanged" ? "สถานะเปลี่ยนไปแล้ว ไม่มีอะไรเปลี่ยน" : T.done }, { replace: !i.isModalSubmit() });
    },
  },

  autocomplete: {
    async "admin catalog"(i, ctx) {
      if (!ctx.session.roles.includes("admin")) {
        await i.respond([]);
        return;
      }
      const list = await ctx.api.call<{ id: string; name: string; cost: number }[]>("shift_quest_admin_catalog_list", ctx.userId);
      const q = i.options.getFocused().toLowerCase();
      await i.respond(
        list
          .filter((x) => x.name.toLowerCase().includes(q))
          .slice(0, 25)
          .map((x) => ({ name: `${x.name} (${x.cost})`.slice(0, 100), value: x.id }))
      );
    },
  },
};
