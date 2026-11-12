import { createAdminClient } from "@/utils/supabase/admin";
import {
  LINE_CONTACT_LIST_LIMIT,
  type LineContactFilter,
} from "@/lib/admin/queue-tools/line";
import type { LineOaProfile } from "@/lib/line-oa/client";
import type { LineFollowChange, LineInboundMessage } from "@/lib/line-oa/webhook-events";

/**
 * LINE OA inbox storage. Runs through the service-role client: the webhook has
 * no signed-in user, and admin callers gate with `requireAdmin()` first.
 */

export interface LineContact {
  id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  status_message: string | null;
  is_following: boolean;
  profile_fetched_at: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_direction: "inbound" | "outbound" | null;
  unread_count: number;
  created_at: string;
}

export interface LineMessage {
  id: string;
  contact_id: string;
  direction: "inbound" | "outbound";
  message_type: string;
  text: string | null;
  line_message_id: string | null;
  sent_by: string | null;
  send_method: "reply" | "push" | null;
  send_status: "pending" | "sent" | "failed";
  error: string | null;
  payload: Record<string, unknown>;
  sent_at: string;
}

const CONTACT_COLUMNS =
  "id, line_user_id, display_name, picture_url, status_message, is_following, profile_fetched_at, last_message_at, last_message_preview, last_message_direction, unread_count, created_at";
const MESSAGE_COLUMNS =
  "id, contact_id, direction, message_type, text, line_message_id, sent_by, send_method, send_status, error, payload, sent_at";

const UNIQUE_VIOLATION = "23505";

/** Reply tokens this old are not worth trying; LINE expires them quickly. */
const REPLY_TOKEN_MAX_AGE_MS = 20 * 60 * 1000;

export async function getOrCreateLineContact(lineUserId: string): Promise<LineContact> {
  const supabase = createAdminClient();
  const { error: insertError } = await supabase
    .from("line_contacts")
    .upsert({ line_user_id: lineUserId }, { onConflict: "line_user_id", ignoreDuplicates: true });
  if (insertError) throw new Error(`line_contacts upsert failed: ${insertError.message}`);

  const { data, error } = await supabase
    .from("line_contacts")
    .select(CONTACT_COLUMNS)
    .eq("line_user_id", lineUserId)
    .single();
  if (error || !data) throw new Error(`line_contacts read failed: ${error?.message}`);
  return data as LineContact;
}

export async function saveLineContactProfile(contactId: string, profile: LineOaProfile) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("line_contacts")
    .update({
      display_name: profile.displayName,
      picture_url: profile.pictureUrl,
      status_message: profile.statusMessage,
      language: profile.language,
      profile_fetched_at: new Date().toISOString(),
    })
    .eq("id", contactId);
  if (error) throw new Error(`line_contacts profile update failed: ${error.message}`);
}

/** Inserts an event row, treating a repeated webhookEventId as already stored. */
async function insertEventRow(row: Record<string, unknown>): Promise<"created" | "duplicate"> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("line_messages").insert(row);
  if (!error) return "created";
  if (error.code === UNIQUE_VIOLATION) return "duplicate";
  throw new Error(`line_messages insert failed: ${error.message}`);
}

export async function recordLineInboundMessage(
  contactId: string,
  event: LineInboundMessage
): Promise<"created" | "duplicate"> {
  return insertEventRow({
    contact_id: contactId,
    direction: "inbound",
    message_type: event.messageType,
    text: event.text,
    line_message_id: event.lineMessageId,
    webhook_event_id: event.webhookEventId,
    reply_token: event.replyToken,
    mark_as_read_token: event.markAsReadToken,
    payload: event.payload,
    sent_at: event.occurredAt,
  });
}

export async function recordLineFollowChange(
  contactId: string,
  event: LineFollowChange
): Promise<"created" | "duplicate"> {
  const outcome = await insertEventRow({
    contact_id: contactId,
    direction: "inbound",
    message_type: event.kind,
    webhook_event_id: event.webhookEventId,
    reply_token: event.replyToken,
    sent_at: event.occurredAt,
  });
  if (outcome === "duplicate") return outcome;

  const supabase = createAdminClient();
  const following = event.kind === "follow";
  const { error } = await supabase
    .from("line_contacts")
    .update(
      following
        ? { is_following: true, followed_at: event.occurredAt }
        : { is_following: false, unfollowed_at: event.occurredAt }
    )
    .eq("id", contactId);
  if (error) throw new Error(`line_contacts follow update failed: ${error.message}`);
  return outcome;
}

export interface LineContactListResult {
  contacts: LineContact[];
  /** More contacts match than the list shows. */
  truncated: boolean;
  limit: number;
}

/**
 * Newest chats first, at most LINE_CONTACT_LIST_LIMIT. "unanswered" is the
 * work queue: the contact wrote last and still follows the account, so a
 * reply can reach them.
 */
export async function listLineContacts({
  search,
  filter = "all",
}: { search?: string; filter?: LineContactFilter } = {}): Promise<LineContactListResult> {
  const supabase = createAdminClient();
  let query = supabase
    .from("line_contacts")
    .select(CONTACT_COLUMNS)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    // One extra row tells us whether the list was cut off.
    .limit(LINE_CONTACT_LIST_LIMIT + 1);
  if (search) query = query.ilike("display_name", `%${search.replace(/[%_]/g, "\\$&")}%`);
  if (filter === "unanswered") {
    query = query.eq("last_message_direction", "inbound").eq("is_following", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(`line_contacts list failed: ${error.message}`);
  const rows = (data ?? []) as LineContact[];
  return {
    contacts: rows.slice(0, LINE_CONTACT_LIST_LIMIT),
    truncated: rows.length > LINE_CONTACT_LIST_LIMIT,
    limit: LINE_CONTACT_LIST_LIMIT,
  };
}

export async function getLineContact(contactId: string): Promise<LineContact | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("line_contacts")
    .select(CONTACT_COLUMNS)
    .eq("id", contactId)
    .maybeSingle();
  if (error) throw new Error(`line_contacts read failed: ${error.message}`);
  return data as LineContact | null;
}

export async function getLineMessages(contactId: string): Promise<LineMessage[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("line_messages")
    .select(MESSAGE_COLUMNS)
    .eq("contact_id", contactId)
    .order("sent_at", { ascending: true })
    .limit(1000);
  if (error) throw new Error(`line_messages read failed: ${error.message}`);
  return (data ?? []) as LineMessage[];
}

export async function markLineContactSeen(contactId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("line_contacts")
    .update({ unread_count: 0 })
    .eq("id", contactId)
    .gt("unread_count", 0);
  if (error) throw new Error(`line_contacts seen update failed: ${error.message}`);
}

/**
 * Claims the newest unused reply token for a contact. The conditional update
 * means two admins replying at once cannot both spend the same token.
 */
export async function claimLineReplyToken(contactId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - REPLY_TOKEN_MAX_AGE_MS).toISOString();
  const { data: candidate, error } = await supabase
    .from("line_messages")
    .select("id, reply_token")
    .eq("contact_id", contactId)
    .eq("direction", "inbound")
    .not("reply_token", "is", null)
    .is("reply_token_used_at", null)
    .gte("sent_at", since)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`reply token lookup failed: ${error.message}`);
  if (!candidate?.reply_token) return null;

  const { data: claimed, error: claimError } = await supabase
    .from("line_messages")
    .update({ reply_token_used_at: new Date().toISOString() })
    .eq("id", candidate.id)
    .is("reply_token_used_at", null)
    .select("id");
  if (claimError) throw new Error(`reply token claim failed: ${claimError.message}`);
  return claimed?.length ? candidate.reply_token : null;
}

/** The newest inbound read token; marking it read also marks everything before it. */
export async function getLatestMarkAsReadToken(contactId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("line_messages")
    .select("mark_as_read_token")
    .eq("contact_id", contactId)
    .eq("direction", "inbound")
    .not("mark_as_read_token", "is", null)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`read token lookup failed: ${error.message}`);
  return data?.mark_as_read_token ?? null;
}

export async function recordLineOutboundMessage(row: {
  contactId: string;
  text: string;
  sentBy: string;
  sendMethod: "reply" | "push" | null;
  sendStatus: "sent" | "failed";
  lineMessageId: string | null;
  error: string | null;
  retryKey: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("line_messages").insert({
    contact_id: row.contactId,
    direction: "outbound",
    message_type: "text",
    text: row.text,
    line_message_id: row.lineMessageId,
    sent_by: row.sentBy,
    send_method: row.sendMethod,
    send_status: row.sendStatus,
    error: row.error,
    payload: { retry_key: row.retryKey },
  });
  if (error) throw new Error(`line_messages outbound insert failed: ${error.message}`);
}

/** Only media we actually received may be fetched through the admin proxy. */
export async function isStoredLineInboundMedia(lineMessageId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("line_messages")
    .select("id")
    .eq("line_message_id", lineMessageId)
    .eq("direction", "inbound")
    .in("message_type", ["image", "video", "audio", "file"])
    .limit(1);
  if (error) throw new Error(`line_messages media lookup failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}
