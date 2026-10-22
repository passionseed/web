import { randomUUID } from "node:crypto";
import {
  getLineOaProfile,
  lineErrorMessage,
  lineErrorStatus,
  markLineOaRead,
  pushLineOaText,
  replyLineOaText,
} from "@/lib/line-oa/client";
import { LINE_TEXT_LIMIT } from "@/lib/line-oa/limits";
import type { LineInboxEvent } from "@/lib/line-oa/webhook-events";
import {
  claimLineReplyToken,
  getLatestMarkAsReadToken,
  getLineContact,
  getOrCreateLineContact,
  recordLineFollowChange,
  recordLineInboundMessage,
  recordLineOutboundMessage,
  saveLineContactProfile,
  type LineContact,
} from "@/lib/supabase/line-oa";

const PROFILE_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

function profileIsStale(contact: LineContact): boolean {
  if (!contact.profile_fetched_at) return true;
  return Date.now() - new Date(contact.profile_fetched_at).getTime() > PROFILE_REFRESH_MS;
}

/** A missing profile should never cost us the message itself. */
async function refreshProfile(contact: LineContact): Promise<void> {
  try {
    await saveLineContactProfile(contact.id, await getLineOaProfile(contact.line_user_id));
  } catch (error) {
    console.warn("[line-oa] profile refresh failed", {
      contactId: contact.id,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function storeLineInboxEvent(event: LineInboxEvent): Promise<"created" | "duplicate"> {
  const contact = await getOrCreateLineContact(event.lineUserId);
  if (event.kind !== "unfollow" && (event.kind === "follow" || profileIsStale(contact))) {
    await refreshProfile(contact);
  }
  return event.kind === "message"
    ? recordLineInboundMessage(contact.id, event)
    : recordLineFollowChange(contact.id, event);
}

interface Delivery {
  method: "reply" | "push";
  lineMessageId: string | null;
}

/**
 * A fresh reply token is free, so it is tried first. LINE answers 400 for a
 * used or expired token, and only then do we push, which counts against the
 * monthly quota. Any other reply error is ambiguous (it may have arrived), so
 * it is not retried as a push.
 */
async function deliver(contact: LineContact, text: string, retryKey: string): Promise<Delivery> {
  const replyToken = await claimLineReplyToken(contact.id);
  if (replyToken) {
    try {
      return { method: "reply", lineMessageId: await replyLineOaText(replyToken, text) };
    } catch (error) {
      if (lineErrorStatus(error) !== 400) throw error;
    }
  }
  return {
    method: "push",
    lineMessageId: await pushLineOaText(contact.line_user_id, text, retryKey),
  };
}

/**
 * Sends an admin reply and logs it, including failures, so the thread shows
 * exactly what the customer received.
 */
export async function sendLineInboxReply(params: {
  contactId: string;
  text: string;
  adminUserId: string;
}): Promise<{ method: "reply" | "push" }> {
  const text = params.text.trim();
  if (!text) throw new Error("Message is empty");
  if (text.length > LINE_TEXT_LIMIT) {
    throw new Error(`LINE messages are limited to ${LINE_TEXT_LIMIT} characters`);
  }

  const contact = await getLineContact(params.contactId);
  if (!contact) throw new Error("Conversation not found");

  const outbound = { contactId: contact.id, text, sentBy: params.adminUserId, retryKey: randomUUID() };

  let delivery: Delivery;
  try {
    delivery = await deliver(contact, text, outbound.retryKey);
  } catch (error) {
    const message = lineErrorMessage(error);
    await recordLineOutboundMessage({
      ...outbound,
      sendMethod: null,
      sendStatus: "failed",
      lineMessageId: null,
      error: message,
    });
    if (!contact.is_following) throw new Error("This person has blocked or unfollowed the account");
    throw new Error(message);
  }

  await recordLineOutboundMessage({
    ...outbound,
    sendMethod: delivery.method,
    sendStatus: "sent",
    lineMessageId: delivery.lineMessageId,
    error: null,
  });
  await markThreadRead(contact.id);
  return { method: delivery.method };
}

/** Shows "Read" to the customer in LINE. Cosmetic, so failures are only logged. */
async function markThreadRead(contactId: string): Promise<void> {
  try {
    const token = await getLatestMarkAsReadToken(contactId);
    if (token) await markLineOaRead(token);
  } catch (error) {
    console.warn("[line-oa] mark as read failed", { contactId, error: lineErrorMessage(error) });
  }
}
