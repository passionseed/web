"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { replyToComment, privateReplyToComment } from "@/lib/meta/graph";
import { getCommentsMissedByDm, markCommentReplied } from "@/lib/supabase/ig-comments";
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
 * Sends the default "please DM us first" public reply to every comment the DM
 * automation never reached. One failure never aborts the batch — the comment
 * just stays unreplied and shows up again next run, unless it is unreachable,
 * in which case it is retired so it stops occupying a slot.
 */
export async function replyToAllMissedComments(): Promise<BulkReplyResult> {
  await requireAdmin();

  const missed = await getCommentsMissedByDm(BULK_REPLY_WINDOW_DAYS);
  const batch = missed.slice(0, BULK_REPLY_BATCH_CAP);
  const result: BulkReplyResult = {
    sent: 0,
    failed: 0,
    skipped: missed.length - batch.length,
    errors: [],
    sentTo: [],
    unreachable: 0,
  };

  for (const comment of batch) {
    const who = comment.username ?? comment.ig_comment_id;
    try {
      const reply = await getPersonalizedPublicCommentReply({
        username: comment.username,
        gradeLevel: comment.grade_level,
      });
      await replyToComment(comment.ig_comment_id, reply);
      await markCommentReplied(comment.id);
      result.sent += 1;
      result.sentTo.push(who);
    } catch (error) {
      console.error(`replyToAllMissedComments failed for ${who}:`, error);
      result.failed += 1;
      const message = error instanceof Error ? error.message : "unknown error";
      result.errors.push(`${who}: ${message}`);
      // A comment that no longer exists can never be replied to, so retiring it
      // keeps it from taking a slot in every future batch and re-reporting the
      // same error. Other failures stay unmarked so they are retried.
      if (isUnrecoverableCommentError(message)) {
        result.unreachable += 1;
        await markCommentReplied(comment.id).catch((markError) => {
          console.error(`Could not retire unreachable comment ${who}:`, markError);
        });
      }
    }
    await new Promise((resolve) => setTimeout(resolve, BULK_REPLY_DELAY_MS));
  }

  revalidatePath("/admin/ig-comments");
  return result;
}

/**
 * The private-reply endpoint is only valid within 7 days of the comment, so
 * the DM sweep cannot use the public sweep's 30-day window.
 */
const BULK_DM_WINDOW_DAYS = 7;

export interface BulkDmResult extends BulkReplyResult {
  /**
   * Sends Instagram refused because the account does not accept message
   * requests. Counted apart from `failed` because it is the expected outcome
   * for roughly half of commenters, not a fault to investigate — those people
   * need the public @mention reply instead.
   */
  privacyBlocked: number;
  /** True when nothing was sent because this was a preview run. */
  dryRun: boolean;
}

/**
 * DMs every comment still inside the private-reply window.
 *
 * This is the only route to someone who has never messaged us, and each
 * comment affords exactly one attempt, so a dry run is offered first: pass
 * `dryRun` to see who would be messaged without consuming anyone's single
 * chance.
 *
 * One failure never aborts the batch. A privacy refusal is recorded and the
 * comment is left unreplied so the public-reply sweep can pick it up; an
 * unreachable comment is retired the same way the public sweep retires it.
 */
export async function dmAllMissedComments(
  options: { dryRun?: boolean } = {}
): Promise<BulkDmResult> {
  await requireAdmin();
  const dryRun = options.dryRun ?? false;

  const missed = await getCommentsMissedByDm(BULK_DM_WINDOW_DAYS);
  const batch = missed.slice(0, BULK_REPLY_BATCH_CAP);
  const result: BulkDmResult = {
    sent: 0,
    failed: 0,
    skipped: missed.length - batch.length,
    errors: [],
    sentTo: [],
    unreachable: 0,
    privacyBlocked: 0,
    dryRun,
  };

  for (const comment of batch) {
    const who = comment.username ?? comment.ig_comment_id;

    if (dryRun) {
      result.sent += 1;
      result.sentTo.push(who);
      continue;
    }

    try {
      const message = await getPersonalizedDmMessage({
        username: comment.username,
        gradeLevel: comment.grade_level,
      });
      await privateReplyToComment(comment.ig_comment_id, message);
      await markCommentReplied(comment.id);
      result.sent += 1;
      result.sentTo.push(who);
    } catch (error) {
      console.error(`dmAllMissedComments failed for ${who}:`, error);
      const message = error instanceof Error ? error.message : "unknown error";

      // Blocked by the recipient's privacy settings: expected, and the comment
      // stays unreplied so the public sweep can reach them instead.
      if (isDeliveryBlockedByPrivacy({ send_status: "failed", body: "", metadata: { send_error: message } })) {
        result.privacyBlocked += 1;
      } else if (isUnrecoverableCommentError(message)) {
        result.unreachable += 1;
        result.failed += 1;
        result.errors.push(`${who}: ${message}`);
        await markCommentReplied(comment.id).catch((markError) => {
          console.error(`Could not retire unreachable comment ${who}:`, markError);
        });
      } else {
        result.failed += 1;
        result.errors.push(`${who}: ${message}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, BULK_REPLY_DELAY_MS));
  }

  if (!dryRun) revalidatePath("/admin/ig-comments");
  return result;
}
