/**
 * Shared playbook logic for the DM lead inbox.
 *
 * Encodes the offer architecture from
 * `docs/research/2026-08-13-dm-lead-reply-playbook.md`:
 *  - which buckets a lead can be in, and the order we work them
 *  - whether their field has a PathLab seed today (routes the offer)
 *  - the three funnel-health metrics we hold ourselves to
 *
 * Pure module: no DB, no React. Both the data layer and the UI import it so
 * bucket definitions can never drift between the list and the detail pane.
 */

import type { DmConversation, DmLeadStatus } from "@/types/dm-leads";

/* -------------------------------------------------------------------------- */
/* Field coverage                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Fields with a PathLab seed in production today, matched exactly.
 *
 * Exact match, not substring: "เทคโนโลยี" is covered, but "เทคโนโลยีการอาหาร"
 * and "เทคโนโลยีการแพทย์" are not, and a substring rule would route both to a
 * cohort seat that does not exist. When in doubt this must fail toward
 * `uncovered` — pre-selling a seed we intend to build is recoverable, promising
 * one that will never exist is not.
 */
export const COVERED_FIELDS = new Set([
  "วิทยาการคอมพิวเตอร์",
  "วิศวกรรมคอมพิวเตอร์",
  "เทคโนโลยี",
  "เทคโนโลยีสารสนเทศ",
  "บริหารธุรกิจ",
  "เศรษฐศาสตร์",
  "ชีวการแพทย์",
  "วิศวกรรมชีวการแพทย์",
]);

export type FieldCoverage = "covered" | "uncovered" | "unknown";

/**
 * Which offer a lead routes to. `unknown` means we have not learned their field
 * yet — qualify before pitching anything.
 */
export function getFieldCoverage(interests: string[] | null | undefined): FieldCoverage {
  if (!interests?.length) return "unknown";
  const covered = interests.some((interest) => COVERED_FIELDS.has(interest.trim()));
  return covered ? "covered" : "uncovered";
}

export const COVERAGE_OFFER: Record<FieldCoverage, string> = {
  covered: "PathLab cohort 299 / 1,000",
  uncovered: "Pre-sell seat 299 (แผนส่งวันนี้)",
  unknown: "ยังไม่รู้สาย — ถามก่อน",
};

/* -------------------------------------------------------------------------- */
/* Buckets                                                                    */
/* -------------------------------------------------------------------------- */

export type DmLeadBucket =
  | "hot"
  | "waiting_qualified"
  | "waiting_unqualified"
  | "link_no_price"
  | "never_pitched"
  | "no_reply"
  | "done";

/**
 * Per-conversation signals derived from message history. Computed once in the
 * data layer; the classifier stays pure so it can run on the client too.
 */
export interface DmLeadSignals {
  /** Lead has sent at least one message. */
  hasInbound: boolean;
  /** Most recent inbound message timestamp, used for Meta's reply window. */
  lastInboundMessageAt: string | null;
  /** We sent a /pathlab link at any point. */
  pathlabLinkSent: boolean;
  /** A price appeared in the thread, from either side. */
  priceMentioned: boolean;
  /** We pitched something — a link, a camp, or a price. */
  offerMade: boolean;
}

export const EMPTY_SIGNALS: DmLeadSignals = {
  hasInbound: false,
  lastInboundMessageAt: null,
  pathlabLinkSent: false,
  priceMentioned: false,
  offerMade: false,
};

export interface BucketMeta {
  /** Work order — lower is worked first. */
  order: number;
  label: string;
  /** Why this bucket is worth the next 3 minutes. */
  why: string;
  /** Tailwind classes for the active pill state. */
  activeClass: string;
  /** Tailwind classes for the idle pill state. */
  idleClass: string;
}

export const BUCKET_META: Record<DmLeadBucket, BucketMeta> = {
  hot: {
    order: 1,
    label: "🔥 ร้อน — คุยราคาแล้ว",
    why: "เงินอยู่บนโต๊ะแล้ว ปิดให้จบ",
    activeClass: "border-red-500 bg-red-500 text-white",
    idleClass: "text-muted-foreground hover:border-red-400 hover:text-red-600",
  },
  waiting_qualified: {
    order: 2,
    label: "⏳ รอเราตอบ · รู้สายแล้ว",
    why: "บอกเราหมดแล้วแต่เราเงียบ ปิดง่ายที่สุดในกอง",
    activeClass: "border-amber-500 bg-amber-500 text-white",
    idleClass: "text-muted-foreground hover:border-amber-400 hover:text-amber-600",
  },
  waiting_unqualified: {
    order: 3,
    label: "⏳ รอเราตอบ · ยังไม่รู้สาย",
    why: "ถาม 2 คำถามก็ขยับขึ้นกลุ่มบนได้",
    activeClass: "border-amber-400 bg-amber-400 text-white",
    idleClass: "text-muted-foreground hover:border-amber-300 hover:text-amber-500",
  },
  link_no_price: {
    order: 4,
    label: "🔗 เสนอแล้ว · ยังไม่บอกราคา",
    why: "เห็นข้อเสนอแล้วแต่ไม่เคยถูกชวนให้ซื้อ",
    activeClass: "border-emerald-500 bg-emerald-500 text-white",
    idleClass: "text-muted-foreground hover:border-emerald-400 hover:text-emerald-600",
  },
  never_pitched: {
    order: 5,
    label: "💬 คุยแล้ว · ยังไม่เสนออะไร",
    why: "อุ่นอยู่ แต่ยังไม่มีข้อเสนอสักอย่าง",
    activeClass: "border-sky-500 bg-sky-500 text-white",
    idleClass: "text-muted-foreground hover:border-sky-400 hover:text-sky-600",
  },
  no_reply: {
    order: 6,
    label: "📭 ทักไปแล้ว · ยังไม่ตอบ",
    why: "ตามได้ครั้งเดียว แล้วปล่อย",
    activeClass: "border-slate-500 bg-slate-500 text-white",
    idleClass: "text-muted-foreground hover:border-slate-400 hover:text-slate-600",
  },
  done: {
    order: 7,
    label: "✅ จบแล้ว",
    why: "ปิดการขาย หรือตัดออกแล้ว",
    activeClass: "border-foreground bg-foreground text-background",
    idleClass: "text-muted-foreground hover:border-foreground/40 hover:text-foreground",
  },
};

export const BUCKET_ORDER: DmLeadBucket[] = (
  Object.keys(BUCKET_META) as DmLeadBucket[]
).sort((a, b) => BUCKET_META[a].order - BUCKET_META[b].order);

/**
 * Lead statuses that need no reply: the conversation is finished. The `done`
 * bucket, the open-only list filter and the overview's "DMs waiting for a
 * reply" count all read this list, so they cannot drift apart.
 */
export const CLOSED_LEAD_STATUSES = [
  "converted",
  "lost",
  "spam",
] as const satisfies readonly DmLeadStatus[];

export function isClosedLeadStatus(status: string | null | undefined): boolean {
  return (CLOSED_LEAD_STATUSES as readonly string[]).includes(status ?? "");
}

/** A lead is "qualified" once we know both their grade and their field. */
export function isQualified(conversation: Pick<DmConversation, "grade_level" | "interests">): boolean {
  return Boolean(conversation.grade_level) && (conversation.interests?.length ?? 0) > 0;
}

/**
 * Single source of truth for which bucket a lead sits in. Order matters:
 * the first matching branch wins, mirroring the work order in the playbook.
 */
export function classifyBucket(
  conversation: Pick<
    DmConversation,
    "grade_level" | "interests" | "last_message_direction" | "lead_status" | "pathlab_pay_ready"
  >,
  signals: DmLeadSignals
): DmLeadBucket {
  if (isClosedLeadStatus(conversation.lead_status)) return "done";

  // Checked before `hot`: a thread where we dropped a price into the void is a
  // lead who never engaged, not a lead with money on the table.
  if (!signals.hasInbound) return "no_reply";

  if (conversation.pathlab_pay_ready || signals.priceMentioned) return "hot";

  const waitingOnUs = conversation.last_message_direction === "inbound";
  if (waitingOnUs) {
    return isQualified(conversation) ? "waiting_qualified" : "waiting_unqualified";
  }

  // Past the `hot` branch, no price has been stated. So an offer of any kind —
  // the link, or a camp mentioned in passing — is a pitch that never closed.
  return signals.offerMade ? "link_no_price" : "never_pitched";
}

/* -------------------------------------------------------------------------- */
/* Scoreboard                                                                 */
/* -------------------------------------------------------------------------- */

export interface FunnelScoreboard {
  /** Denominator for all three: threads where the lead ever replied. */
  engaged: number;
  offerMade: number;
  priceStated: number;
  endsOnOurMessage: number;
}

export interface ScoreboardMetric {
  key: keyof Omit<FunnelScoreboard, "engaged">;
  label: string;
  /**
   * What the number actually counts, in the operator's words. Lives next to the
   * metric so the tooltip cannot drift from the rule: edit the matcher in
   * `lib/dm-leads/signals.ts` and this line moves with it.
   */
  description: string;
  /** Baseline measured 2026-08-13, for "are we moving" context. */
  baselinePct: number;
  targetPct: number;
}

/** Explains the denominator every metric below is divided by. */
export const SCOREBOARD_DENOMINATOR_HELP =
  "แชทที่ลีดตอบกลับอย่างน้อย 1 ครั้ง ใช้เป็นตัวหารของทั้ง 3 ตัวเลข " +
  "แชทที่ไม่มีใครตอบไม่ได้บอกอะไรเรื่องวิธีขายของเรา " +
  "นับทั้งกล่องข้อความเสมอ ไม่เปลี่ยนตามฟิลเตอร์ที่กดอยู่";

export const SCOREBOARD_METRICS: ScoreboardMetric[] = [
  {
    key: "offerMade",
    label: "ได้รับข้อเสนอ",
    description:
      "เราพิตช์อะไรสักอย่างไปแล้ว: ส่งลิงก์ /pathlab, พูดถึงค่าย หรือ PathLab, " +
      "พูดถึงโปรเจกต์ 5 วัน หรือบอกราคา นับเฉพาะข้อความที่เราส่ง " +
      "ยกเว้นเรื่องราคาที่นับทั้งสองฝั่ง",
    baselinePct: 24,
    targetPct: 80,
  },
  {
    key: "priceStated",
    label: "บอกราคาแล้ว",
    description:
      "มีตัวเลขราคาจริง (299, 490, 999, 1,000) หรือคำว่า ราคา, บาท, ค่าใช้จ่าย " +
      "โผล่ในแชท นับทั้งฝั่งเราและฝั่งลีดที่ถามมา เพราะพอตัวเลขขึ้นโต๊ะแล้วดีลก็เริ่มจริง",
    baselinePct: 4,
    targetPct: 80,
  },
  {
    key: "endsOnOurMessage",
    label: "จบที่ข้อความเรา",
    description:
      "ข้อความล่าสุดของแชทเป็นของเรา ไม่ใช่ปล่อยให้ลีดค้างรอ " +
      "ตัวเลขนี้วัดว่าเราเงียบใส่คนที่คุยอยู่บ่อยแค่ไหน",
    baselinePct: 34,
    targetPct: 90,
  },
];

export function pct(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
}
