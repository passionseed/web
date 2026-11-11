"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { replyToComment, privateReplyToComment } from "@/lib/meta/graph";
import {
  getCommentById,
  getCommentsMissedByDm,
  getRadarCommentQueue,
  markCommentReplied,
} from "@/lib/supabase/ig-comments";
import { getCampaign, type CampaignKey } from "@/lib/meta/comment-intent";
import { sendRadarDmFromAdmin, type RadarDmOutcome } from "@/lib/radar-guide/comment-dm";
import { isAutoSendableTarget, isRadarTarget, resolveCommentTarget } from "@/lib/radar-guide/comment-target";
import { getReelByMediaId } from "@/lib/supabase/radar-reels";
import type { IgComment } from "@/types/dm-leads";
import {
  getPersonalizedDmMessage,
  getPersonalizedPublicCommentReply,
  isDeliveryBlockedByPrivacy,
} from "@/lib/dm-leads/delivery-status";
import { createAdminClient } from "@/utils/supabase/admin";
import { getBatchCap } from "./constants";

async function getIgCommentId(commentId: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ig_comments")
    .select("ig_comment_id")
    .eq("id", commentId)
    .single();

  if (error || !data) throw new Error("Comment not found");
  return data.ig_comment_id;
}

/** Public reply, visible under the comment on the post. */
export async function replyPublicly(commentId: string, message: string) {
  await requireAdmin();
  if (!message.trim()) return { ok: false, error: "Message is empty" };

  try {
    const igCommentId = await getIgCommentId(commentId);
    await replyToComment(igCommentId, message.trim());
    await markCommentReplied(commentId);
  } catch (error) {
    console.error("replyPublicly failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "Failed to reply" };
  }

  revalidatePath("/admin/ig-comments");
  return { ok: true, error: null };
}

/**
 * Whether a comment belongs to the Radar flow: the keyword, a claimed Radar
 * DM row, or anything the Radar queue would hold (a link request or a vaguer
 * ask on a mapped Radar reel, via resolveCommentTarget). Those only ever get
 * the fixed Radar DM (spec 5.5), so the thread is tagged Radar-origin and
 * stays out of the sales inbox.
 */
async function isRadarComment(commentId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const [{ data: comment }, { data: dm }] = await Promise.all([
    supabase.from("ig_comments").select("text, media_id").eq("id", commentId).maybeSingle(),
    supabase.from("radar_comment_dms").select("id").eq("comment_id", commentId).maybeSingle(),
  ]);
  if (dm || getCampaign(comment?.text) === "radar") return true;
  if (!comment?.media_id) return false;
  // A failed reel lookup is treated as unmapped inside resolveCommentTarget.
  const target = await resolveCommentTarget(
    { text: comment.text, mediaId: comment.media_id },
    (mediaId) => getReelByMediaId(mediaId)
  );
  return isRadarTarget(target);
}

const RADAR_FREE_TEXT_ERROR =
  "This is a Career Radar comment. Use the Radar send button, which sends the fixed Radar DM.";

/**
 * DM triggered by the comment. Works even when the commenter never opened a
 * DM thread with us — that's the whole point — but only within 7 days of the
 * comment and only once per comment.
 */
export async function replyPrivately(commentId: string, message: string) {
  await requireAdmin();
  if (!message.trim()) return { ok: false, error: "Message is empty" };

  try {
    if (await isRadarComment(commentId)) return { ok: false, error: RADAR_FREE_TEXT_ERROR };
    const igCommentId = await getIgCommentId(commentId);
    await privateReplyToComment(igCommentId, message.trim());
    await markCommentReplied(commentId);
  } catch (error) {
    console.error("replyPrivately failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "Failed to DM" };
  }

  revalidatePath("/admin/ig-comments");
  return { ok: true, error: null };
}

function toRadarDmComment(comment: IgComment) {
  return {
    id: comment.id,
    ig_comment_id: comment.ig_comment_id,
    media_id: comment.media_id,
    text: comment.text,
    username: comment.username,
    ig_user_id: comment.ig_user_id,
    commented_at: comment.commented_at,
  };
}

const RADAR_SKIP_MESSAGE: Partial<Record<RadarDmOutcome["reason"], string>> = {
  not_radar: "This comment is not a Radar request.",
  dm_disabled: "DMs are turned off for this reel.",
  self: "This is our own comment.",
  excluded: "This handle is on the do-not-reply list.",
  too_old: "Older than 7 days: Instagram no longer allows a private reply.",
  claim_lost: "Already sent, or being sent right now.",
};

/**
 * One-click Radar DM from the admin queue (spec 5.5): the fixed template and
 * the claim RPC, `mode 'admin'`, with the admin recorded as `sent_by`. Also
 * the retry for a failed send, and the send for `needsReview` comments.
 */
export async function sendRadarDm(commentId: string) {
  const user = await requireAdmin();
  try {
    const comment = await getCommentById(commentId);
    if (!comment) return { ok: false, error: "Comment not found", outcome: null };
    const outcome = await sendRadarDmFromAdmin(toRadarDmComment(comment), user.id);
    revalidatePath("/admin/ig-comments");
    if (outcome.status === "sent") return { ok: true, error: null, outcome };
    const error =
      outcome.status === "skipped"
        ? (RADAR_SKIP_MESSAGE[outcome.reason] ?? `Skipped: ${outcome.reason}`)
        : `DM failed (${outcome.errorCode ?? outcome.reason}). The comment is back in the queue.`;
    return { ok: false, error, outcome };
  } catch (error) {
    console.error("sendRadarDm failed:", error);
    return { ok: false, error: "Failed to send the Radar DM", outcome: null };
  }
}

/**
 * Public replies have no 7-day Meta window (that limit is private replies
 * only), so the batch sweeps a 30-day window.
 */
const BULK_REPLY_WINDOW_DAYS = 30;
const BULK_REPLY_DELAY_MS = 1000;

export interface BulkReplyResult {
  sent: number;
  failed: number;
  /** Missed comments beyond the batch cap — not attempted this run. */
  skipped: number;
  errors: string[];
  /**
   * Handles that actually received a reply, in send order. Counts alone cannot
   * answer "who did we already message?" after a run is stopped part way, and
   * the sent rows drop straight out of the queue, so the record has to come
   * back with the result.
   */
  sentTo: string[];
  /**
   * Failures whose comment no longer exists on Instagram. Counted separately
   * because they are retired rather than retried, so they leave the queue for
   * good and are not a problem to act on.
   */
  unreachable: number;
}

/**
 * Instagram reports a deleted comment as code 100 / subcode 33, but that same
 * pair also covers "cannot be loaded due to missing permissions" and a wrong
 * endpoint or token type. A run that hit the wrong edge therefore looks
 * identical to 15 deleted comments.
 *
 * Retiring on this alone once marked 15 live comments as replied that had
 * never been contacted, so the signal is treated as ambiguous: the caller
 * retires only when the batch as a whole shows individual failures rather than
 * a systemic one. See `isSystemicFailure`.
 */
function isAmbiguousCommentError(message: string): boolean {
  return message.includes('"code":100') && message.includes('"error_subcode":33');
}

/**
 * A batch where every single send failed the same ambiguous way is a fault on
 * our side — a bad token, a wrong endpoint, a revoked permission — not a batch
 * that happens to contain only deleted comments. Retiring those would silently
 * discard real leads, so the run reports the problem instead.
 */
function isSystemicFailure(attempted: number, ambiguous: number): boolean {
  return attempted >= 3 && ambiguous === attempted;
}


/**
 * The private-reply endpoint is only valid within 7 days of the comment, so a
 * run that includes a DM cannot use the public sweep's 30-day window.
 */
const BULK_DM_WINDOW_DAYS = 7;

/**
 * Which channels one bulk run uses.
 *
 * "both" sends a DM *and* a public reply to everyone, regardless of whether
 * the DM landed: the public @mention is a visible answer under the comment,
 * which is worth posting even for someone who also received the DM.
 */
export type BulkReplyMode = "public" | "private" | "both";

export interface BulkRunResult extends BulkReplyResult {
  /**
   * DMs Instagram refused because the account does not accept message
   * requests. Expected for about half of commenters, so it is counted apart
   * from `failed` rather than reported as a fault.
   */
  privacyBlocked: number;
  /** DMs that were actually delivered. */
  dmsDelivered: number;
  /** Public replies posted under the comment. */
  publicReplies: number;
  /**
   * True when every send in the batch failed the same ambiguous way, which
   * points at our token or endpoint rather than the comments. Nothing is
   * retired in that case.
   */
  systemicFailure?: boolean;
  /**
   * True when the pass stopped early to stay inside the function's time
   * budget. Not an error: the remainder is still queued and the next pass
   * picks it up.
   */
  timedOut?: boolean;
  /**
   * Set by the client, not the action: a pass that never returned at all.
   * Lives on the same shape so the summary can report it alongside real counts.
   */
  crashed?: boolean;
  /** True when the run only previewed and sent nothing. */
  dryRun: boolean;
}

export interface BulkRunOptions {
  mode: BulkReplyMode;
  /** Restricts the run to one campaign's keyword; omit for every campaign. */
  campaign?: CampaignKey;
  /**
   * Overrides the DM copy. Personalization is skipped for a custom message so
   * what is typed is what is sent.
   */
  dmMessage?: string;
  /**
   * Overrides the public reply copy. Kept separate from `dmMessage` because
   * the two do different jobs: the public reply is visible under the comment
   * and tags the commenter, while the DM speaks to them directly.
   */
  publicMessage?: string;
  /**
   * Restricts the run to commenters no message has ever gone out to, so a
   * backfill does not message someone the live automation already handled.
   */
  onlyNeverContacted?: boolean;
  /** Lists who would be contacted without sending anything. */
  dryRun?: boolean;
}

/**
 * One bulk pass over the comments the DM automation never reached.
 *
 * Each comment affords exactly one private reply, ever, so `dryRun` exists to
 * inspect the recipient list before spending them.
 *
 * One failure never aborts the batch: in "both" mode the public reply still
 * goes out when the DM is refused, an unreachable comment is retired so it
 * stops occupying a slot in future runs, and anything else is left unmarked to
 * be retried on the next pass.
 */
export async function runBulkReply(options: BulkRunOptions): Promise<BulkRunResult> {
  const user = await requireAdmin();
  const { mode, campaign, dryRun = false, onlyNeverContacted = false } = options;
  if (campaign === "radar") return runRadarBulk(user.id, dryRun);
  const customDm = options.dmMessage?.trim();
  const customPublic = options.publicMessage?.trim();

  // A DM is only possible inside 7 days; a public-only run can sweep 30.
  const windowDays = mode === "public" ? BULK_REPLY_WINDOW_DAYS : BULK_DM_WINDOW_DAYS;
  const missed = await getCommentsMissedByDm(windowDays, undefined, onlyNeverContacted);
  const scoped = campaign ? missed.filter((c) => getCampaign(c.text) === campaign) : missed;

  // Custom copy skips the Qwen rewrite, which is the slowest part of a send,
  // so a verbatim run can safely attempt more people per pass.
  const verbatim =
    mode === "both"
      ? Boolean(customDm && customPublic)
      : Boolean(mode === "private" ? customDm : customPublic);
  const batch = dryRun ? scoped : scoped.slice(0, getBatchCap(mode, verbatim));

  /**
   * Hard stop before the platform kills the function. A 504 loses the whole
   * response, so the operator cannot tell what was sent; returning early with
   * real counts is always better. Budget is `maxDuration` on the page (60s)
   * minus headroom for the final DB writes and the response itself.
   */
  const deadline = Date.now() + 45_000;

  const result: BulkRunResult = {
    sent: 0,
    failed: 0,
    // Recomputed after the loop, since an early stop leaves more behind than
    // the batch cap alone accounts for.
    skipped: scoped.length - batch.length,
    errors: [],
    sentTo: [],
    unreachable: 0,
    privacyBlocked: 0,
    dmsDelivered: 0,
    publicReplies: 0,
    dryRun,
  };

  /**
   * Comments that failed the ambiguous way. Retirement is deferred to the end
   * of the run: only once the batch proves the failures were individual, not
   * systemic, is it safe to mark them permanently handled.
   */
  const ambiguous: { id: string; who: string }[] = [];
  let attempted = 0;
  let processed = 0;

  for (const comment of batch) {
    const who = comment.username ?? comment.ig_comment_id;

    if (dryRun) {
      result.sent += 1;
      result.sentTo.push(who);
      continue;
    }

    // Out of time: stop cleanly so the counts come back, rather than letting
    // the platform kill the function and lose them.
    if (Date.now() > deadline) {
      result.timedOut = true;
      break;
    }

    processed += 1;

    // Radar comments never get custom or Qwen copy, on any tab: only the
    // fixed Radar DM through the claim (spec 5.5). getCommentsMissedByDm
    // already leaves them out; this is the backstop.
    if (getCampaign(comment.text) === "radar") {
      const outcome = await sendRadarDmFromAdmin(toRadarDmComment(comment), user.id);
      tallyRadarOutcome(result, outcome, who);
      continue;
    }

    attempted += 1;
    const lead = {
      username: comment.username,
      gradeLevel: comment.grade_level,
      campaign: getCampaign(comment.text),
    };
    let delivered = false;
    let commentAmbiguous = false;

    if (mode === "private" || mode === "both") {
      try {
        const dm = customDm ?? (await getPersonalizedDmMessage(lead));
        await privateReplyToComment(comment.ig_comment_id, dm);
        result.dmsDelivered += 1;
        delivered = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        console.error(`runBulkReply DM failed for ${who}:`, error);

        if (isDeliveryBlockedByPrivacy({ send_status: "failed", body: "", metadata: { send_error: message } })) {
          // Expected for about half of commenters. In "both" mode the public
          // reply below still runs, so this is not a dead end.
          result.privacyBlocked += 1;
        } else if (isAmbiguousCommentError(message)) {
          commentAmbiguous = true;
          result.failed += 1;
          result.errors.push(`${who}: ${message}`);
        } else {
          result.failed += 1;
          result.errors.push(`${who}: ${message}`);
        }
      }
    }

    // In "both" mode the public reply always goes out, not only when the DM
    // was refused: it is a visible answer under the comment, worth posting
    // even for someone who also got the DM. Skipped when the DM said the
    // comment cannot be loaded, since the same lookup backs both calls.
    if ((mode === "public" || mode === "both") && !commentAmbiguous) {
      try {
        const reply = customPublic ?? (await getPersonalizedPublicCommentReply(lead));
        await replyToComment(comment.ig_comment_id, reply);
        result.publicReplies += 1;
        delivered = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        console.error(`runBulkReply public reply failed for ${who}:`, error);
        result.failed += 1;
        result.errors.push(`${who}: ${message}`);
        if (isAmbiguousCommentError(message)) commentAmbiguous = true;
      }
    }

    if (delivered) {
      await markCommentReplied(comment.id);
      result.sent += 1;
      result.sentTo.push(who);
    } else if (commentAmbiguous) {
      ambiguous.push({ id: comment.id, who });
    }

    await new Promise((resolve) => setTimeout(resolve, BULK_REPLY_DELAY_MS));
  }

  // Anything the batch never reached is still queued, whether it was beyond
  // the cap or cut off by the deadline.
  if (!dryRun) result.skipped = scoped.length - processed;

  if (isSystemicFailure(attempted, ambiguous.length)) {
    // Every send failed the same way, so the fault is ours. Nothing is retired
    // and the queue is left intact for a retry once it is fixed.
    result.systemicFailure = true;
    result.errors.unshift(
      `All ${attempted} sends failed the same way. This looks like a token, permission, or endpoint problem rather than deleted comments, so nothing was retired. Fix the cause and run again.`
    );
  } else {
    for (const { id, who } of ambiguous) {
      result.unreachable += 1;
      await markCommentReplied(id).catch((markError) => {
        console.error(`Could not retire unreachable comment ${who}:`, markError);
      });
    }
  }

  if (!dryRun) revalidatePath("/admin/ig-comments");
  return result;
}

/** Adds one Radar send to a bulk result. */
function tallyRadarOutcome(result: BulkRunResult, outcome: RadarDmOutcome, who: string): void {
  if (outcome.status === "sent") {
    result.sent += 1;
    result.dmsDelivered += 1;
    result.sentTo.push(who);
  } else if (outcome.status === "failed") {
    if (outcome.errorCode === "privacy_blocked") result.privacyBlocked += 1;
    else {
      result.failed += 1;
      result.errors.push(`${who}: Radar DM ${outcome.errorCode ?? outcome.reason}`);
    }
  }
  if (outcome.publicReply === "posted") result.publicReplies += 1;
}

/** Sends per Radar pass: one claim, one DM and one public reply each, no Qwen. */
const RADAR_BULK_CAP = 15;

/**
 * The Radar tab's bulk send: keyword and explicit-request comments from the
 * last 7 days that have no Radar DM yet, or whose DM failed. `needsReview`
 * comments are left for a person to read and send one by one. Fixed copy
 * only; the claim makes a double send impossible even if two runs overlap.
 */
async function runRadarBulk(sentBy: string, dryRun: boolean): Promise<BulkRunResult> {
  const queue = await getRadarCommentQueue();
  const pending = queue.filter(
    (item) =>
      isAutoSendableTarget(item.target) &&
      !(item.target.reel && !item.target.reel.dmEnabled) &&
      // A failed send is retried, except one Instagram refused for privacy:
      // retrying that only fails again.
      (item.dm === null || (item.dm.status === "failed" && item.dm.errorCode !== "privacy_blocked"))
  );
  const batch = dryRun ? pending : pending.slice(0, RADAR_BULK_CAP);
  const deadline = Date.now() + 45_000;
  const result: BulkRunResult = {
    sent: 0,
    failed: 0,
    skipped: pending.length - batch.length,
    errors: [],
    sentTo: [],
    unreachable: 0,
    privacyBlocked: 0,
    dmsDelivered: 0,
    publicReplies: 0,
    dryRun,
  };

  let processed = 0;
  for (const { comment } of batch) {
    const who = comment.username ?? comment.ig_comment_id;
    if (dryRun) {
      result.sent += 1;
      result.sentTo.push(who);
      continue;
    }
    if (Date.now() > deadline) {
      result.timedOut = true;
      break;
    }
    processed += 1;
    const outcome = await sendRadarDmFromAdmin(toRadarDmComment(comment), sentBy);
    tallyRadarOutcome(result, outcome, who);
    await new Promise((resolve) => setTimeout(resolve, BULK_REPLY_DELAY_MS));
  }

  if (!dryRun) {
    result.skipped = pending.length - processed;
    revalidatePath("/admin/ig-comments");
  }
  return result;
}
