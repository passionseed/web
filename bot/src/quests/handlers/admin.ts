/**
 * Program administrators and fulfillment operators. Every setting change is a
 * database call that refuses incomplete reward configurations. Every reply is
 * one compact card (see ../view): what it is, the facts that matter, then the
 * fine print in small grey text.
 */
import { ChannelType, MessageFlags, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";

import { QuestDbError, QuestError } from "../api";
import { openToStudents } from "../campfire";
import { requireStaff, type Ctx } from "../context";
import { BLOCKER, STAFF_AWARD_LABEL, T, bkkDate, safe } from "../copy";
import { cid, isUuid } from "../ids";
import { I, stageBar } from "../island/copy";
import { ButtonStyle, GateError, button, buttonRows, modal, parseDate, selectRow, show, textValue, type Block, type View } from "../ui";
import { ledgerReason } from "./student";
import { picked, type HandlerSet } from "./types";

const ADMIN = ["admin"];
const FULFILLMENT = ["fulfillment"];
const SNOWFLAKE = /^\d{5,25}$/;

/** Season unlocks listed on the season card; the rest are counted. */
const UNLOCKS_SHOWN = 6;
/** Published coin rules listed in the status fine print; the rest are counted. */
const RULES_SHOWN = 6;

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

/** count of target as a ten-step bar: ▰▰▰▱▱▱▱▱▱▱. */
function goalBar(count: number, target: number): string {
  const steps = 10;
  return stageBar(target > 0 ? Math.round((Math.min(Math.max(count, 0), target) / target) * steps) : 0, steps);
}

function goalLines(goal: SeasonAdmin["goal"]): string[] {
  if (!goal) return ["🎯 ยังไม่มีเป้าทั้งเกาะ"];
  const unlock = goal.unlock ? ` → ${safe(goal.unlock, 80)}` : "";
  const reached = goal.reached ? ` · ถึงเป้าแล้ว${goal.reached_at ? ` (${bkkDate(goal.reached_at)})` : ""}` : "";
  return [
    `🎯 เป้าทั้งเกาะ: ${goal.target} ต้นผ่านขั้น ${goal.milestone} ภายใน ${bkkDate(goal.deadline)}${unlock}`,
    `${goalBar(goal.count, goal.target)} **${goal.count}**/${goal.target}${reached}`,
  ];
}

/** The season as admins see it: dates, bars, the island goal and unlocks (counts only). */
export function seasonView(s: SeasonAdmin): View {
  const unlocks = s.unlocks.length
    ? s.unlocks
        .slice(0, UNLOCKS_SHOWN)
        .map(
          (u) =>
            `🎁 ${safe(u.label, 60)}: ครบ ${u.milestone_count} ขั้นภายใน ${bkkDate(u.deadline)}${u.reward_rule_key ? ` (กติกา ${u.reward_rule_key})` : ""} · ได้แล้ว **${u.earned}** คน`
        )
    : ["🎁 ยังไม่มีของปลดล็อก"];
  if (s.unlocks.length > UNLOCKS_SHOWN) unlocks.push(I.more(s.unlocks.length - UNLOCKS_SHOWN));
  return {
    tone: "season",
    title: `🎪 ${safe(s.name, 60)}`,
    blocks: [
      {
        kind: "text",
        text: [
          `${s.status} · ${bkkDate(s.starts_on)} ถึง ${bkkDate(s.ends_on)} · Demo Day **${bkkDate(s.demo_day)}**`,
          `โต๊ะโชว์งาน **${s.table_bar}** ขั้น (รวมขั้น 2) · ขึ้นเวที **${s.stage_bar}** ขั้น (รวมขั้น 3)`,
        ].join("\n"),
      },
      { kind: "subtext", text: "นับขั้นที่ส่งในซีซันจนจบ Demo Day และพี่เลี้ยงยืนยันแล้ว" },
      { kind: "text", text: [...goalLines(s.goal), ...unlocks].join("\n") },
      ...(typeof s.surprise_cap === "number"
        ? [{ kind: "text" as const, text: `🌟 คำชมแบบเซอร์ไพรส์: ได้ ${s.surprise_cap} ครั้งต่อคนในซีซันนี้ (รางวัลตามหมวดไม่นับ)` }]
        : []),
      { kind: "divider", line: false },
      {
        kind: "subtext",
        text: [
          "ของปลดล็อกได้เท่ากันทุกคนที่ถึงเกณฑ์ ไม่ผูกกับความเร็ว ไม่มีการจัดอันดับ",
          "แก้ซีซัน: /admin season ใส่ชื่อกับเฉพาะค่าที่จะเปลี่ยน ค่าที่เว้นไว้คงเดิม · ลบเป้าทั้งเกาะ: clear_goal · เพดานคำชมเซอร์ไพรส์: surprise_cap",
        ].join("\n"),
      },
    ],
    rows: buttonRows([button(cid("ad_unlock", s.id), "🎁 เพิ่มของปลดล็อก", ButtonStyle.Primary)]),
  };
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

/** ✅ configured, ⚠️ missing. */
function check(ok: unknown): string {
  return ok ? "✅" : "⚠️";
}

/**
 * `hint` follows the line, set or not: what an admin should know when choosing
 * the channel. An optional channel is ⚪ while unset (nothing is held back by
 * it), and its line is left out on a database too old to have it.
 */
const CHANNELS: { key: string; label: string; hint?: string; optional?: boolean }[] = [
  { key: "help_channel_id", label: "ห้อง help" },
  { key: "staff_channel_id", label: "ห้องทีมพี่เลี้ยง" },
  { key: "celebrate_channel_id", label: "ห้องโพสต์ความสำเร็จ" },
  // A voice channel works too: intention posts land in its text chat, and the campfire (schema 7) shows who is in it.
  { key: "coworking_channel_id", label: "ห้อง coworking", hint: "ห้องเสียงได้: คนในห้องจะนั่งรอบกองไฟบนเกาะ" },
  // Schema 8: the live island post (../live.ts) and the suggestions forum the web island links to.
  { key: "live_channel_id", label: "ห้องเกาะสด", hint: "บอทแก้โพสต์เดียวในห้องนี้ ไม่โพสต์ซ้ำ", optional: true },
  { key: "suggest_channel_id", label: "ห้องเสนอไอเดีย", hint: "ฟอรัมได้ ลิงก์อยู่ในเมนู ⋯ บนเว็บ", optional: true },
];

/** What the bot needs in the live channel to keep its one post there: see it, post, attach the picture, find it again. */
const LIVE_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.ReadMessageHistory,
];

/**
 * Whether the bot can keep the live post in this channel, as far as the
 * gateway cache tells. Unknown (no cached channel or bot member) is not
 * refused: the live post then logs once and retries every minute. Pinning is
 * left out on purpose: without it the post still works, only unpinned.
 */
function botCanKeepLivePost(i: ChatInputCommandInteraction, channelId: string): boolean {
  const me = i.guild?.members.me;
  const channel = i.guild?.channels.cache.get(channelId) as
    | { permissionsFor?: (member: NonNullable<typeof me>) => { has: (permissions: bigint[]) => boolean } | null }
    | undefined;
  if (!me || typeof channel?.permissionsFor !== "function") return true;
  return channel.permissionsFor(me)?.has(LIVE_PERMISSIONS) ?? false;
}

/** The switches /admin feature turns on and off, with the blocker list each one has. */
const FEATURES: { key: string; label: string; setting: string }[] = [
  { key: "awards", label: "เหรียญ", setting: "awards_enabled" },
  { key: "redemption", label: "แลกของ", setting: "redemption_enabled" },
  { key: "sharing", label: "แชร์สาธารณะ", setting: "sharing_enabled" },
  { key: "reminders", label: "การเตือน", setting: "reminders_enabled" },
  { key: "squads", label: "สควอด", setting: "squads_enabled" },
];

/**
 * One switch: ✅ on and working, ⚠️ on but not working yet, ⚪ off. Whatever
 * it still needs is listed under it (with the command that fixes it), on or off.
 */
function featureLines(s: Status, f: (typeof FEATURES)[number]): string[] {
  const on = Boolean(s.settings[f.setting]);
  const missing = s.blockers[f.key] ?? [];
  const reported = (s.live as Record<string, boolean | undefined>)[f.key];
  const working = reported ?? !missing.length;
  let head: string;
  if (!on) head = `⚪ ${f.label}: ปิด`;
  else if (working) head = `✅ ${f.label}: เปิด${typeof reported === "boolean" ? " ใช้งานอยู่" : ""}`;
  else head = `⚠️ ${f.label}: เปิด แต่ยังใช้ไม่ได้`;
  return [head, ...missing.map((b) => `- ${BLOCKER[b] ?? b}`)];
}

/** The settings as a checklist: what is set, what is missing, what is on, then the counts. */
export function statusView(s: Status, saved = false): View {
  const st = s.settings;
  const setup: string[] = [
    st.student_role_ids.length
      ? `✅ บทบาทนักเรียน: ${st.student_role_ids.map((r) => `<@&${r}>`).join(" ")}`
      : "⚠️ บทบาทนักเรียน: ยังไม่ตั้ง นักเรียนยังใช้ไม่ได้ (/admin student-role)",
  ];
  let channelMissing = false;
  for (const c of CHANNELS) {
    // A database older than the setting has no key for it: say nothing about it.
    if (c.optional && !(c.key in st)) continue;
    const id = st[c.key];
    const hint = c.hint ? ` (${c.hint})` : "";
    if (typeof id === "string") setup.push(`✅ ${c.label}: <#${id}>${hint}`);
    else {
      channelMissing = true;
      setup.push(`${c.optional ? "⚪" : "⚠️"} ${c.label}: ยังไม่ตั้ง${hint}`);
    }
  }
  const owner = safe(st.fulfillment_owner as string | null, 60);
  setup.push(
    `${check(st.reward_terms)} กติกาเหรียญ · ${check(st.redemption_terms)} เงื่อนไขการแลก · ${check(st.fulfillment_process)} ขั้นตอนจัดส่ง`,
    owner ? `✅ ผู้รับผิดชอบจัดส่ง: ${owner}` : "⚠️ ผู้รับผิดชอบจัดส่ง: ยังไม่ระบุ"
  );

  const rules = s.rules
    .slice(0, RULES_SHOWN)
    .map((r) => `${r.key} v${r.version} = ${r.amount}${r.cap ? ` (สูงสุด ${r.cap})` : ""}${r.team_allocation ? ` ทีม: ${r.team_allocation}` : ""}`);
  if (s.rules.length > RULES_SHOWN) rules.push(I.more(s.rules.length - RULES_SHOWN));
  const fine = [
    `กติกาเหรียญที่เผยแพร่: ${rules.length ? rules.join(" · ") : "ไม่มี"}`,
    `ทีม: admin ${s.staff.admin} · reviewer ${s.staff.reviewer} · fulfillment ${s.staff.fulfillment}`,
    `ข้อความรอส่ง ${s.outbox.pending} · รอตั้งห้อง/รอเปิดแชร์ ${s.outbox.blocked} · ส่งไม่สำเร็จ ${s.outbox.failed}`,
    `คำขอเรื่องข้อมูลที่เปิดอยู่: ${s.data_requests_open}${s.data_requests_open > 0 ? " · ดูที่ /admin data" : ""}`,
  ];

  // Missing terms already show under the switch they hold back, with their command.
  const blocks: Block[] = [{ kind: "text", text: setup.join("\n") }];
  if (channelMissing) blocks.push({ kind: "subtext", text: "ตั้งห้อง: /admin channel" });
  blocks.push(
    { kind: "divider" },
    { kind: "text", text: FEATURES.flatMap((f) => featureLines(s, f)).join("\n") },
    { kind: "divider", line: false },
    { kind: "subtext", text: fine.join("\n") }
  );
  return { tone: "staff", title: saved ? "✅ บันทึกแล้ว" : "⚙️ สถานะ SHIFT High quests", blocks };
}

/** What each fulfillment action moves a redemption to (T.redemptionStatus keys). */
const FULFILL_STATUS: Record<string, string> = { start: "processing", complete: "completed", cancel: "cancelled" };

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

/** The report's island section, heading first. Empty when the report has no island block. */
export function renderIslandReport(isl: IslandReport | null | undefined): string[] {
  if (!isl) return [];
  const stages = Object.entries(isl.projects_by_stage ?? {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([stage, n]) => `ขั้น ${stage}: ${n}`)
    .join(" · ");
  const lines = [
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

/** Aggregate numbers only, grouped: students and work, coins and delivery, the island. */
export function reportView(r: Record<string, any>): View {
  const breakdown = (o: Record<string, number> | null | undefined): string =>
    o && Object.keys(o).length ? Object.entries(o).map(([k, v]) => `${k} ${v}`).join(", ") : "0";
  const island = renderIslandReport(r.island);
  return {
    tone: "staff",
    title: `📊 รายงานรวม ${r.window_days} วันล่าสุด`,
    blocks: [
      { kind: "subtext", text: "ตัวเลขรวมเท่านั้น ไม่ระบุตัวบุคคล" },
      {
        kind: "text",
        text: [
          "**นักเรียนและงาน**",
          `เริ่มใช้แล้ว ${r.members_onboarded} คน · เริ่มลงมือแล้ว ${r.members_started}`,
          `บันทึกความคืบหน้าในช่วงนี้ ${r.members_with_progress_in_window} คน · ส่งงาน ${r.members_submitting_in_window} คน`,
          `เควสต์ตามสถานะ: ${breakdown(r.quests_by_state)}`,
          `ผลรีวิวในช่วงนี้: ${breakdown(r.reviews_in_window)} · ค้างรีวิว ${r.review_backlog} · มัธยฐานเวลารีวิว ${r.review_median_hours ?? "-"} ชม.`,
          `โปรเจกต์ที่มีผลทดสอบกับคนจริงและการตัดสินใจ: ${r.projects_with_feedback_decision}`,
          `ความเป็นเจ้าของ: เช็กครบ ${r.ownership.all_checks_done}/${r.ownership.projects} โปรเจกต์ · ติดอยู่ ${r.ownership.with_blocker}`,
          `ความช่วยเหลือ: เปิดใหม่ ${r.help.opened_in_window} · ปิดแล้ว ${r.help.resolved_in_window} · ค้าง ${r.help.open_now}`,
        ].join("\n"),
      },
      { kind: "divider" },
      {
        kind: "text",
        text: [
          "**เหรียญ การแลก และการส่ง**",
          `เหรียญ: ออก ${r.coins.awarded_in_window} · ปรับคืน ${r.coins.reversed_in_window} · คนที่เคยได้ ${r.coins.members_awarded} · อนุมัติแต่ยังไม่ออก ${r.coins.awards_not_issued}`,
          `การแลก: ${breakdown(r.redemptions)}`,
          `แชร์: โพสต์ ${r.sharing.posted} · เพื่อนปฏิเสธ ${r.sharing.peer_declined}`,
          `ส่งข้อความไม่สำเร็จ ${r.delivery.failed} · รอห้อง ${r.delivery.blocked} · การเข้าถึงที่ถูกปฏิเสธ ${r.access_denied_in_window}`,
        ].join("\n"),
      },
      ...(island.length ? [{ kind: "divider" as const }, { kind: "text" as const, text: island.join("\n") }] : []),
      { kind: "divider", line: false },
      { kind: "subtext", text: "ตัวเลขกิจกรรมไม่ได้บอกแรงจูงใจภายใน อ่านคู่กับความเห็นของนักเรียนและเกณฑ์ที่ตกลงไว้ก่อนนำร่อง" },
    ],
  };
}

/** shift_quest_admin_island_status (schema 9): counts and switches only, never a name of a person. */
export interface IslandStatus {
  consent: { required: boolean; adult_age: number; granted: number; waiting: number; none: number };
  digest: { enabled: boolean; channel: "live" | "celebrate" | null; last_day: string | null; hidden: { slot: number; name: string }[] };
}

/** /admin island: the consent switch and counts, then the AI island news switch, channel and hidden teams. */
export function islandStatusView(s: IslandStatus, saved = false): View {
  const hidden = s.digest.hidden.map((t) => `แปลง ${t.slot} ${safe(t.name, 40)}`).join(" · ");
  return {
    tone: "staff",
    title: saved ? "✅ บันทึกแล้ว" : T.adminIslandTitle,
    blocks: [
      {
        kind: "text",
        text: [
          T.adminConsentLine(s.consent.required, s.consent.adult_age),
          T.adminConsentCounts(s.consent.granted, s.consent.waiting, s.consent.none),
        ].join("\n"),
      },
      ...(s.consent.required ? [] : [{ kind: "subtext" as const, text: T.adminConsentOffWarn }]),
      { kind: "divider" },
      {
        kind: "text",
        text: [T.adminDigestLine(s.digest.enabled, s.digest.channel), T.adminDigestLast(s.digest.last_day), T.adminDigestHidden(hidden)].join(
          "\n"
        ),
      },
      { kind: "divider", line: false },
      { kind: "subtext", text: T.adminIslandFine },
    ],
  };
}

/** /admin island actions that flip a switch: the setting key and its value. */
const ISLAND_SWITCH: Record<string, [string, string]> = {
  "consent-on": ["consent_required", "on"],
  "consent-off": ["consent_required", "off"],
  "digest-on": ["digest_enabled", "on"],
  "digest-off": ["digest_enabled", "off"],
};

/** /admin award kinds: the staff award rule keys (STAFF_AWARD_KEYS on the website). */
const AWARD_KIND: Record<string, string> = { taught: "taught-next-shift", helped: "helped-most" };

/**
 * Calls a schema 9 function (20261111095000_shift_quest_player). On an older
 * database the function does not exist (42883): say so instead of the generic error.
 */
async function callPlayer<R>(ctx: Ctx, fn: string, ...args: unknown[]): Promise<R> {
  try {
    return await ctx.api.call<R>(fn, ...args);
  } catch (error) {
    if (error instanceof QuestDbError && error.sqlstate === "42883") throw new GateError(T.adminNeedsPlayer);
    throw error;
  }
}

export const admin: HandlerSet = {
  commands: {
    async "admin status"(i, ctx) {
      requireStaff(ctx, ADMIN);
      await show(i, statusView(await ctx.api.call<Status>("shift_quest_admin_status", ctx.userId)));
    },

    async "admin feature"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const status = await ctx.api.call<Status>(
        "shift_quest_admin_set",
        ctx.userId,
        i.options.getString("name", true),
        i.options.getString("state", true)
      );
      await show(i, statusView(status, true));
    },

    async "admin channel"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const kind = i.options.getString("kind", true);
      const chosen = i.options.getChannel("channel");
      if (chosen && chosen.type === ChannelType.GuildForum && kind !== "suggest") {
        // Only suggest may be a forum: the bot never posts there, the web only links to it.
        throw new GateError(T.adminForumSuggestOnly);
      }
      if (chosen && chosen.type === ChannelType.GuildVoice) {
        // Only coworking may be voice: its people sit at the island's campfire.
        if (kind !== "coworking") throw new GateError(T.adminVoiceCoworkingOnly);
        // A private voice room is nobody's island news: refuse it before anyone sits at the campfire.
        const full = i.guild?.channels.cache.get(chosen.id) ?? chosen;
        if (!openToStudents(full as never, ctx.session.settings.student_role_ids, i.guildId ?? "")) {
          throw new GateError(T.adminCoworkingPrivate);
        }
      }
      if (chosen && kind === "suggest") {
        if (chosen.type !== ChannelType.GuildForum && chosen.type !== ChannelType.GuildText) throw new GateError(T.adminSuggestType);
        // The website links every student here: a channel they cannot see or post in would be a dead link.
        const full = i.guild?.channels.cache.get(chosen.id) ?? chosen;
        const seeAndPost = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages];
        if (!openToStudents(full as never, ctx.session.settings.student_role_ids, i.guildId ?? "", seeAndPost)) {
          throw new GateError(T.adminSuggestPrivate);
        }
      }
      if (chosen && kind === "live") {
        // The bot keeps one post there and edits it: a plain text channel only.
        if (chosen.type !== ChannelType.GuildText) throw new GateError(T.adminLiveText);
        if (!botCanKeepLivePost(i, chosen.id)) throw new GateError(T.adminLiveBotPerms);
      }
      const status = await ctx.api.call<Status>("shift_quest_admin_set", ctx.userId, `${kind}_channel`, chosen?.id ?? "");
      await show(i, statusView(status, true));
    },

    async "admin student-role"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const status = await ctx.api.call<Status>(
        "shift_quest_admin_set",
        ctx.userId,
        i.options.getString("action", true) === "remove" ? "student_role_remove" : "student_role_add",
        i.options.getRole("role", true).id
      );
      await show(i, statusView(status, true));
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
      await show(i, {
        tone: "success",
        title: "✅ บันทึกแล้ว",
        blocks: [{ kind: "text", text: `<@${user.id}>: ${result.roles.length ? `**${result.roles.join(", ")}**` : "ไม่มีบทบาท"}` }],
      });
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
      await show(i, {
        tone: "success",
        title: `✅ ${T.done}`,
        blocks: [{ kind: "text", text: "มีผลกับเควสต์ที่เลือกหลังจากนี้ เควสต์เดิมใช้กติกาเดิม" }],
      });
    },

    async "admin templates"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const list = await ctx.api.call<{ slug: string; version: number; title: string; status: string; reward_rule_key: string | null }[]>(
        "shift_quest_admin_templates",
        ctx.userId
      );
      await show(i, {
        tone: "staff",
        title: `📋 เควสต์ตัวอย่าง (${list.length})`,
        blocks: [
          {
            kind: "text",
            text: list.length
              ? list
                  .map((t) => `- \`${t.slug}\` v${t.version} ${safe(t.title, 60)}: ${t.status}${t.reward_rule_key ? ` · กติกา ${t.reward_rule_key}` : ""}`)
                  .join("\n")
              : "ยังไม่มีเควสต์ตัวอย่าง",
          },
          { kind: "subtext", text: "เปิดหรือเก็บ: /admin template · ผูกกติกาเหรียญ: /admin template-rule" },
        ],
      });
    },

    async "admin template"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const slug = i.options.getString("template", true);
      const publish = i.options.getBoolean("publish", true);
      await ctx.api.call("shift_quest_admin_template_state", ctx.userId, slug, publish);
      // The slug as typed, as code: a backtick in it would end the code span early.
      const shown = `\`${slug.split("`").join("'").slice(0, 60)}\``;
      await show(i, {
        tone: "success",
        title: `✅ ${T.done}`,
        blocks: [{ kind: "text", text: publish ? `เปิด ${shown} แล้ว` : `เก็บ ${shown} แล้ว` }],
      });
    },

    async "admin catalog"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const item = i.options.getString("item");
      // The progress gates (schema 9): a left-out option keeps its stored value.
      const minStage = i.options.getInteger("min_stage");
      const community = i.options.getBoolean("requires_community");
      const gated = minStage !== null || community !== null;
      const active = i.options.getBoolean("active");
      // With gates, an item is switched on only after its gates are stored: a
      // new item is created off, and "active: true" waits for the gate call.
      // If the gate call fails, the item never went live without its gates.
      let result = await ctx.api.call<{ id: string; name: string; cost: number; stock_available: number; active: boolean }>(
        "shift_quest_admin_catalog",
        ctx.userId,
        item && isUuid(item) ? item : null,
        i.options.getString("name"),
        i.options.getString("description"),
        i.options.getInteger("cost"),
        i.options.getInteger("stock_change"),
        gated && active === true ? null : active
      );
      if (gated) {
        await callPlayer(ctx, "shift_quest_admin_catalog_gate", ctx.userId, result.id, minStage, community);
        if (active === true && !result.active) {
          result = await ctx.api.call("shift_quest_admin_catalog", ctx.userId, result.id, null, null, null, null, true);
        }
      }
      const list = await ctx.api.call<
        { name: string; cost: number; stock_available: number; active: boolean; reserved: number; min_stage?: number; requires_community?: boolean }[]
      >("shift_quest_admin_catalog_list", ctx.userId);
      await show(i, {
        tone: "coins",
        title: `✅ บันทึก ${safe(result.name, 80)} แล้ว`,
        blocks: [
          {
            kind: "text",
            text: [
              `**ของทั้งหมด ${list.length} อย่าง**`,
              ...list.map(
                (x) =>
                  `- ${safe(x.name, 60)} **${x.cost}** เหรียญ · เหลือ ${x.stock_available} · จองอยู่ ${x.reserved} · ${x.active ? "เปิด" : "ปิด"}${T.catalogGates(
                    x.min_stage ?? 0,
                    Boolean(x.requires_community)
                  )}`
              ),
            ].join("\n"),
          },
          { kind: "subtext", text: "แสดงให้นักเรียนเห็นเฉพาะตอนที่การแลกเปิดและตั้งค่าครบแล้ว" },
        ],
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
        tone: "coins",
        title: `🪙 ${safe(ledger.name, 60) || "บัญชีเหรียญ"}`,
        blocks: [
          { kind: "text", text: `ยอด **${ledger.balance}** เหรียญ` },
          ...(ledger.entries.length
            ? [
                { kind: "divider" as const },
                {
                  kind: "text" as const,
                  text: ledger.entries
                    .map(
                      (e) =>
                        `${bkkDate(e.created_at)} **${e.amount > 0 ? "+" : ""}${e.amount}** ${ledgerReason(e.kind, e.reason, e.title, e.category)}${e.reversed ? ` (ปรับคืนแล้ว ${e.reversed})` : ""}`
                    )
                    .join("\n"),
                },
              ]
            : []),
        ],
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
      await show(i, reportView(report));
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
      await show(i, seasonView(season));
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

    async "admin island"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const action = i.options.getString("action", true);
      let status: IslandStatus;
      if (action === "consent-reset") {
        const user = i.options.getUser("user");
        if (!user) throw new GateError(T.adminIslandUser);
        await callPlayer(ctx, "shift_quest_admin_consent_reset", ctx.userId, user.id);
        status = await callPlayer<IslandStatus>(ctx, "shift_quest_admin_island_status", ctx.userId);
        const view = islandStatusView(status, true);
        await show(i, { ...view, blocks: [{ kind: "text", text: T.adminConsentReset(user.id) }, ...(view.blocks ?? [])] });
        return;
      }
      if (action === "digest-hide" || action === "digest-show") {
        const plot = i.options.getInteger("plot");
        if (plot === null) throw new GateError(T.adminIslandPlot);
        await callPlayer(ctx, "shift_quest_digest_hide", ctx.userId, plot, action === "digest-hide", i.options.getString("reason"));
        status = await callPlayer<IslandStatus>(ctx, "shift_quest_admin_island_status", ctx.userId);
      } else if (ISLAND_SWITCH[action]) {
        const [key, value] = ISLAND_SWITCH[action];
        status = await callPlayer<IslandStatus>(ctx, "shift_quest_admin_island_set", ctx.userId, key, value);
      } else {
        status = await callPlayer<IslandStatus>(ctx, "shift_quest_admin_island_status", ctx.userId);
      }
      await show(i, islandStatusView(status, action !== "status"));
    },

    async "admin award"(i, ctx) {
      requireStaff(ctx, ADMIN);
      const kind = i.options.getString("kind", true);
      const user = i.options.getUser("user", true);
      if (!AWARD_KIND[kind]) return;
      // As /admin recognize: this command's interaction ID is the request key,
      // so a resubmit of the same modal (a retry after a slow reply) is one award.
      await i.showModal(
        modal(cid("ad_award", kind, user.id, i.id), T.adminAwardModal(STAFF_AWARD_LABEL[AWARD_KIND[kind]]), [
          {
            kind: "text",
            id: "reason",
            label: T.adminAwardReason,
            description: T.adminAwardReasonHint,
            long: true,
            required: true,
            max: 500,
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
        await show(i, { tone: "staff", title: "🗂️ คำขอเรื่องข้อมูล", blocks: [{ kind: "text", text: "ไม่มีคำขอที่เปิดอยู่" }] });
        return;
      }
      const kindLabel = (kind: string) => (kind === "erasure" ? "ขอลบ" : "ขอแก้");
      await show(i, {
        tone: "staff",
        title: `🗂️ คำขอเรื่องข้อมูล (${list.length})`,
        blocks: [
          {
            kind: "text",
            text: list
              .map((d) => `- ${bkkDate(d.created_at)} **${kindLabel(d.kind)}**: ${safe(d.name, 60)}${d.note ? `: ${safe(d.note, 200)}` : ""}`)
              .join("\n"),
          },
        ],
        rows: [selectRow(cid("ad_data"), "เลือกคำขอ", list.map((d) => ({ label: `${kindLabel(d.kind)}: ${d.name ?? ""}`, value: `${d.id}:${d.kind}` })))],
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
        await show(i, { tone: "staff", title: "📦 คำขอแลก", blocks: [{ kind: "text", text: "ไม่มีคำขอแลกที่รออยู่" }] });
        return;
      }
      await show(i, {
        tone: "staff",
        title: `📦 คำขอแลกที่รออยู่ (${mine.length})`,
        blocks: [
          {
            kind: "text",
            text: mine
              .map((q) => `- ${bkkDate(q.created_at)} ${safe(q.student, 60)}: **${safe(q.item, 60)}** (${T.redemptionStatus[q.status] ?? q.status})`)
              .join("\n"),
          },
          {
            kind: "subtext",
            text: "ข้อมูลจัดส่งให้ผู้ปกครองเป็นคนกรอก ผ่านแบบฟอร์มที่แชร์ในห้องกลุ่มหรือขั้นตอนที่อนุมัติแล้วเท่านั้น ห้ามถามที่อยู่ในห้องแชทหรือ DM",
          },
        ],
        rows: [
          selectRow(
            cid("fl_pick"),
            "เลือกคำขอ",
            mine.map((q) => ({ label: `${q.student ?? ""}: ${q.item}`, value: q.id, description: T.redemptionStatus[q.status] ?? q.status }))
          ),
        ],
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
        await show(i, {
          tone: "success",
          title: "✅ เพิ่มของปลดล็อกแล้ว",
          blocks: [{ kind: "text", text: "ทุกคนที่ถึงเกณฑ์จะได้เท่ากัน และได้รับแจ้งใน /inbox" }],
          // The same button the season card has: the next unlock opens the same form.
          rows: buttonRows([button(cid("ad_unlock", seasonId), "🎁 เพิ่มอีก")]),
        });
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
      await show(
        i,
        result.duplicate
          ? { tone: "success", title: "✅ บันทึกไปแล้ว" }
          : { tone: "success", title: "✅ บันทึกแล้ว", blocks: [{ kind: "text", text: `<@${userId}> ได้รับแจ้งใน /inbox` }] }
      );
    },

    async ad_award(i, ctx, [kind, userId, requestId]) {
      requireStaff(ctx, ADMIN);
      if (!i.isModalSubmit() || !AWARD_KIND[kind] || !SNOWFLAKE.test(userId ?? "") || !SNOWFLAKE.test(requestId ?? "")) return;
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const result = await callPlayer<{ amount: number; balance: number; duplicate: boolean }>(
        ctx,
        "shift_quest_admin_staff_award",
        ctx.userId,
        userId,
        AWARD_KIND[kind],
        textValue(i, "reason"),
        `award:${requestId}`
      );
      await show(
        i,
        result.duplicate
          ? { tone: "success", title: `✅ ${T.adminAwardDuplicate}` }
          : { tone: "success", title: "✅ ให้รางวัลแล้ว", blocks: [{ kind: "text", text: T.adminAwarded(userId, result.amount, result.balance) }] }
      );
    },

    async ad_terms(i, ctx, [kind]) {
      requireStaff(ctx, ADMIN);
      if (!TERMS_LABEL[kind] || !i.isModalSubmit()) return;
      const status = await ctx.api.call<Status>("shift_quest_admin_set", ctx.userId, kind, textValue(i, "text") ?? "");
      await show(i, statusView(status, true));
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
        tone: "success",
        title: `✅ เผยแพร่ ${result.key} v${result.version} แล้ว`,
        blocks: [
          { kind: "text", text: "เควสต์ที่เลือกไปแล้วใช้เวอร์ชันเดิม" },
          { kind: "subtext", text: "ผูกกับเควสต์ตัวอย่าง: /admin template-rule" },
        ],
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
        await show(
          i,
          result.duplicate
            ? { tone: "success", title: "✅ บันทึกไปแล้ว" }
            : {
                tone: "success",
                title: "✅ ปรับคืนแล้ว",
                blocks: [
                  {
                    kind: "text",
                    text: `${typeof result.balance === "number" ? `ยอดใหม่ **${result.balance}** · ` : ""}นักเรียนได้รับแจ้งเหตุผลใน /inbox`,
                  },
                ],
              }
        );
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
        kind === "erasure"
          ? {
              tone: "warn",
              title: "🗑️ คำขอลบข้อมูล",
              blocks: [{ kind: "text", text: "ลบข้อมูลตามนโยบายที่ประกาศไว้ **ย้อนกลับไม่ได้**" }],
              rows: buttonRows(buttons),
            }
          : {
              tone: "staff",
              title: "✏️ คำขอแก้ข้อมูล",
              blocks: [{ kind: "text", text: "แก้ข้อมูลตามที่ขอ แล้วกด **ดำเนินการแล้ว**" }],
              rows: buttonRows(buttons),
            },
        { replace: true }
      );
    },

    async ad_dclose(i, ctx, [id, outcome]) {
      requireStaff(ctx, ADMIN);
      if (!isUuid(id)) return;
      await ctx.api.call("shift_quest_admin_data_close", ctx.userId, id, outcome === "done");
      await show(i, { tone: "success", title: `✅ ${T.done}` }, { replace: true });
    },

    async ad_erase(i, ctx, [id]) {
      requireStaff(ctx, ADMIN);
      if (!isUuid(id)) return;
      await show(
        i,
        {
          tone: "warn",
          title: "⚠️ ยืนยันการลบ",
          blocks: [
            {
              kind: "text",
              text: [
                "บันทึก ข้อความ คำขอความช่วยเหลือ และการเชื่อม Discord ของคนนี้จะถูกลบถาวร",
                "ยอดเหรียญและสถานะเควสต์คงไว้แบบไม่ระบุตัวตน",
                "**ย้อนกลับไม่ได้**",
              ].join("\n"),
            },
          ],
          rows: buttonRows([button(cid("ad_erase_go", id), "ลบถาวร", ButtonStyle.Danger), button(cid("noop"), T.btnCancel)]),
        },
        { replace: true }
      );
    },

    async ad_erase_go(i, ctx, [id]) {
      requireStaff(ctx, ADMIN);
      if (!isUuid(id)) return;
      await ctx.api.call("shift_quest_admin_erase", ctx.userId, id);
      await show(i, { tone: "success", title: "✅ ลบแล้ว" }, { replace: true });
    },

    async fl_pick(i, ctx, args) {
      requireStaff(ctx, FULFILLMENT);
      const id = picked(i, args);
      if (!isUuid(id)) return;
      await show(
        i,
        {
          tone: "staff",
          title: "📦 อัปเดตคำขอ",
          blocks: [{ kind: "subtext", text: "นักเรียนจะได้รับแจ้งใน /inbox" }],
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
      await show(
        i,
        result === "unchanged"
          ? { tone: "neutral", title: "ℹ️ ไม่มีอะไรเปลี่ยน", blocks: [{ kind: "text", text: "สถานะเปลี่ยนไปแล้ว" }] }
          : {
              tone: "success",
              title: `✅ ${T.done}`,
              blocks: [
                { kind: "text", text: `สถานะใหม่: **${T.redemptionStatus[FULFILL_STATUS[action]] ?? action}**` },
                { kind: "subtext", text: "นักเรียนได้รับแจ้งใน /inbox" },
              ],
            },
        { replace: !i.isModalSubmit() }
      );
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
