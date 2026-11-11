"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import {
  sendAdminReply,
  sendLeadQuickReplies,
  getConversationWithMessages,
  isRadarOriginConversation,
  updateLeadMeta,
} from "@/lib/supabase/dm-leads";
import type { MetaAttachmentType, MetaQuickReplyOption } from "@/lib/meta/graph";
import type { DmLeadStage, DmLeadStatus } from "@/types/dm-leads";
import type { PersonalizeKind } from "@/lib/dm-leads/personalize";

async function personalizeOutboundText(
  conversationId: string,
  body: string,
  kind: PersonalizeKind
): Promise<string> {
  if (!body.trim()) return body;
  const { leadFromConversation, lastInboundFromMessages, personalizeMessage } = await import(
    "@/lib/dm-leads/personalize"
  );
  const thread = await getConversationWithMessages(conversationId);
  if (!thread) return body.trim();
  // Radar-origin threads never go through Qwen (spec 5.6).
  if (isRadarOriginConversation(thread)) return body.trim();
  return personalizeMessage({
    template: body.trim(),
    lead: leadFromConversation(thread, {
      lastInbound: lastInboundFromMessages(thread.dm_messages),
    }),
    kind,
  });
}

/**
 * Rewrites one template in the lead's voice.
 *
 * Takes a conversation id rather than a `PersonalizeLead`: the lead carries
 * `activitiesSummary`, which is the whole concatenated DM history, and shipping
 * it up from the browser on every call made the request payload enormous — and
 * let the client decide what the model sees. The server already has to load the
 * thread for `lastInbound`, so reading the lead here costs nothing extra.
 *
 * Call this on demand (insert, copy, send), never eagerly for a list of
 * templates: Server Actions are dispatched one at a time by the client, so N
 * speculative rewrites serialize into N × inference latency and block every
 * other action queued behind them.
 */
export async function personalizeLeadCopyAction(input: {
  conversationId: string;
  template: string;
  kind?: PersonalizeKind;
}) {
  await requireAdmin();
  if (!input.template.trim()) return { ok: true, body: input.template, error: null };
  try {
    const body = await personalizeOutboundText(
      input.conversationId,
      input.template,
      input.kind ?? "composed"
    );
    return { ok: true, body, error: null };
  } catch (error) {
    console.error("personalizeLeadCopyAction failed:", error);
    return {
      ok: false,
      body: input.template,
      error: error instanceof Error ? error.message : "Failed to personalize",
    };
  }
}

export async function replyToLead(
  conversationId: string,
  body: string,
  attachmentUrl?: string,
  attachmentType?: MetaAttachmentType
) {
  await requireAdmin();

  if (!body.trim() && !attachmentUrl) {
    return { ok: false, error: "Message is empty" };
  }

  try {
    await sendAdminReply(conversationId, { text: body.trim(), attachmentUrl, attachmentType });
  } catch (error) {
    console.error("replyToLead failed:", error);
    const message = error instanceof Error ? error.message : "Failed to send reply";
    return { ok: false, error: message };
  }

  revalidatePath("/admin/dm-leads");
  revalidatePath(`/admin/dm-leads/${conversationId}`);
  return { ok: true, error: null };
}

export async function sendQuickReplyButtons(
  conversationId: string,
  text: string,
  options: MetaQuickReplyOption[]
) {
  await requireAdmin();

  try {
    const prompt = await personalizeOutboundText(conversationId, text, "button_prompt");
    await sendLeadQuickReplies(conversationId, prompt, options);
  } catch (error) {
    console.error("sendQuickReplyButtons failed:", error);
    const message = error instanceof Error ? error.message : "Failed to send quick replies";
    return { ok: false, error: message };
  }

  revalidatePath("/admin/dm-leads");
  revalidatePath(`/admin/dm-leads/${conversationId}`);
  return { ok: true, error: null };
}

export async function getThread(conversationId: string) {
  await requireAdmin();
  return getConversationWithMessages(conversationId);
}

export type LeadMetaPatch = Partial<{
  starred: boolean;
  follow_up_at: string | null;
  lead_status: DmLeadStatus;
  admin_tags: string[];
  grade_level: string | null;
  interests: string[];
  stage: DmLeadStage;
}>;

export async function updateLead(conversationId: string, patch: LeadMetaPatch) {
  await requireAdmin();

  try {
    await updateLeadMeta(conversationId, patch);
  } catch (error) {
    console.error("updateLead failed:", error);
    return { ok: false, error: "Failed to update lead" };
  }

  revalidatePath("/admin/dm-leads");
  return { ok: true, error: null };
}

export async function generatePlanDraftAction(req: {
  studentName: string;
  gradeLevel: string;
  targetField: string;
  interests?: string[];
  conversationId?: string;
  readinessScore?: number;
}) {
  await requireAdmin();
  const { generateDraftPlan } = await import("@/lib/plans/generator");
  return generateDraftPlan(req);
}

export async function saveStudentPlanAction(input: import("@/types/student-plan").CreateStudentPlanInput) {
  await requireAdmin();
  try {
    const { createStudentPlan } = await import("@/lib/supabase/student-plans");
    const plan = await createStudentPlan(input);
    revalidatePath(`/admin/dm-leads/${input.conversation_id}`);
    return { ok: true, plan, error: null };
  } catch (error) {
    console.error("saveStudentPlanAction failed:", error);
    const message = error instanceof Error ? error.message : "Failed to save plan";
    return { ok: false, plan: null, error: message };
  }
}

export async function getLeadCommentInfo(conversationId: string) {
  await requireAdmin();
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const supabase = createAdminClient();
  const { data: conversation } = await supabase
    .from("dm_conversations")
    .select("platform_user_id, username")
    .eq("id", conversationId)
    .single();

  if (!conversation) return null;
  const { getLatestCommentForUser } = await import("@/lib/supabase/ig-comments");
  const comment = await getLatestCommentForUser({
    igUserId: conversation.platform_user_id,
    username: conversation.username,
  });
  return comment;
}

export async function replyPubliclyToLeadComment(commentId: string, message: string) {
  await requireAdmin();
  const { replyPublicly } = await import("@/app/admin/ig-comments/actions");
  return replyPublicly(commentId, message);
}

export async function syncLeadMessages(conversationId: string) {
  await requireAdmin();

  try {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const supabase = createAdminClient();
    const { data: conv, error: convError } = await supabase
      .from("dm_conversations")
      .select("id, platform, platform_user_id, platform_thread_id, username, display_name")
      .eq("id", conversationId)
      .single();

    if (convError || !conv) {
      throw new Error("Conversation not found");
    }

    let isRateLimited = false;
    let isTokenExpired = false;
    let metaFound = false;
    let messagesSynced = 0;
    let metaWarning: string | null = null;

    if (
      conv.platform === "instagram" &&
      process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID &&
      process.env.META_PAGE_ACCESS_TOKEN
    ) {
      try {
        const { findInstagramConversationForUser, getConversationMessages, getInstagramProfile } = await import(
          "@/lib/meta/graph"
        );
        const { recordBackfilledMessage, applyClassification, updateConversationProfile } = await import(
          "@/lib/supabase/dm-leads"
        );
        const { classifyConversationText } = await import("@/lib/meta/classify");

        const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
        const targetUserId = conv.platform_user_id || conv.platform_thread_id;
        const graphConvoId = await findInstagramConversationForUser(igUserId, targetUserId);

        if (graphConvoId) {
          metaFound = true;
          const profile = await getInstagramProfile(targetUserId);
          await updateConversationProfile(conversationId, profile);
          const messages = await getConversationMessages(graphConvoId);
          const inboundBodies: string[] = [];

          for (const msg of messages) {
            const direction = msg.from?.id === igUserId ? "outbound" : "inbound";
            const attachments = (msg.attachments?.data ?? []).map((att) => ({
              type: att.image_data ? "image" : att.video_data ? "video" : "attachment",
              url: att.image_data?.url || att.file_url || att.video_data?.url || null,
              title: att.name || (att.image_data ? "Image" : "Attachment"),
              payload: {
                mime_type: att.mime_type,
                size: att.size,
                preview_url: att.image_data?.preview_url || att.video_data?.preview_url,
              },
            }));

            const bodyText =
              msg.message ||
              (attachments.length > 0
                ? attachments.some((a) => a.type === "image")
                  ? "[Image]"
                  : "[Attachment]"
                : "");

            if (!bodyText && attachments.length === 0) continue;

            await recordBackfilledMessage({
              platform: "instagram",
              platformThreadId: conv.platform_thread_id,
              platformUserId: conv.platform_user_id,
              username: profile.username ?? conv.username ?? null,
              displayName: profile.displayName ?? conv.display_name ?? null,
              direction,
              body: bodyText || "[Attachment]",
              platformMessageId: msg.id,
              sentAt: msg.created_time,
              messageType: attachments.length > 0 ? "attachment" : "text",
              attachments,
            });

            messagesSynced += 1;
            if (direction === "inbound" && bodyText) inboundBodies.push(bodyText);
          }

          if (inboundBodies.length > 0) {
            const classification = classifyConversationText(inboundBodies);
            await applyClassification(conversationId, classification);
          }
        } else {
          metaWarning = "ไม่พบบทสนทนานี้ในรายการล่าสุดของ Instagram Graph API";
        }
      } catch (metaErr) {
        console.error("Meta Graph API sync error for conversation:", metaErr);
        const { MetaGraphApiError } = await import("@/lib/meta/graph");
        if (metaErr instanceof MetaGraphApiError) {
          isRateLimited = metaErr.isRateLimited;
          isTokenExpired = metaErr.isTokenExpired;
          metaWarning = isRateLimited
            ? "ติด Meta API Rate Limit (กำลังใช้งานเกินโควตา Instagram API ชั่วคราว)"
            : isTokenExpired
              ? "Meta Access Token หมดอายุ"
              : metaErr.message;
        } else {
          metaWarning = metaErr instanceof Error ? metaErr.message : "Graph API error";
        }
      }
    }

    const updated = await getConversationWithMessages(conversationId);
    revalidatePath("/admin/dm-leads");
    revalidatePath(`/admin/dm-leads/${conversationId}`);
    return {
      ok: !isRateLimited && !isTokenExpired,
      conversation: updated,
      error: metaWarning,
      isRateLimited,
      isTokenExpired,
      metaFound,
      messagesSynced,
    };
  } catch (error) {
    console.error("syncLeadMessages failed:", error);
    const message = error instanceof Error ? error.message : "Failed to sync conversation";
    return { ok: false, conversation: null, error: message, isRateLimited: false };
  }
}

