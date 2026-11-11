/**
 * Mentors: review queue, decisions, proposal agreements, the help queue and
 * award retries. The database refuses conflicts of interest and stale
 * revisions; these handlers only present them.
 *
 * Every screen is one staff card. The bot's labels are small grey lines;
 * what a student (or an earlier reviewer) wrote sits under them as an
 * escaped quote, so it never reads as the bot's own words.
 */
import { requireStaff, type Ctx } from "../context";
import { STATE, awardReason, bkkDate, safe } from "../copy";
import { cid, isUuid } from "../ids";
import { I } from "../island/copy";
import { ButtonStyle, button, buttonRows, modal, selectRow, show, textFile, textValue, type Block, type Row, type View } from "../ui";
import { picked, type HandlerSet } from "./types";

const REVIEWERS = ["reviewer", "admin"];

interface Queue {
  submissions: { submission_id: string; title: string; revision: number; student: string | null; created_at: string; appeal: boolean }[];
  proposals: { instance_id: string; title: string; student: string | null; created_at: string }[];
  help_open: number;
}

export interface ReviewDetail {
  submission_id: string;
  revision: number;
  status: string;
  is_latest: boolean;
  appeal: boolean;
  appeal_reason: string | null;
  instance_state: string;
  student: string | null;
  title: string;
  why: string | null;
  goal: string;
  criteria: string;
  template_evidence: string | null;
  proposed: boolean;
  repeatable: boolean;
  prior_approved: number;
  evidence: string | null;
  reflection: string | null;
  artifact_url: string | null;
  reward: { amount: number; team_allocation: string | null } | null;
  reward_agreed: boolean;
  awards_live: boolean;
  contributions: { name: string | null; contribution: string | null; status: string }[];
  history: { revision: number; outcome: string; feedback: string | null; created_at: string }[];
}

interface HelpItem {
  id: string;
  student: string | null;
  summary: string;
  visibility: string;
  source: string;
  status: string;
  claimed_by: string | null;
  project: string | null;
  created_at: string;
}

interface PendingAward {
  instance_id: string;
  title: string;
  student: string | null;
  reason: string;
}

interface Proposal {
  title: string;
  why: string | null;
  goal: string;
  criteria: string;
  next_step: string;
  student: string | null;
  state: string;
  rules: { key: string; amount: number }[];
}

const OUTCOME: Record<string, string> = {
  approved: "อนุมัติ",
  clarification: "ขอข้อมูลเพิ่ม",
  declined: "ยังไม่ผ่าน",
};

/** Every word on the mentor screens, in one place for review. */
export const RV = {
  // Lists
  queueTitle: "📋 คิวรีวิว",
  queueCounts: (submissions: number, proposals: number) =>
    `งานรอรีวิว **${submissions}** · เควสต์ที่เสนอรอตกลง **${proposals}**`,
  queueHidden: "งานของตัวเอง ของทีมที่คุณอยู่ หรือที่คุณปฏิเสธไปแล้วจะไม่แสดง",
  menuCap: "เมนูแสดง 25 รายการแรก",
  pickSubmission: "เลือกงานที่จะรีวิว",
  pickProposal: "เลือกเควสต์ที่เสนอ",
  appealTag: "[อุทธรณ์] ",
  btnQueue: "📋 คิวรีวิว",
  btnHelp: (open?: number) => `🙋 คำขอความช่วยเหลือ${open === undefined ? "" : ` (${open})`}`,
  btnAwards: "🪙 เหรียญที่ค้าง",

  // One submission
  reviewTitle: (title: string, appeal: boolean) => `${appeal ? "⚖️ อุทธรณ์: " : "📝 "}${title}`,
  by: (student: string, revision: number) => `${student ? `โดย **${student}** · ` : ""}ครั้งที่ **${revision}**`,
  notLatest: "มีการส่งครั้งใหม่กว่านี้แล้ว หน้านี้ดูได้อย่างเดียว",
  why: "ทำไมสำคัญ",
  goal: "เป้าหมาย",
  criteria: "หลักฐานที่ตกลง",
  templateEvidence: "หลักฐานตามแม่แบบ",
  evidence: "สิ่งที่ทำ",
  reflection: "สะท้อนคิด",
  link: "ลิงก์",
  parts: "ส่วนของแต่ละคน",
  partNone: "(ไม่ได้ระบุ)",
  partPending: "(ยังไม่ยืนยัน)",
  partDeclined: "(บอกว่าไม่ได้มีส่วน)",
  earlier: "ครั้งก่อน",
  earlierLine: (revision: number, outcome: string) => `ครั้งที่ ${revision}: **${outcome}**`,
  appealReason: "เหตุผลอุทธรณ์",
  fullFile: "ข้อความยาวถูกตัด ฉบับเต็มอยู่ในไฟล์นี้",
  coinsOff: "🪙 ระบบเหรียญปิดอยู่: อนุมัติได้ แต่จะไม่มีเหรียญ",
  coins: (amount: number, team: string | null) =>
    `🪙 อนุมัติแล้วได้ **${amount}** เหรียญ${team === null ? "" : ` (งานทีม: ${team})`}`,
  teamNoRule: "ยังไม่มีกติกาแบ่ง",
  noCoins: "🪙 เควสต์นี้ไม่มีเหรียญ",
  repeat: (n: number) =>
    `🔁 นักเรียนเคยผ่านเควสต์นี้ **${n}** ครั้ง ให้เหรียญซ้ำเฉพาะเมื่อขอบเขตและสิ่งที่เรียนรู้ต่างจากเดิม`,
  rubric: [
    "เกณฑ์: ทำสิ่งที่ตกลงไว้ · อธิบายได้น่าเชื่อ · มีการเรียนรู้หรือการช่วยคนอื่น · มีก้าวต่อไปที่ใช้ได้",
    "ดูกระบวนการและคำอธิบาย ไม่ใช่ความอลังการของผลลัพธ์ ผลลบที่สะท้อนคิดดีก็ผ่านได้",
  ].join("\n"),
  btnApprove: "อนุมัติ",
  btnApproveDistinct: "อนุมัติ + ต่างจากเดิม",
  btnClarify: "ขอข้อมูลเพิ่ม",
  btnDecline: "ยังไม่ผ่าน",

  // After a decision
  saved: (outcome: string) => `✅ บันทึกแล้ว: ${outcome}`,
  already: "📝 รีวิวนี้บันทึกไปแล้ว",
  awardIssued: (amount?: number) => `🪙 ออกเหรียญแล้ว${typeof amount === "number" ? ` **${amount}**` : ""}`,
  awardNone: (reason: string) => `🪙 ไม่มีเหรียญ: ${reason}`,
  studentSees: "นักเรียนจะเห็นผลใน /inbox",

  // Proposals
  proposalTitle: (title: string) => `🧭 ${title}`,
  proposedBy: (student: string, state: string) => `${student ? `เสนอโดย **${student}** · ` : ""}${state}`,
  proposalEvidence: "หลักฐาน",
  nextStep: "ก้าวถัดไป",
  agreeFirst: "💬 ตกลงขอบเขตและหลักฐานกับนักเรียนในห้องกลุ่มก่อน แล้วเลือกกติกาเหรียญ (หรือไม่มีเหรียญ) ด้านล่าง",
  agreeFair: "เควสต์ที่เสนอเองต้องเข้าถึงการยอมรับได้เทียบเท่าเควสต์ตัวอย่าง",
  pickRule: "ตกลงด้วยกติกา",
  ruleNone: "ตกลงขอบเขต ไม่มีเหรียญ",
  rule: (key: string, amount: number) => `${key} (${amount} เหรียญ)`,
  agreed: "✅ บันทึกข้อตกลงแล้ว",
  agreedRule: (key: string) => `🪙 กติกา **${key}**`,
  agreedNoCoins: "🪙 ไม่มีเหรียญ",
  agreedNext: "นักเรียนจะเห็นใน /inbox",

  // Help
  helpTitle: "🙋 คำขอความช่วยเหลือ",
  helpEmpty: "ไม่มีคำขอที่เปิดอยู่",
  helpCounts: (open: number, waiting: number) => `เปิดอยู่ **${open}** · ยังไม่มีคนรับ **${waiting}**`,
  helpWhere: (visibility: string) => (visibility === "community" ? "ห้อง help" : "ทีมพี่เลี้ยง"),
  claimedBy: (name: string) => `รับโดย ${name}`,
  helpStatus: { open: "ยังไม่มีคนรับ", claimed: "มีคนรับแล้ว" } as Record<string, string>,
  pickHelp: "เลือกคำขอ",
  groupOnly: "🔒 ตอบในห้องกลุ่มเท่านั้น ห้ามย้ายไปคุยส่วนตัวกับนักเรียน",
  btnClaim: "รับเรื่อง",
  btnResolve: "ปิดเรื่อง",
  btnRelease: "ปล่อยเรื่อง",
  helpDone: { claim: "✅ รับเรื่องแล้ว", resolve: "✅ ปิดเรื่องแล้ว", release: "✅ ปล่อยเรื่องแล้ว" } as Record<string, string>,
  helpNext: {
    claim: "นักเรียนจะได้รับแจ้งใน /inbox",
    resolve: "นักเรียนจะได้รับแจ้งใน /inbox",
    release: "เรื่องนี้กลับไปรอคนรับ",
  } as Record<string, string>,

  // Awards
  awardsTitle: "🪙 เหรียญที่ค้าง",
  awardsEmpty: "ไม่มีเหรียญที่ค้างอยู่",
  awardsCount: (n: number) => `ค้างอยู่ **${n}** งาน`,
  pickAward: "ลองออกเหรียญอีกครั้ง",
  retried: "✅ ออกเหรียญแล้ว",
  notYet: "⏸️ ยังออกเหรียญไม่ได้",
};

/** Items listed in a card body; the menu under it holds up to 25. */
const LISTED = 5;
const MENU_MAX = 25;
/** Teammates' parts and earlier reviews shown on a review card. */
const PARTS = 5;
const EARLIER = 3;
const SUBMISSION_TXT = "submission.txt";
/** A submission this long (as plain text) also comes as a file, so nothing is lost if the card is cut. */
const FULL_FILE_AT = 2500;

type Contribution = ReviewDetail["contributions"][number];
type DecideAward = { issued: boolean; amount?: number; reason?: string } | null;

// ---------------------------------------------------------------------------
// Formatting

/** Someone's text: trimmed, at most one blank line in a row. */
function tidy(text: string | null | undefined): string {
  return (text ?? "").trim().replace(/\n{3,}/g, "\n\n");
}

/** One line, for lists. */
function oneLine(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/** Escaped text as a quote. A line that would become a heading, subtext or quote stays plain. */
function quote(escaped: string): string {
  return escaped
    .split("\n")
    .map((line) => `> ${line.replace(/^(\s*)(#{1,3}\s|-#\s|>)/, "$1\\$2")}`)
    .join("\n");
}

/** A small grey label with the text quoted under it, or nothing when the text is empty. */
function labelled(label: string, text: string | null | undefined, max: number): string {
  const t = tidy(text);
  return t ? `-# ${label}\n${quote(safe(t, max))}` : "";
}

/** A Discord timestamp: "3 days ago" in the viewer's own language. */
function ago(iso: string | null | undefined): string {
  const ms = iso ? Date.parse(iso) : Number.NaN;
  return Number.isFinite(ms) ? `<t:${Math.floor(ms / 1000)}:R>` : "";
}

/** "and 3 more" under a cut list, and a note when the menu cannot hold them all. */
function rest(total: number): string {
  return [total > LISTED ? I.more(total - LISTED) : "", total > MENU_MAX ? RV.menuCap : ""].filter(Boolean).join(" · ");
}

const toQueue = () => button(cid("rv_list", "queue"), RV.btnQueue);
const toHelp = (open?: number) => button(cid("rv_list", "help"), RV.btnHelp(open));
const toAwards = () => button(cid("rv_list", "awards"), RV.btnAwards);

function partText(c: Contribution): string {
  switch (c.status) {
    case "confirmed":
      return c.contribution ? safe(oneLine(c.contribution), 200) : RV.partNone;
    case "pending":
      return RV.partPending;
    default:
      return RV.partDeclined;
  }
}

function rewardLine(d: ReviewDetail): string {
  if (!d.awards_live) return RV.coinsOff;
  if (d.reward && (!d.proposed || d.reward_agreed)) {
    return RV.coins(d.reward.amount, d.contributions.length > 1 ? d.reward.team_allocation ?? RV.teamNoRule : null);
  }
  return RV.noCoins;
}

function awardLine(award: DecideAward): string {
  if (!award) return "";
  if (award.issued) return RV.awardIssued(award.amount);
  if (award.reason) return RV.awardNone(awardReason(award.reason));
  return "";
}

// ---------------------------------------------------------------------------
// Cards

async function queueCard(ctx: Ctx): Promise<View> {
  const queue = await ctx.api.call<Queue>("shift_quest_review_queue", ctx.userId);
  const rows: Row[] = [];
  if (queue.submissions.length) {
    rows.push(
      selectRow(
        cid("rv_sub"),
        RV.pickSubmission,
        queue.submissions.map((s) => ({
          label: `${s.appeal ? RV.appealTag : ""}${s.title}`,
          value: s.submission_id,
          description: `${s.student ?? ""} · ครั้งที่ ${s.revision} · ${bkkDate(s.created_at)}`,
        }))
      )
    );
  }
  if (queue.proposals.length) {
    rows.push(
      selectRow(
        cid("rv_prop"),
        RV.pickProposal,
        queue.proposals.map((p) => ({ label: p.title, value: p.instance_id, description: `${p.student ?? ""} · ${bkkDate(p.created_at)}` }))
      )
    );
  }
  rows.push(...buttonRows([toHelp(queue.help_open), toAwards()]));
  const capped = queue.submissions.length > MENU_MAX || queue.proposals.length > MENU_MAX;
  return {
    tone: "staff",
    title: RV.queueTitle,
    blocks: [
      { kind: "text", text: RV.queueCounts(queue.submissions.length, queue.proposals.length) },
      { kind: "subtext", text: [RV.queueHidden, capped ? RV.menuCap : ""].filter(Boolean).join("\n") },
    ],
    rows,
  };
}

function helpEntry(h: HelpItem): string {
  const head = [`**${safe(h.student, 60) || "-"}**`, h.project ? safe(h.project, 40) : "", ago(h.created_at)].filter(Boolean).join(" · ");
  return [head, quote(safe(oneLine(h.summary), 120)), h.claimed_by ? `-# ${RV.claimedBy(safe(h.claimed_by, 40))}` : ""]
    .filter(Boolean)
    .join("\n");
}

async function helpCard(ctx: Ctx): Promise<View> {
  const items = await ctx.api.call<HelpItem[]>("shift_quest_help_queue", ctx.userId);
  const back = buttonRows([toQueue()]);
  if (!items.length) return { tone: "staff", title: RV.helpTitle, blocks: [{ kind: "text", text: RV.helpEmpty }], rows: back };
  const waiting = items.filter((h) => h.status !== "claimed").length;
  return {
    tone: "staff",
    title: RV.helpTitle,
    blocks: [
      { kind: "text", text: RV.helpCounts(items.length, waiting) },
      { kind: "divider" },
      { kind: "text", text: items.slice(0, LISTED).map(helpEntry).join("\n\n") },
      { kind: "subtext", text: rest(items.length) },
    ],
    rows: [
      selectRow(
        cid("rv_help"),
        RV.pickHelp,
        items.map((h) => ({
          label: `${h.student ?? ""}: ${h.summary}`,
          value: h.id,
          description: `${RV.helpStatus[h.status] ?? h.status} · ${bkkDate(h.created_at)}`,
        }))
      ),
      ...back,
    ],
  };
}

async function awardsCard(ctx: Ctx): Promise<View> {
  const items = await ctx.api.call<PendingAward[]>("shift_quest_awards_pending", ctx.userId);
  const back = buttonRows([toQueue()]);
  if (!items.length) return { tone: "coins", title: RV.awardsTitle, blocks: [{ kind: "text", text: RV.awardsEmpty }], rows: back };
  const entry = (x: PendingAward) =>
    `**${safe(x.title, 80)}**${x.student ? ` · ${safe(x.student, 60)}` : ""}${x.reason ? `\n-# ${awardReason(x.reason)}` : ""}`;
  return {
    tone: "coins",
    title: RV.awardsTitle,
    blocks: [
      { kind: "text", text: RV.awardsCount(items.length) },
      { kind: "divider" },
      { kind: "text", text: items.slice(0, LISTED).map(entry).join("\n") },
      { kind: "subtext", text: rest(items.length) },
    ],
    rows: [
      selectRow(
        cid("rv_award"),
        RV.pickAward,
        items.map((x) => ({ label: x.title, value: x.instance_id, description: x.student ?? undefined }))
      ),
      ...back,
    ],
  };
}

const LISTS = new Map<string, (ctx: Ctx) => Promise<View>>([
  ["queue", queueCard],
  ["help", helpCard],
  ["awards", awardsCard],
]);

/**
 * One submission: who and what it earns, what was agreed, what was done,
 * earlier rounds, then the rubric. Long text is cut on the card and sent
 * whole in a private file.
 */
export function reviewCard(d: ReviewDetail): View {
  let cut = false;
  const field = (label: string, text: string | null | undefined, max: number): string => {
    if (tidy(text).length > max) cut = true;
    return labelled(label, text, max);
  };
  const repeat = d.repeatable && d.prior_approved > 0;

  const agreed = [
    field(RV.why, d.why, 300),
    field(RV.goal, d.goal, 400),
    field(RV.criteria, d.criteria, 400),
    d.template_evidence && d.template_evidence !== d.criteria ? field(RV.templateEvidence, d.template_evidence, 300) : "",
  ];

  const parts = d.contributions.slice(0, PARTS);
  if (d.contributions.length > PARTS || d.contributions.some((c) => (c.contribution ?? "").length > 200)) cut = true;
  const work = [
    field(RV.evidence, d.evidence, 1000),
    field(RV.reflection, d.reflection, 600),
    field(RV.link, d.artifact_url, 300),
    parts.length ? `-# ${RV.parts}\n${parts.map((c) => `> **${safe(c.name, 60) || "-"}**: ${partText(c)}`).join("\n")}` : "",
    d.contributions.length > PARTS ? `-# ${I.more(d.contributions.length - PARTS)}` : "",
  ];

  const recent = d.history.slice(-EARLIER);
  if (d.history.length > EARLIER) cut = true;
  const past = [
    recent.length ? `-# ${RV.earlier}${d.history.length > EARLIER ? ` (${I.more(d.history.length - EARLIER)})` : ""}` : "",
    ...recent.map((h) => {
      const feedback = tidy(h.feedback);
      if (feedback.length > 300) cut = true;
      return [RV.earlierLine(h.revision, OUTCOME[h.outcome] ?? h.outcome), feedback ? quote(safe(feedback, 300)) : ""].filter(Boolean).join("\n");
    }),
    field(RV.appealReason, d.appeal_reason, 500),
  ];

  // The whole submission as plain text (never rendered as markdown): the file a reviewer opens when the card is cut.
  const full = [
    `${d.appeal ? RV.appealTag : ""}${d.title} (ครั้งที่ ${d.revision}) โดย ${d.student ?? ""}`,
    d.why ? `ทำไมสำคัญ: ${d.why}` : "",
    `เป้าหมาย: ${d.goal}`,
    `หลักฐานที่ตกลง: ${d.criteria}`,
    d.template_evidence && d.template_evidence !== d.criteria ? `หลักฐานตามแม่แบบ: ${d.template_evidence}` : "",
    "",
    `สิ่งที่ทำ: ${d.evidence ?? ""}`,
    `สะท้อนคิด: ${d.reflection ?? ""}`,
    d.artifact_url ? `ลิงก์: ${d.artifact_url}` : "",
    ...d.contributions.map((c) => `ส่วนของ ${c.name ?? ""}: ${c.status === "confirmed" ? c.contribution ?? RV.partNone : partText(c)}`),
    d.appeal_reason ? `เหตุผลอุทธรณ์: ${d.appeal_reason}` : "",
    ...d.history.map((h) => `ก่อนหน้า ครั้งที่ ${h.revision}: ${OUTCOME[h.outcome] ?? h.outcome}${h.feedback ? `: ${h.feedback}` : ""}`),
  ]
    .filter((l) => l !== "")
    .join("\n");
  const files = cut || full.length > FULL_FILE_AT ? [textFile(SUBMISSION_TXT, full)] : [];

  const blocks: Block[] = [
    { kind: "text", text: [RV.by(safe(d.student, 60), d.revision), rewardLine(d), repeat ? RV.repeat(d.prior_approved) : ""].filter(Boolean).join("\n") },
  ];
  if (!d.is_latest) blocks.push({ kind: "subtext", text: RV.notLatest });
  const group = (lines: string[]) => {
    const text = lines.filter(Boolean).join("\n");
    if (text) blocks.push({ kind: "divider" }, { kind: "text", text });
  };
  group(agreed);
  group(work);
  if (files.length) blocks.push({ kind: "subtext", text: RV.fullFile }, { kind: "file", name: SUBMISSION_TXT });
  group(past);
  blocks.push({ kind: "divider", line: false }, { kind: "subtext", text: RV.rubric });

  const decide = [
    button(cid("rv_dec", d.submission_id, "approved", "0"), RV.btnApprove, ButtonStyle.Success),
    ...(repeat ? [button(cid("rv_dec", d.submission_id, "approved", "1"), RV.btnApproveDistinct, ButtonStyle.Success)] : []),
    button(cid("rv_dec", d.submission_id, "clarification", "0"), RV.btnClarify, ButtonStyle.Primary),
    button(cid("rv_dec", d.submission_id, "declined", "0"), RV.btnDecline, ButtonStyle.Danger),
  ];
  return {
    tone: "staff",
    title: RV.reviewTitle(safe(d.title, 80), d.appeal),
    blocks,
    rows: [...(d.is_latest ? buttonRows(decide) : []), ...buttonRows([toQueue()])],
    files,
  };
}

function proposalCard(id: string, p: Proposal): View {
  return {
    tone: "staff",
    title: RV.proposalTitle(safe(p.title, 80)),
    blocks: [
      { kind: "text", text: RV.proposedBy(safe(p.student, 60), STATE[p.state] ?? p.state) },
      { kind: "divider" },
      {
        kind: "text",
        text: [
          labelled(RV.why, p.why, 400),
          labelled(RV.goal, p.goal, 400),
          labelled(RV.proposalEvidence, p.criteria, 400),
          labelled(RV.nextStep, p.next_step, 200),
        ]
          .filter(Boolean)
          .join("\n"),
      },
      { kind: "divider" },
      { kind: "text", text: RV.agreeFirst },
      { kind: "subtext", text: RV.agreeFair },
    ],
    rows: [
      selectRow(cid("rv_agree", id), RV.pickRule, [
        { label: RV.ruleNone, value: "-" },
        ...p.rules.map((r) => ({ label: RV.rule(r.key, r.amount), value: r.key })),
      ]),
      ...buttonRows([toQueue()]),
    ],
  };
}

function helpItemCard(id: string, h: HelpItem): View {
  const facts = [`**${safe(h.student, 60) || "-"}**`, h.project ? safe(h.project, 40) : "", RV.helpWhere(h.visibility), ago(h.created_at)]
    .filter(Boolean)
    .join(" · ");
  const blocks: Block[] = [{ kind: "text", text: facts }];
  if (h.claimed_by) blocks.push({ kind: "subtext", text: RV.claimedBy(safe(h.claimed_by, 40)) });
  blocks.push(
    { kind: "divider" },
    { kind: "text", text: quote(safe(tidy(h.summary), 1000)) },
    { kind: "divider", line: false },
    { kind: "text", text: RV.groupOnly }
  );
  return {
    tone: "staff",
    title: RV.helpTitle,
    blocks,
    rows: [
      ...buttonRows([
        button(cid("rv_hact", id, "claim"), RV.btnClaim, ButtonStyle.Primary, h.status === "claimed"),
        button(cid("rv_hact", id, "resolve"), RV.btnResolve, ButtonStyle.Success),
        button(cid("rv_hact", id, "release"), RV.btnRelease, ButtonStyle.Secondary, h.status !== "claimed"),
      ]),
      ...buttonRows([toHelp()]),
    ],
  };
}

export const review: HandlerSet = {
  commands: {
    async "review queue"(i, ctx) {
      requireStaff(ctx, REVIEWERS);
      await show(i, await queueCard(ctx));
    },

    async "review help"(i, ctx) {
      requireStaff(ctx, REVIEWERS);
      await show(i, await helpCard(ctx));
    },

    async "review awards"(i, ctx) {
      requireStaff(ctx, REVIEWERS);
      await show(i, await awardsCard(ctx));
    },
  },

  actions: {
    /** Back to (or over to) one of the three mentor lists, in place. */
    async rv_list(i, ctx, [which]) {
      requireStaff(ctx, REVIEWERS);
      const card = LISTS.get(which);
      if (!card) return;
      await show(i, await card(ctx), { replace: true });
    },

    async rv_sub(i, ctx, args) {
      requireStaff(ctx, REVIEWERS);
      const id = picked(i, args);
      if (!isUuid(id)) return;
      const d = await ctx.api.call<ReviewDetail>("shift_quest_review_get", ctx.userId, id);
      await show(i, reviewCard(d), { replace: true });
    },

    async rv_dec(i, ctx, [submissionId, outcome, distinct]) {
      requireStaff(ctx, REVIEWERS);
      if (!isUuid(submissionId) || !OUTCOME[outcome]) return;
      if (i.isModalSubmit()) {
        const result = await ctx.api.call<{ already: boolean; award: DecideAward }>(
          "shift_quest_review_decide",
          ctx.userId,
          submissionId,
          outcome,
          textValue(i, "feedback"),
          distinct === "1"
        );
        const blocks: Block[] = [];
        const award = awardLine(result.award);
        if (award) blocks.push({ kind: "text", text: award });
        if (!result.already) blocks.push({ kind: "subtext", text: RV.studentSees });
        await show(i, {
          tone: result.already ? "neutral" : "success",
          title: result.already ? RV.already : RV.saved(OUTCOME[outcome]),
          blocks,
          rows: buttonRows([toQueue()]),
        });
        return;
      }
      if (!i.isButton()) return;
      await i.showModal(
        modal(cid("rv_dec", submissionId, outcome, distinct), OUTCOME[outcome], [
          {
            kind: "text",
            id: "feedback",
            label: outcome === "approved" ? "ความเห็นถึงนักเรียน (ไม่บังคับ)" : "บอกสิ่งที่ควรทำต่อให้ชัด",
            description:
              outcome === "approved"
                ? "ชมสิ่งที่ทำได้จริงแบบเจาะจง"
                : "เป็นมิตร เจาะจง และบอกก้าวถัดไปหนึ่งอย่าง นักเรียนอุทธรณ์ได้",
            long: true,
            required: outcome !== "approved",
            max: 2000,
          },
        ])
      );
    },

    async rv_prop(i, ctx, args) {
      requireStaff(ctx, REVIEWERS);
      const id = picked(i, args);
      if (!isUuid(id)) return;
      const p = await ctx.api.call<Proposal>("shift_quest_proposal_get", ctx.userId, id);
      await show(i, proposalCard(id, p), { replace: true });
    },

    async rv_agree(i, ctx, [instanceId]) {
      requireStaff(ctx, REVIEWERS);
      if (!isUuid(instanceId) || !i.isStringSelectMenu()) return;
      const key = i.values[0] === "-" ? null : i.values[0];
      await ctx.api.call("shift_quest_proposal_agree", ctx.userId, instanceId, key, null);
      await show(
        i,
        {
          tone: "success",
          title: RV.agreed,
          blocks: [
            { kind: "text", text: key ? RV.agreedRule(safe(key, 60)) : RV.agreedNoCoins },
            { kind: "subtext", text: RV.agreedNext },
          ],
          rows: buttonRows([toQueue()]),
        },
        { replace: true }
      );
    },

    async rv_help(i, ctx, args) {
      requireStaff(ctx, REVIEWERS);
      const id = picked(i, args);
      if (!isUuid(id)) return;
      const items = await ctx.api.call<HelpItem[]>("shift_quest_help_queue", ctx.userId);
      const h = items.find((x) => x.id === id);
      if (!h) return;
      await show(i, helpItemCard(id, h), { replace: true });
    },

    async rv_hact(i, ctx, [helpId, action]) {
      requireStaff(ctx, REVIEWERS);
      if (!isUuid(helpId) || !["claim", "resolve", "release"].includes(action)) return;
      if (action === "resolve" && i.isButton()) {
        await i.showModal(
          modal(cid("rv_hact", helpId, action), "ปิดเรื่อง", [
            { kind: "text", id: "note", label: "สรุปสั้นๆ ถึงนักเรียน (ไม่บังคับ)", long: true, max: 1000 },
          ])
        );
        return;
      }
      await ctx.api.call("shift_quest_help_update", ctx.userId, helpId, action, i.isModalSubmit() ? textValue(i, "note") : null);
      await show(
        i,
        { tone: "success", title: RV.helpDone[action], blocks: [{ kind: "subtext", text: RV.helpNext[action] }], rows: buttonRows([toHelp()]) },
        { replace: !i.isModalSubmit() }
      );
    },

    async rv_award(i, ctx, args) {
      requireStaff(ctx, REVIEWERS);
      const id = picked(i, args);
      if (!isUuid(id)) return;
      const result = await ctx.api.call<{ issued: boolean; reason?: string }>("shift_quest_issue_award", ctx.userId, id);
      await show(
        i,
        result.issued
          ? { tone: "success", title: RV.retried, rows: buttonRows([toAwards()]) }
          : { tone: "warn", title: RV.notYet, blocks: [{ kind: "text", text: awardReason(result.reason) }], rows: buttonRows([toAwards()]) },
        { replace: true }
      );
    },
  },
};
