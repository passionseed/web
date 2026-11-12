/**
 * Radar-origin DM threads (spec 5.6, safeguarding). Never throws.
 *
 * A student who typed RADAR is not a sales lead. When they reply to the Radar
 * DM, the thread gets at most one fixed automatic reply pointing them to
 * public comments, and nothing else is ever sent automatically. The fencing
 * from lead scoring, buckets, campaigns, copilot and Qwen lives in the sales
 * tooling (`lib/supabase/dm-leads.ts`, `dm-campaigns.ts`, `send-gate.ts`).
 *
 * The quick-reply flow (flag RADAR_DM_QUICK_REPLY, off) also lands here: a
 * tap on "ส่งลิงก์ให้เลย" sends the stored fixed link message once.
 */
import type { DmPlatform } from "@/types/dm-leads";
import {
  isRadarFixedTemplate,
  parseRadarQuickReplyPayload,
  RADAR_THREAD_REPLY,
} from "./dm-copy";
import type { RadarCommentDmRow } from "./types";

export type RadarConversationOrigin = "radar" | null;

export interface RadarThreadInbound {
  conversationId: string;
  platform: DmPlatform;
  /** The Send API recipient (the sender of the inbound message). */
  platformUserId: string;
  origin: RadarConversationOrigin;
  radarReplySentAt: string | null;
  /** `message.quick_reply.payload`, when the inbound was a button tap. */
  quickReplyPayload?: string | null;
}

export type RadarThreadAction =
  | "none"
  | "thread_reply_sent"
  | "thread_reply_already"
  | "thread_reply_failed"
  | "tap_link_sent"
  | "tap_already"
  | "tap_invalid"
  | "tap_failed"
  | "error";

export interface RadarThreadDeps {
  /** Sets `radar_reply_sent_at` only if it is null on a radar thread. True when this caller won. */
  claimThreadReply(conversationId: string): Promise<boolean>;
  /** Clears `radar_reply_sent_at` after a failed send so a later message can retry. */
  releaseThreadReply(conversationId: string): Promise<void>;
  getCommentDm(id: string): Promise<Pick<RadarCommentDmRow, "id" | "status" | "message" | "dm_tap_at"> | null>;
  /** Sets `dm_tap_at` only if it is null. True when this caller won. */
  claimTap(dmId: string): Promise<boolean>;
  releaseTap(dmId: string): Promise<void>;
  /** Send API text message; returns Meta's message id. */
  send(platform: DmPlatform, recipientId: string, text: string): Promise<string>;
  /** Writes the automatic message into the thread so admins can see it. */
  recordOutbound(conversationId: string, text: string, platformMessageId: string): Promise<void>;
}

/** Pure decision: what an inbound message on this thread should trigger. */
export function radarThreadDecision(
  input: RadarThreadInbound
): { kind: "tap"; dmId: string } | { kind: "thread_reply" } | { kind: "none" } {
  const dmId = parseRadarQuickReplyPayload(input.quickReplyPayload);
  if (dmId) return { kind: "tap", dmId };
  if (input.origin === "radar" && !input.radarReplySentAt) return { kind: "thread_reply" };
  return { kind: "none" };
}

async function quietly(task: () => Promise<unknown>): Promise<void> {
  try {
    await task();
  } catch (error) {
    console.error("Radar thread follow-up write failed", {
      errorCode: "radar_thread_write_failed",
      message: error instanceof Error ? error.message.slice(0, 120) : "unknown",
    });
  }
}

async function sendTapLink(input: RadarThreadInbound, dmId: string, deps: RadarThreadDeps): Promise<RadarThreadAction> {
  const row = await deps.getCommentDm(dmId);
  // Only a sent Radar DM whose stored message is still one of our fixed
  // templates; anything else is ignored rather than sent.
  if (!row || row.status !== "sent" || !row.message || !isRadarFixedTemplate(row.message)) {
    return "tap_invalid";
  }
  if (row.dm_tap_at) return "tap_already";
  if (!(await deps.claimTap(dmId))) return "tap_already";
  try {
    const messageId = await deps.send(input.platform, input.platformUserId, row.message);
    await quietly(() => deps.recordOutbound(input.conversationId, row.message!, messageId));
    // The link is this thread's one automatic reply; no thank-you on top.
    await quietly(() => deps.claimThreadReply(input.conversationId));
    return "tap_link_sent";
  } catch {
    await quietly(() => deps.releaseTap(dmId));
    return "tap_failed";
  }
}

async function sendThreadReply(input: RadarThreadInbound, deps: RadarThreadDeps): Promise<RadarThreadAction> {
  if (!(await deps.claimThreadReply(input.conversationId))) return "thread_reply_already";
  try {
    const messageId = await deps.send(input.platform, input.platformUserId, RADAR_THREAD_REPLY);
    await quietly(() => deps.recordOutbound(input.conversationId, RADAR_THREAD_REPLY, messageId));
    return "thread_reply_sent";
  } catch {
    await quietly(() => deps.releaseThreadReply(input.conversationId));
    return "thread_reply_failed";
  }
}

/**
 * Called from the webhook's message branch after the inbound message is
 * stored. Sends at most one fixed message and never throws.
 */
export async function handleRadarThreadInbound(
  input: RadarThreadInbound,
  deps: RadarThreadDeps = defaultRadarThreadDeps()
): Promise<RadarThreadAction> {
  try {
    const decision = radarThreadDecision(input);
    if (decision.kind === "tap") return await sendTapLink(input, decision.dmId, deps);
    if (decision.kind === "thread_reply") return await sendThreadReply(input, deps);
    return "none";
  } catch (error) {
    console.error("Radar thread handling failed", {
      errorCode: "radar_thread_failed",
      message: error instanceof Error ? error.message.slice(0, 120) : "unknown",
    });
    return "error";
  }
}

/** Production wiring: service-role Supabase and the Send API. Imported lazily. */
export function defaultRadarThreadDeps(): RadarThreadDeps {
  const db = async () => (await import("@/utils/supabase/admin")).createAdminClient();
  return {
    async claimThreadReply(conversationId) {
      const { data, error } = await (await db())
        .from("dm_conversations")
        .update({ radar_reply_sent_at: new Date().toISOString() })
        .eq("id", conversationId)
        .eq("origin", "radar")
        .is("radar_reply_sent_at", null)
        .select("id");
      if (error) throw new Error(error.message);
      return (data ?? []).length > 0;
    },
    async releaseThreadReply(conversationId) {
      const { error } = await (await db())
        .from("dm_conversations")
        .update({ radar_reply_sent_at: null })
        .eq("id", conversationId);
      if (error) throw new Error(error.message);
    },
    async getCommentDm(id) {
      const { getRadarCommentDm } = await import("@/lib/supabase/radar-reels");
      return getRadarCommentDm(id);
    },
    async claimTap(dmId) {
      const { data, error } = await (await db())
        .from("radar_comment_dms")
        .update({ dm_tap_at: new Date().toISOString() })
        .eq("id", dmId)
        .is("dm_tap_at", null)
        .select("id");
      if (error) throw new Error(error.message);
      return (data ?? []).length > 0;
    },
    async releaseTap(dmId) {
      const { error } = await (await db())
        .from("radar_comment_dms")
        .update({ dm_tap_at: null })
        .eq("id", dmId);
      if (error) throw new Error(error.message);
    },
    async send(platform, recipientId, text) {
      const { sendMetaMessage } = await import("@/lib/meta/graph");
      return sendMetaMessage(platform, recipientId, text);
    },
    async recordOutbound(conversationId, text, platformMessageId) {
      const { recordRadarAutoOutbound } = await import("@/lib/supabase/dm-leads");
      await recordRadarAutoOutbound({ conversationId, body: text, platformMessageId });
    },
  };
}
