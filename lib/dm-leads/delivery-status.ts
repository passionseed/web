import type { DmMessage } from "@/types/dm-leads";

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
 * Returns the default friendly public comment reply prompting the student
 * to initiate a DM since Instagram blocked our outbound message.
 */
export function getDefaultPublicCommentReply(username?: string | null): string {
  const mention = username ? `@${username} ` : "";
  return `${mention}พอดีน้องตั้งค่า privacy ไม่เปิดรับ DM จากคนแปลกหน้า พี่เลยส่ง DM หาไม่ได้ 🥺 รบกวนน้องกดทัก DM พี่มาก่อนได้เลยน้า เดี๋ยวพี่ส่งข้อมูล/แนะนำให้ครับ! 📩✨`;
}

/**
 * The DM sent to someone who commented a campaign keyword.
 *
 * Mirrors the copy configured in Meta Business Suite for live comments, so a
 * commenter reached by the backfill gets the same message as one reached
 * automatically. The private-reply endpoint takes plain text only, which is
 * why the follow-up asks for a typed number rather than offering buttons.
 */
export function getDefaultCommentDmMessage(): string {
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
}): Promise<string> {
  const { personalizeMessage } = await import("@/lib/dm-leads/personalize");
  return personalizeMessage({
    template: getDefaultCommentDmMessage(),
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
}): Promise<string> {
  const { personalizeMessage } = await import("@/lib/dm-leads/personalize");
  return personalizeMessage({
    template: getDefaultPublicCommentReply(lead.username),
    lead: {
      displayName: lead.displayName,
      username: lead.username,
      gradeLevel: lead.gradeLevel,
      interests: lead.interests,
    },
    kind: "public_comment",
  });
}
