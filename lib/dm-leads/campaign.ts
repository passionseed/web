/**
 * Turns the inbox into an ordered work queue for one batch sweep.
 *
 * Pure module: no React, no DB, no clock of its own (callers pass `now`), so
 * every routing decision is unit-testable and reproducible.
 *
 * The ordering principle is the whole point. Meta's reply window is the binding
 * constraint on this inbox, not lead quality: a thread we cannot message is
 * worth nothing regardless of how hot it is. So the queue sorts by time left,
 * not by bucket. See `lib/dm-leads/messaging-window.ts`.
 */

import {
  getMessagingWindowMode,
  type MessagingWindowMode,
} from "@/lib/dm-leads/messaging-window";
import {
  BUCKET_NEXT_RUNG,
  selectScripts,
  type DmLeadScript,
  type DmScriptRung,
} from "@/lib/dm-leads/scripts";
import {
  getFieldCoverage,
  type DmLeadBucket,
  type DmLeadSignals,
  type FieldCoverage,
} from "@/lib/dm-leads/playbook";

/* -------------------------------------------------------------------------- */
/* A/B                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The one variable under test, per §3.2: does explicitly asking for the
 * mini-commit outperform delivering judgment and stopping?
 *
 * `ask` ends on a direct question ("เอาไหมครับ"). `no_ask` ends on the ranked
 * judgment alone. Deliberately one variable with two arms: at ~90 threads per
 * arm only a large effect on reply rate clears the noise floor, and splitting
 * further guarantees an unreadable result.
 */
export type CampaignVariant = "ask" | "no_ask";

export const CAMPAIGN_VARIANTS: CampaignVariant[] = ["ask", "no_ask"];

/**
 * FNV-1a over `campaignId:conversationId`.
 *
 * Deterministic rather than random so a rebuilt queue reassigns every lead to
 * the arm it was already in. A lead who flips arms between sweeps pollutes both
 * of them, and with n≈90 per arm there is no headroom to absorb that.
 */
export function assignVariant(
  conversationId: string,
  campaignId: string
): CampaignVariant {
  const key = `${campaignId}:${conversationId}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return CAMPAIGN_VARIANTS[hash % CAMPAIGN_VARIANTS.length];
}

/* -------------------------------------------------------------------------- */
/* Eligibility                                                                */
/* -------------------------------------------------------------------------- */

/** Why a conversation is not in the queue. Surfaced so the count reconciles. */
export type IneligibleReason =
  | "radar_origin"
  | "internal"
  | "never_replied"
  | "window_closed"
  | "already_targeted"
  | "done";

export const INELIGIBLE_LABELS: Record<IneligibleReason, string> = {
  radar_origin: "เธรดจาก Career Radar (ไม่ใช่ลีด)",
  internal: "บัญชีภายใน",
  never_replied: "ไม่เคยตอบ (ไม่มี window)",
  window_closed: "เกิน 7 วัน ส่งไม่ได้แล้ว",
  already_targeted: "ทักไปแล้วในรอบนี้",
  done: "ปิดเคสแล้ว",
};

export interface CampaignCandidate {
  conversationId: string;
  bucket: DmLeadBucket;
  interests: string[];
  adminTags: string[];
  signals: DmLeadSignals;
  /** Conversations already swept in this campaign are skipped, not re-sent. */
  alreadyTargeted?: boolean;
  /**
   * `dm_conversations.origin`. Radar-origin threads belong to students who
   * asked for a Career Radar link; they are never in a broadcast (spec 5.6).
   */
  origin?: string | null;
}

export interface QueueEntry {
  conversationId: string;
  bucket: DmLeadBucket;
  rung: DmScriptRung;
  coverage: FieldCoverage;
  variant: CampaignVariant;
  windowMode: Exclude<MessagingWindowMode, "closed">;
  /** Hours until Meta closes the thread. Drives queue order. */
  hoursLeft: number;
  script: DmLeadScript;
}

export interface QueueBuild {
  entries: QueueEntry[];
  skipped: Record<IneligibleReason, number>;
}

const INTERNAL_TAG = "internal";
const HUMAN_AGENT_WINDOW_HOURS = 7 * 24;

function emptySkipped(): Record<IneligibleReason, number> {
  return {
    radar_origin: 0,
    internal: 0,
    never_replied: 0,
    window_closed: 0,
    already_targeted: 0,
    done: 0,
  };
}

/** Hours before Meta's 7-day HUMAN_AGENT window shuts on this thread. */
export function hoursUntilWindowCloses(
  lastInboundAt: string | null,
  now: number
): number {
  if (!lastInboundAt) return 0;
  const parsed = Date.parse(lastInboundAt);
  if (Number.isNaN(parsed)) return 0;
  const elapsedHours = (now - parsed) / 3_600_000;
  return Math.max(0, HUMAN_AGENT_WINDOW_HOURS - elapsedHours);
}

/**
 * The script this lead should receive next.
 *
 * `selectScripts` already orders bespoke-then-ladder from the bucket's rung, so
 * the head of that list is the move. Falls back to the bucket's own rung when a
 * coverage filter empties the list, which happens for `uncovered` fields at
 * rung 4.
 */
export function nextScriptFor(
  bucket: DmLeadBucket,
  coverage: FieldCoverage
): DmLeadScript | null {
  return selectScripts(bucket, coverage)[0] ?? null;
}

/**
 * Builds the ordered sweep queue.
 *
 * Every exclusion is counted rather than silently dropped: an operator staring
 * at "179 of 616" needs the other 437 to be explicable, or the tool reads as
 * broken.
 */
export function buildQueue(
  candidates: CampaignCandidate[],
  campaignId: string,
  now: number
): QueueBuild {
  const skipped = emptySkipped();
  const entries: QueueEntry[] = [];

  for (const candidate of candidates) {
    // Safeguarding first: a Radar-origin thread is never a campaign recipient.
    if (candidate.origin === "radar") {
      skipped.radar_origin += 1;
      continue;
    }
    if (candidate.adminTags.includes(INTERNAL_TAG)) {
      skipped.internal += 1;
      continue;
    }
    if (candidate.alreadyTargeted) {
      skipped.already_targeted += 1;
      continue;
    }
    if (candidate.bucket === "done") {
      skipped.done += 1;
      continue;
    }
    // No inbound means Meta never opened a window for this thread. These are
    // not slow leads, they are unreachable ones; §4.7 recovers them through
    // public comment replies instead.
    if (!candidate.signals.hasInbound) {
      skipped.never_replied += 1;
      continue;
    }

    const windowMode = getMessagingWindowMode(
      candidate.signals.lastInboundMessageAt,
      now
    );
    if (windowMode === "closed") {
      skipped.window_closed += 1;
      continue;
    }

    const coverage = getFieldCoverage(candidate.interests);
    const script = nextScriptFor(candidate.bucket, coverage);
    if (!script) {
      skipped.window_closed += 1;
      continue;
    }

    entries.push({
      conversationId: candidate.conversationId,
      bucket: candidate.bucket,
      rung: script.rung ?? BUCKET_NEXT_RUNG[candidate.bucket],
      coverage,
      variant: assignVariant(candidate.conversationId, campaignId),
      windowMode,
      hoursLeft: hoursUntilWindowCloses(candidate.signals.lastInboundMessageAt, now),
      script,
    });
  }

  // Soonest to expire first. Ties broken by conversation id so a rebuilt queue
  // is byte-identical, which makes "did the queue change?" answerable.
  entries.sort(
    (a, b) =>
      a.hoursLeft - b.hoursLeft || a.conversationId.localeCompare(b.conversationId)
  );

  return { entries, skipped };
}

/**
 * Strips the closing ask for the `no_ask` arm.
 *
 * Only the trailing question is removed. A mid-message question is load-bearing
 * (rung 1 is nothing but questions), so `no_ask` at rung 1 is a no-op by
 * design — the arms only diverge where the ladder actually has an ask to drop.
 */
const TRAILING_ASK_PATTERN = /\s*(เอาไหมครับ|เอาไหม|สนใจไหมครับ|สนใจไหม|ถ้าพร้อมทักมาได้เลยครับ)\s*[?？]?\s*$/;

export function applyVariant(body: string, variant: CampaignVariant): string {
  if (variant === "ask") return body;
  const stripped = body.replace(TRAILING_ASK_PATTERN, "").trimEnd();
  return stripped || body;
}
