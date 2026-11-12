import {
  applyMessageReaction,
  applyClassification,
  getConversationWithMessages,
  markOutboundDelivered,
  markOutboundRead,
  reconcileOutboundEcho,
  recordInboundMessage,
  updateConversationProfile,
} from "@/lib/supabase/dm-leads";
import { applyCommentClassification, upsertComment } from "@/lib/supabase/ig-comments";
import { classifyConversationText } from "@/lib/meta/classify";
import { getInstagramProfile } from "@/lib/meta/graph";
import { isSelfAuthored } from "@/lib/meta/self-account";
import { maybeAutoSendRadarDm } from "@/lib/radar-guide/comment-dm";
import { handleRadarThreadInbound } from "@/lib/radar-guide/dm-thread";
import type { NormalizedAttachment, NormalizedMetaEvent } from "@/lib/meta/webhook-events";
import type { MetaWebhookEventResult } from "@/lib/supabase/meta-webhook-events";
import type { DmMessageType } from "@/types/dm-leads";

function attachmentLabel(attachments: NormalizedAttachment[]): string {
  if (attachments.length > 1) return `[${attachments.length} attachments]`;
  const type = attachments[0]?.type ?? "attachment";
  return `[${type.charAt(0).toUpperCase()}${type.slice(1)}]`;
}

async function classifyNewTextMessage(conversationId: string): Promise<void> {
  const withMessages = await getConversationWithMessages(conversationId);
  const inboundText = (withMessages?.dm_messages ?? [])
    .filter(
      (message) =>
        message.direction === "inbound" &&
        ["text", "quick_reply", "postback"].includes(message.message_type)
    )
    .map((message) => message.body);
  await applyClassification(conversationId, classifyConversationText(inboundText));
}

async function enrichInstagramProfile(
  conversationId: string,
  senderId: string,
  currentProfile: { username: string | null; displayName: string | null }
): Promise<boolean> {
  if (currentProfile.username && currentProfile.displayName) return false;
  try {
    const profile = await getInstagramProfile(senderId);
    await updateConversationProfile(conversationId, profile);
    return false;
  } catch (error) {
    console.error("Instagram profile enrichment failed after message persistence:", error);
    return true;
  }
}

async function processMessage(
  event: Extract<NormalizedMetaEvent, { kind: "message.text" | "message.attachment" | "message.quick_reply" | "message.echo" }>
): Promise<MetaWebhookEventResult> {
  if (event.kind === "message.echo") {
    if (!event.messageId) {
      return { status: "ignored", skipReason: "echo_message_id_missing" };
    }
    const result = await reconcileOutboundEcho({ platformMessageId: event.messageId });
    return result.outcome === "processed"
      ? { status: "processed", dmMessageId: result.messageId }
      : { status: "ignored", skipReason: "message_echo_without_match" };
  }

  if (!event.platform || !event.senderId) {
    return { status: "ignored", skipReason: "message_platform_or_sender_missing" };
  }

  const body =
    event.text ??
    (event.attachments.length > 0
      ? attachmentLabel(event.attachments)
      : event.kind === "message.quick_reply"
        ? "[Quick reply]"
        : "[Message]");
  const messageType: DmMessageType =
    event.kind === "message.quick_reply"
      ? "quick_reply"
      : event.kind === "message.attachment" || (!event.text && event.attachments.length > 0)
        ? "attachment"
        : "text";
  const write = await recordInboundMessage({
    platform: event.platform,
    platformThreadId: event.senderId,
    platformUserId: event.senderId,
    body,
    platformMessageId: event.messageId ?? event.dedupeKey,
    messageType,
    metadata: event.quickReplyPayload ? { quick_reply_payload: event.quickReplyPayload } : {},
    attachments: event.attachments,
    sentAt: event.occurredAt ?? new Date().toISOString(),
  });

  if (write.outcome === "duplicate") {
    return {
      status: "duplicate",
      conversationId: write.conversation.id,
      dmMessageId: write.messageId,
    };
  }

  const enrichmentFailed = event.platform === "instagram"
    ? await enrichInstagramProfile(
        write.conversation.id,
        event.senderId,
        {
          username: write.conversation.username,
          displayName: write.conversation.display_name,
        }
      )
    : false;

  // Radar-origin threads are not sales leads: no classification, and at most
  // one fixed automatic reply (spec 5.6). The handler never throws.
  const radarConversation = write.conversation as typeof write.conversation & {
    origin?: string | null;
    radar_reply_sent_at?: string | null;
  };
  const isRadarThread = radarConversation.origin === "radar";
  const radarAction = await handleRadarThreadInbound({
    conversationId: write.conversation.id,
    platform: event.platform,
    platformUserId: event.senderId,
    origin: isRadarThread ? "radar" : null,
    radarReplySentAt: radarConversation.radar_reply_sent_at ?? null,
    quickReplyPayload: event.quickReplyPayload ?? null,
  });

  if (!isRadarThread && (event.text || event.quickReplyPayload)) {
    await classifyNewTextMessage(write.conversation.id);
  }

  const metadata: Record<string, string | boolean> = {};
  if (enrichmentFailed) metadata.username_enrichment_failed = true;
  if (radarAction !== "none") metadata.radar_thread = radarAction;

  return {
    status: "processed",
    conversationId: write.conversation.id,
    dmMessageId: write.messageId,
    metadata,
  };
}

export async function processMetaWebhookEvent(
  event: NormalizedMetaEvent
): Promise<MetaWebhookEventResult> {
  switch (event.kind) {
    case "message.text":
    case "message.attachment":
    case "message.quick_reply":
    case "message.echo":
      return processMessage(event);

    case "messaging.postback": {
      if (!event.platform || !event.senderId) {
        return { status: "ignored", skipReason: "postback_platform_or_sender_missing" };
      }
      const write = await recordInboundMessage({
        platform: event.platform,
        platformThreadId: event.senderId,
        platformUserId: event.senderId,
        body: event.title ?? "[Postback]",
        platformMessageId: event.dedupeKey,
        messageType: "postback",
        metadata: event.payload ? { postback_payload: event.payload } : {},
        sentAt: event.occurredAt ?? new Date().toISOString(),
      });
      if (write.outcome === "created") await classifyNewTextMessage(write.conversation.id);
      return {
        status: write.outcome === "created" ? "processed" : "duplicate",
        conversationId: write.conversation.id,
        dmMessageId: write.messageId,
      };
    }

    case "message.reaction": {
      if (!event.senderId) {
        return { status: "ignored", skipReason: "reaction_actor_missing" };
      }
      const result = await applyMessageReaction({
        targetPlatformMessageId: event.targetMessageId,
        actorPlatformUserId: event.senderId,
        reaction: event.reaction,
        action: event.action,
        reactedAt: event.occurredAt ?? new Date().toISOString(),
      });
      return result.outcome === "processed"
        ? { status: "processed", dmMessageId: result.messageId }
        : {
            status: "ignored",
            skipReason: "reaction_target_not_found",
            dmMessageId: result.messageId,
          };
    }

    case "messaging.delivery": {
      if (!event.platform) {
        return { status: "ignored", skipReason: "delivery_platform_missing" };
      }
      const messageIds = await markOutboundDelivered({
        platform: event.platform,
        platformUserId: event.senderId,
        messageIds: event.messageIds,
        watermark: event.watermark,
        occurredAt: event.occurredAt ?? new Date().toISOString(),
      });
      return {
        status: "processed",
        dmMessageId: messageIds[0] ?? null,
        metadata: { updated_message_count: messageIds.length },
      };
    }

    case "messaging.read": {
      if (!event.platform) {
        return { status: "ignored", skipReason: "read_platform_missing" };
      }
      const messageIds = await markOutboundRead({
        platform: event.platform,
        platformUserId: event.senderId,
        watermark: event.watermark,
        occurredAt: event.occurredAt ?? new Date().toISOString(),
      });
      return {
        status: "processed",
        dmMessageId: messageIds[0] ?? null,
        metadata: { updated_message_count: messageIds.length },
      };
    }

    case "comment.created_or_updated": {
      // Our own replies arrive on this webhook too; storing them would put us
      // in our own lead queue.
      if (isSelfAuthored({ igUserId: event.platformUserId, username: event.username })) {
        return { status: "ignored", skipReason: "comment_from_self" };
      }
      const comment = await upsertComment({
        igCommentId: event.commentId,
        mediaId: event.mediaId,
        parentCommentId: event.parentCommentId,
        username: event.username,
        igUserId: event.platformUserId,
        text: event.text,
        commentedAt: event.occurredAt ?? new Date().toISOString(),
      });
      await applyCommentClassification(comment.id, classifyConversationText([comment.text]));
      // Fixed Radar DM when RADAR_COMMENT_DM_AUTO=on and the comment asked for
      // it (spec 5.4). Never throws; the claim makes redeliveries a no-op.
      const dm = await maybeAutoSendRadarDm(comment);
      return {
        status: "processed",
        igCommentId: comment.id,
        ...(dm.reason === "not_radar"
          ? {}
          : { metadata: { radar_dm: dm.status, radar_dm_reason: dm.reason } }),
      };
    }

    case "messaging.referral":
    case "messaging.optin":
    case "messaging.account_linking":
    case "messaging.standby":
    case "change.unsupported":
    case "event.unknown":
      return { status: "ignored", skipReason: event.reason };
  }
}
