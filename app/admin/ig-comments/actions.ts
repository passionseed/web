"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { replyToComment, privateReplyToComment } from "@/lib/meta/graph";
import { getCommentsMissedByDm, markCommentReplied } from "@/lib/supabase/ig-comments";
import { getCampaign, type CampaignKey } from "@/lib/meta/comment-intent";
import {
  getPersonalizedDmMessage,
  getPersonalizedPublicCommentReply,
  isDeliveryBlockedByPrivacy,
} from "@/lib/dm-leads/delivery-status";
import { createAdminClient } from "@/utils/supabase/admin";
import { BULK_REPLY_BATCH_CAP } from "./constants";

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
 * DM triggered by the comment. Works even when the commenter never opened a
 * DM thread with us — that's the whole point — but only within 7 days of the
 * comment and only once per comment.
 */
export async function replyPrivately(commentId: string, message: string) {
  await requireAdmin();
  if (!message.trim()) return { ok: false, error: "Message is empty" };

  try {
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
 * Instagram reports a deleted, hidden, or otherwise unreachable comment as
 * error code 100 with subcode 33 ("does not exist, cannot be loaded due to
 * missing permissions, or does not support this operation"). Nothing about
 * that changes on a retry, unlike a rate limit or a network blip.
 */
function isUnrecoverableCommentError(message: string): boolean {
  return message.includes('"code":100') && message.includes('"error_subcode":33');
}


/**
 * The private-reply endpoint is only valid within 7 days of the comment, so a
 * run that includes a DM cannot use the public sweep's 30-day window.
 */
const BULK_DM_WINDOW_DAYS = 7;

/**
 * Which channels one bulk run uses.
 *
 * "both" is the useful default for a backfill: try the DM first, and fall back
 * to a public @mention for whoever refuses message requests, which is roughly
 * half of real commenters. Running them as separate passes would spend each
 * comment's single private reply before knowing whether it landed.
 */
export type BulkReplyMode = "public" | "private" | "both";

export interface BulkRunResult extends BulkReplyResult {
  /**
   * DMs Instagram refused because the account does not accept message
   * requests. Expected for about half of commenters, so it is counted apart
   * from `failed` rather than reported as a fault.
   */
  privacyBlocked: number;
  /** Public replies sent as a fallback after a DM was refused. */
  publicFallbacks: number;
  /** True when the run only previewed and sent nothing. */
  dryRun: boolean;
}

export interface BulkRunOptions {
  mode: BulkReplyMode;
  /** Restricts the run to one campaign's keyword; omit for every campaign. */
  campaign?: CampaignKey;
  /**
   * Overrides the default copy. Personalization is skipped for a custom
   * message so what is typed is what is sent.
   */
  message?: string;
  /** Lists who would be contacted without sending anything. */
  dryRun?: boolean;
}

/**
 * One bulk pass over the comments the DM automation never reached.
 *
 * Each comment affords exactly one private reply, ever, so `dryRun` exists to
 * inspect the recipient list before spending them.
 *
 * One failure never aborts the batch: a privacy refusal falls back to a public
 * reply when the mode allows it, an unreachable comment is retired so it stops
 * occupying a slot in future runs, and anything else is left unmarked to be
 * retried on the next pass.
 */
export async function runBulkReply(options: BulkRunOptions): Promise<BulkRunResult> {
  await requireAdmin();
  const { mode, campaign, dryRun = false } = options;
  const customMessage = options.message?.trim();

  // A DM is only possible inside 7 days; a public-only run can sweep 30.
  const windowDays = mode === "public" ? BULK_REPLY_WINDOW_DAYS : BULK_DM_WINDOW_DAYS;
  const missed = await getCommentsMissedByDm(windowDays);
  const scoped = campaign ? missed.filter((c) => getCampaign(c.text) === campaign) : missed;
  const batch = scoped.slice(0, BULK_REPLY_BATCH_CAP);

  const result: BulkRunResult = {
    sent: 0,
    failed: 0,
    skipped: scoped.length - batch.length,
    errors: [],
    sentTo: [],
    unreachable: 0,
    privacyBlocked: 0,
    publicFallbacks: 0,
    dryRun,
  };

  for (const comment of batch) {
    const who = comment.username ?? comment.ig_comment_id;

    if (dryRun) {
      result.sent += 1;
      result.sentTo.push(who);
      continue;
    }

    const lead = { username: comment.username, gradeLevel: comment.grade_level };
    let delivered = false;
    let privacyRefused = false;

    if (mode === "private" || mode === "both") {
      try {
        const dm = customMessage ?? (await getPersonalizedDmMessage(lead));
        await privateReplyToComment(comment.ig_comment_id, dm);
        delivered = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        console.error(`runBulkReply DM failed for ${who}:`, error);

        if (isDeliveryBlockedByPrivacy({ send_status: "failed", body: "", metadata: { send_error: message } })) {
          result.privacyBlocked += 1;
          privacyRefused = true;
        } else if (isUnrecoverableCommentError(message)) {
          result.unreachable += 1;
          result.failed += 1;
          result.errors.push(`${who}: ${message}`);
          await markCommentReplied(comment.id).catch((markError) => {
            console.error(`Could not retire unreachable comment ${who}:`, markError);
          });
          await new Promise((resolve) => setTimeout(resolve, BULK_REPLY_DELAY_MS));
          continue;
        } else {
          result.failed += 1;
          result.errors.push(`${who}: ${message}`);
        }
      }
    }

    // Public reply: either the chosen channel, or the fallback for a DM the
    // recipient's privacy settings refused.
    const needsPublic =
      mode === "public" || (mode === "both" && privacyRefused);

    if (needsPublic) {
      try {
        const reply = customMessage ?? (await getPersonalizedPublicCommentReply(lead));
        await replyToComment(comment.ig_comment_id, reply);
        if (mode === "both") result.publicFallbacks += 1;
        delivered = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        console.error(`runBulkReply public reply failed for ${who}:`, error);
        result.failed += 1;
        result.errors.push(`${who}: ${message}`);
        if (isUnrecoverableCommentError(message)) {
          result.unreachable += 1;
          await markCommentReplied(comment.id).catch((markError) => {
            console.error(`Could not retire unreachable comment ${who}:`, markError);
          });
        }
      }
    }

    if (delivered) {
      await markCommentReplied(comment.id);
      result.sent += 1;
      result.sentTo.push(who);
    }

    await new Promise((resolve) => setTimeout(resolve, BULK_REPLY_DELAY_MS));
  }

  if (!dryRun) revalidatePath("/admin/ig-comments");
  return result;
}
