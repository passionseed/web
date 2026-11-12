/**
 * Decides whether a drafted DM may leave without a human reading it.
 *
 * Default is `review`. Every rule below can only ever *withhold* auto-send, so
 * a bug in one of them costs a few seconds of operator time instead of an
 * unreviewed message landing on a 16-year-old.
 *
 * Pure module — no clock, no network. The caller supplies the window mode and
 * the draft.
 */

import { messageSignalFlags } from "@/lib/dm-leads/signals";
import { countPlaceholders, type DmScriptRung } from "@/lib/dm-leads/scripts";
import type { MessagingWindowMode } from "@/lib/dm-leads/messaging-window";
import type { DmLeadBucket } from "@/lib/dm-leads/playbook";
import { isRadarFixedTemplate } from "@/lib/radar-guide/dm-copy";

export type SendDecision = "auto" | "review" | "block";

/** Machine-readable so the queue can group and count, not just display. */
export type GateReason =
  | "window_closed"
  | "human_agent_window"
  | "rung_states_price"
  | "mentions_price"
  | "sends_link"
  | "makes_offer"
  | "unfilled_placeholder"
  | "too_long"
  | "empty"
  | "bucket_needs_judgment"
  | "already_followed_up"
  | "radar_origin";

export const GATE_REASON_LABELS: Record<GateReason, string> = {
  window_closed: "เกิน 7 วัน ส่งไม่ได้",
  human_agent_window: "เกิน 24 ชม. ต้องให้คนกดเอง (กฎ HUMAN_AGENT ของ Meta)",
  rung_states_price: "ขั้นนี้ต้องบอกราคา",
  mentions_price: "ในข้อความมีราคา",
  sends_link: "ในข้อความมีลิงก์",
  makes_offer: "ในข้อความมีข้อเสนอ",
  unfilled_placeholder: "ยังมีช่อง [..] ที่ไม่ได้เติม",
  too_long: "ยาวเกินไป",
  empty: "ข้อความว่าง",
  bucket_needs_judgment: "เคสนี้ต้องอ่านเธรดก่อน",
  already_followed_up: "ตามไปแล้ว 1 ครั้ง",
  radar_origin: "เธรดจาก Career Radar ส่งได้แค่ข้อความ Radar ที่กำหนดไว้",
};

export interface GateInput {
  body: string;
  rung: DmScriptRung;
  bucket: DmLeadBucket;
  windowMode: MessagingWindowMode;
  /** Consecutive outbound messages with no inbound since. Enforces §4.6. */
  consecutiveOutbound: number;
  /**
   * `dm_conversations.origin`. A thread opened by a Radar DM belongs to a
   * student who asked for a link, not a sales lead (spec 5.6).
   */
  origin?: string | null;
}

export interface GateResult {
  decision: SendDecision;
  reasons: GateReason[];
}

/**
 * Buckets whose next move is a bare question or a ranked opinion. Everything
 * else routes through a human because it either names money or depends on
 * reading what the lead actually said (Addendum E: "flags route, threads
 * decide").
 */
const AUTO_ELIGIBLE_BUCKETS: DmLeadBucket[] = [
  "never_pitched",
  "waiting_unqualified",
];

/** Rungs 3 and 4 ask for a commitment or state a price. Never automatic. */
const MAX_AUTO_RUNG = 2;

const MAX_AUTO_LENGTH = 420;

/**
 * Radar-origin threads (safeguarding): nothing may be sent to them except the
 * fixed Radar templates, by automation or by hand. Returns the block, or null
 * when the thread is not Radar-origin or the body is a fixed template.
 */
export function gateRadarThread(origin: string | null | undefined, body: string): GateResult | null {
  if (origin !== "radar") return null;
  if (isRadarFixedTemplate(body)) return null;
  return { decision: "block", reasons: ["radar_origin"] };
}

export function gateDraft(input: GateInput): GateResult {
  const reasons: GateReason[] = [];
  const body = input.body.trim();

  const radar = gateRadarThread(input.origin, body);
  if (radar) return radar;
  // Even a fixed Radar template is never auto-sent by the sales tooling to a
  // Radar thread; the Radar flow sends its own messages (lib/radar-guide).
  if (input.origin === "radar") reasons.push("radar_origin");

  // Hard stop: there is no compliant API route past 7 days.
  if (input.windowMode === "closed") {
    return { decision: "block", reasons: ["window_closed"] };
  }
  if (!body) {
    return { decision: "block", reasons: ["empty"] };
  }

  // Meta grants the HUMAN_AGENT tag for a human answering a user, explicitly
  // not for automation (see lib/dm-leads/messaging-window.ts). Auto-sending
  // under it would misuse the tag on the ~93% of reachable threads that sit in
  // that window, which is the fastest way to lose the account. A human presses
  // the key; the draft is still written for them.
  if (input.windowMode === "human_agent") {
    reasons.push("human_agent_window");
  }

  if (input.rung > MAX_AUTO_RUNG) reasons.push("rung_states_price");
  if (!AUTO_ELIGIBLE_BUCKETS.includes(input.bucket)) {
    reasons.push("bucket_needs_judgment");
  }

  // Re-run the playbook matchers against the *rewritten* text, not the
  // template. Qwen is the reason this check exists: a rewrite can introduce a
  // price or a link the template never had.
  const flags = messageSignalFlags(body);
  if (flags.signal_price) reasons.push("mentions_price");
  if (flags.signal_pathlab_link) reasons.push("sends_link");
  if (flags.signal_offer) reasons.push("makes_offer");

  if (countPlaceholders(body) > 0) reasons.push("unfilled_placeholder");
  if (body.length > MAX_AUTO_LENGTH) reasons.push("too_long");

  // §4.6: one follow-up, then stop. Two unanswered messages in a row is the
  // point where continuing burns the account rather than the lead.
  if (input.consecutiveOutbound >= 1) reasons.push("already_followed_up");

  return { decision: reasons.length === 0 ? "auto" : "review", reasons };
}

/** Consecutive outbound messages at the tail of a thread, newest last. */
export function consecutiveOutboundTail(
  messages: { direction: "inbound" | "outbound" }[]
): number {
  let count = 0;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].direction !== "outbound") break;
    count += 1;
  }
  return count;
}
