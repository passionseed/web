import type { DmMessage } from "@/types/dm-leads";
import type { CampaignKey } from "@/lib/meta/comment-intent";
import {
  buildShiftCommentDm,
  buildShiftPublicCommentReply,
} from "@/lib/dm-leads/shift-comment-copy";

/**
 * Checks whether an outbound message failed to deliver specifically because
 * the Instagram user's account does not accept DMs from non-contacts / accounts they don't follow.
 */
export function isDeliveryBlockedByPrivacy(
  message?: Pick<DmMessage, "send_status" | "body" | "metadata"> | null
): boolean {
  if (!message) return false;

  const body = typeof message.body === "string" ? message.body.toLowerCase() : "";
  if (
    body.includes("don't allow new message requests from everyone") ||
    body.includes("can't receive your message") ||
    body.includes("privacy")
  ) {
    return true;
  }

  const metaError =
    message.metadata && typeof (message.metadata as Record<string, unknown>).send_error === "string"
      ? ((message.metadata as Record<string, unknown>).send_error as string).toLowerCase()
      : "";

  if (
    metaError.includes("don't allow new message requests") ||
    metaError.includes("2534019") ||
    metaError.includes("cannot receive") ||
    metaError.includes("privacy")
  ) {
    return true;
  }

  return false;
}

/**
 * Checks whether a message failed to send or deliver.
 */
export function isDeliveryFailed(
  message?: Pick<DmMessage, "send_status" | "body" | "metadata"> | null
): boolean {
  if (!message) return false;
  return message.send_status === "failed" || isDeliveryBlockedByPrivacy(message);
}

/**
 * Checks whether any outbound message in the thread has suffered a delivery failure.
 */
export function hasThreadDeliveryFailure(messages?: DmMessage[] | null): boolean {
  if (!messages || messages.length === 0) return false;
  return messages.some((m) => m.direction === "outbound" && isDeliveryFailed(m));
}

/**
 * Public reply under a comment.
 *
 * SHIFT posts the open cohort's apply link. Every other campaign keeps the
 * privacy note that asks the student to DM first.
 */
export function getDefaultPublicCommentReply(
  username?: string | null,
  campaign?: CampaignKey | null
): string {
  if (campaign === "shift") return buildShiftPublicCommentReply(username);
  const mention = username ? `@${username} ` : "";
  return `${mention}พอดีน้องตั้งค่า privacy ไม่เปิดรับ DM จากคนแปลกหน้า พี่เลยส่ง DM หาไม่ได้ 🥺 รบกวนน้องกดทัก DM พี่มาก่อนได้เลยน้า เดี๋ยวพี่ส่งข้อมูล/แนะนำให้ครับ! 📩✨`;
}

/**
 * The DM sent to someone who commented a campaign keyword.
 *
 * Port and uni keep the tips link. SHIFT uses the open cohort, so the apply
 * link, deadline, and seat count move with `lib/content/shift-cohort.ts`.
 * The private-reply endpoint takes plain text only.
 *
 * Grow, Where, and Prove keyword replies live in Meta Business Suite and are
 * not this message.
 */
export function getDefaultCommentDmMessage(campaign?: CampaignKey | null): string {
  if (campaign === "shift") return buildShiftCommentDm();
  return [
    "ลองดูในลิงค์นี้ได้เลยนะ✌️",
    "https://passionseed.org/tips/intro",
    "และพิมพ์มาว่าเราอยู่กลุ่มไหน 1, 2 หรือ 3",
    "เดี๋ยวพี่ส่ง tips เพิ่มเติมไปให้🫡",
  ].join("\n");
}

export async function getPersonalizedDmMessage(lead: {
  username?: string | null;
  displayName?: string | null;
  gradeLevel?: string | null;
  interests?: string[];
  campaign?: CampaignKey | null;
}): Promise<string> {
  const { personalizeMessage } = await import("@/lib/dm-leads/personalize");
  return personalizeMessage({
    template: getDefaultCommentDmMessage(lead.campaign),
    lead: {
      displayName: lead.displayName,
      username: lead.username,
      gradeLevel: lead.gradeLevel,
      interests: lead.interests,
    },
    // Not "public_comment": that instructs a tag and a "DM us first" ask,
    // which is backwards inside the DM itself.
    kind: "composed",
  });
}

export async function getPersonalizedPublicCommentReply(lead: {
  username?: string | null;
  displayName?: string | null;
  gradeLevel?: string | null;
  interests?: string[];
  campaign?: CampaignKey | null;
}): Promise<string> {
  const { personalizeMessage } = await import("@/lib/dm-leads/personalize");
  return personalizeMessage({
    template: getDefaultPublicCommentReply(lead.username, lead.campaign),
    lead: {
      displayName: lead.displayName,
      username: lead.username,
      gradeLevel: lead.gradeLevel,
      interests: lead.interests,
    },
    // SHIFT already carries the apply link. The public_comment instruction
    // tells the model to ask them to DM first, which drops that link.
    kind: lead.campaign === "shift" ? "composed" : "public_comment",
  });
}
