import { createAdminClient } from "@/utils/supabase/admin";
import { isCampaignRequest } from "@/lib/meta/comment-intent";
import { isExcludedFromAutoReply } from "@/lib/meta/reply-exclusions";
import { isSelfAuthored } from "@/lib/meta/self-account";
import type { DmLeadClassification, IgComment } from "@/types/dm-leads";

export async function upsertComment(params: {
  igCommentId: string;
  mediaId: string;
  parentCommentId?: string | null;
  username?: string | null;
  igUserId?: string | null;
  text: string;
  commentedAt: string;
}): Promise<IgComment> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ig_comments")
    .upsert(
      {
        ig_comment_id: params.igCommentId,
        media_id: params.mediaId,
        parent_comment_id: params.parentCommentId ?? null,
        username: params.username ?? null,
        ig_user_id: params.igUserId ?? null,
        text: params.text,
        commented_at: params.commentedAt,
      },
      { onConflict: "ig_comment_id", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) {
    console.error("Error upserting ig_comment:", error);
    throw new Error("Failed to record comment");
  }

  return data;
}

export async function getCommentsForAdmin(stage?: string): Promise<IgComment[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("ig_comments")
    .select("*")
    .order("commented_at", { ascending: false });

  if (stage) {
    query = query.eq("stage", stage);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching ig_comments:", error);
    throw new Error("Failed to fetch comments");
  }

  return data ?? [];
}

export async function applyCommentClassification(
  commentId: string,
  classification: DmLeadClassification
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("ig_comments")
    .update({
      grade_level: classification.gradeLevel,
      stage: classification.stage,
      recommended_product: classification.recommendedProduct,
      has_hands_on_experience: classification.hasHandsOnExperience,
      wants_pathlab: classification.wantsPathlab,
      pathlab_pay_ready: classification.pathlabPayReady,
      wants_community: classification.wantsCommunity,
      wants_talent: classification.wantsTalent,
      classified_at: new Date().toISOString(),
    })
    .eq("id", commentId);

  if (error) {
    console.error("Error applying ig comment classification:", error);
    throw new Error("Failed to save classification");
  }
}

/**
 * How long to let a DM sit unanswered before treating it as undelivered.
 * Long enough that someone who saw it overnight has had a chance to reply.
 */
const DEFAULT_MIN_SILENCE_HOURS = 24;

/**
 * Comments we still owe a reply.
 *
 * Three conditions must hold. The commenter asked for the portfolio by using
 * the reel's keyword: anyone who commented something else never invited a DM,
 * so we leave them alone. The comment is not one of our own replies, and the
 * handle is not on the manual skip list. And the person has never written back
 * to us.
 *
 * Silence is the only signal we have that a DM failed. When Instagram refuses
 * a message request the Graph API still reports success, no webhook fires, and
 * the "Not everyone can message this profile" notice appears only in our own
 * inbox: nothing reaches the database, so `send_status` stays null and
 * `isDeliveryBlockedByPrivacy()` never sees the error it was built to catch.
 * A conversation row therefore proves we tried, not that they heard us; only
 * an inbound message proves that. Someone who received the DM and simply chose
 * not to answer looks identical, which is why we wait `minSilenceHours` first
 * and keep the reply worded as an offer rather than an accusation.
 *
 * Only returns comments inside `maxAgeDays`. The 7-day default matches the
 * private-reply window; public replies have no such limit, so the bulk-reply
 * action passes a wider window.
 */
export async function getCommentsMissedByDm(
  maxAgeDays = 7,
  minSilenceHours = DEFAULT_MIN_SILENCE_HOURS,
  /**
   * When true, also drops anyone we have already sent a message to, leaving
   * only commenters no outbound attempt has ever reached.
   *
   * The default keeps the historical behaviour: silence is not proof a DM was
   * delivered (Instagram reports success even when a message request is
   * refused), so a previously-messaged lead is still worth another try. Set
   * this when the goal is specifically to reach untouched people and not to
   * message anyone twice.
   */
  onlyNeverContacted = false
): Promise<IgComment[]> {
  const supabase = createAdminClient();

  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
  const silenceCutoff = new Date(Date.now() - minSilenceHours * 60 * 60 * 1000).toISOString();

  const { data: comments, error } = await supabase
    .from("ig_comments")
    .select("*")
    .gte("commented_at", cutoff)
    .lte("commented_at", silenceCutoff)
    .is("replied_at", null)
    .not("ig_user_id", "is", null)
    .order("commented_at", { ascending: false });

  if (error) {
    console.error("Error fetching ig_comments for dm gap check:", error);
    throw new Error("Failed to fetch comments");
  }
  if (!comments || comments.length === 0) return [];

  const igUserIds = [...new Set(comments.map((c) => c.ig_user_id).filter(Boolean))];

  const { data: matched, error: convError } = await supabase
    .from("dm_conversations")
    .select("id, platform_user_id, dm_messages!inner(direction)")
    .eq("platform", "instagram")
    .eq("dm_messages.direction", "inbound")
    .in("platform_user_id", igUserIds);

  if (convError) {
    console.error("Error checking dm_conversations for gap check:", convError);
    throw new Error("Failed to cross-check conversations");
  }

  const reachedIds = new Set((matched ?? []).map((m) => m.platform_user_id));

  // Any conversation row at all means an outbound attempt exists, whether or
  // not it was delivered. Only looked up when the caller asks to exclude them,
  // so the default path keeps its single cross-check.
  const contactedIds = new Set<string>();
  if (onlyNeverContacted) {
    const { data: anyConvo, error: anyConvoError } = await supabase
      .from("dm_conversations")
      .select("platform_user_id")
      .eq("platform", "instagram")
      .in("platform_user_id", igUserIds);

    if (anyConvoError) {
      console.error("Error checking prior contact for gap check:", anyConvoError);
      throw new Error("Failed to cross-check prior contact");
    }
    for (const row of anyConvo ?? []) contactedIds.add(row.platform_user_id);
  }

  return comments.filter(
    (c) =>
      c.ig_user_id &&
      // Reached means they wrote back, not merely that we sent something.
      !reachedIds.has(c.ig_user_id) &&
      // Optional: skip anyone an earlier send already went out to.
      !(onlyNeverContacted && contactedIds.has(c.ig_user_id)) &&
      // A reply must never be addressed to ourselves.
      !isSelfAuthored({ igUserId: c.ig_user_id, username: c.username }) &&
      // Only people who commented a live campaign's keyword asked to hear
      // from us ("port" and "uni" run alongside each other).
      isCampaignRequest(c.text) &&
      // Hand-maintained skip list: handled off the automation, or asked us to stop.
      !isExcludedFromAutoReply(c.username)
  );
}

export async function markCommentReplied(commentId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("ig_comments")
    .update({ replied_at: new Date().toISOString() })
    .eq("id", commentId);

  if (error) {
    console.error("Error marking comment replied:", error);
    throw new Error("Failed to update comment");
  }
}

export async function getLatestCommentForUser(params: {
  igUserId?: string | null;
  username?: string | null;
}): Promise<IgComment | null> {
  const supabase = createAdminClient();

  let query = supabase
    .from("ig_comments")
    .select("*")
    .order("commented_at", { ascending: false })
    .limit(1);

  if (params.igUserId && params.username) {
    query = query.or(`ig_user_id.eq.${params.igUserId},username.eq.${params.username}`);
  } else if (params.igUserId) {
    query = query.eq("ig_user_id", params.igUserId);
  } else if (params.username) {
    query = query.eq("username", params.username);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("Error fetching latest comment for user:", error);
    return null;
  }

  return data ?? null;
}

