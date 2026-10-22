/**
 * Turns a signature-verified LINE webhook body into the events the inbox
 * stores. Only 1:1 chats with a user are kept; group and room events are
 * dropped because the OA does not join group chats.
 */

export interface LineInboundMessage {
  kind: "message";
  webhookEventId: string;
  lineUserId: string;
  occurredAt: string;
  replyToken: string | null;
  lineMessageId: string;
  messageType: string;
  /** Message text, or a readable stand-in for files and locations. */
  text: string | null;
  markAsReadToken: string | null;
  payload: Record<string, unknown>;
}

export interface LineFollowChange {
  kind: "follow" | "unfollow";
  webhookEventId: string;
  lineUserId: string;
  occurredAt: string;
  replyToken: string | null;
}

export type LineInboxEvent = LineInboundMessage | LineFollowChange;

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readableText(message: Json): string | null {
  switch (message.type) {
    case "text":
      return stringOrNull(message.text);
    case "file":
      return stringOrNull(message.fileName);
    case "location":
      return (
        [stringOrNull(message.title), stringOrNull(message.address)].filter(Boolean).join(" · ") ||
        null
      );
    default:
      return null;
  }
}

function toEvent(raw: unknown): LineInboxEvent | null {
  if (!isObject(raw) || !isObject(raw.source)) return null;
  if (raw.source.type !== "user") return null;

  const lineUserId = stringOrNull(raw.source.userId);
  const webhookEventId = stringOrNull(raw.webhookEventId);
  if (!lineUserId || !webhookEventId) return null;

  const occurredAt = new Date(
    typeof raw.timestamp === "number" ? raw.timestamp : Date.now()
  ).toISOString();
  const replyToken = stringOrNull(raw.replyToken);

  if (raw.type === "follow" || raw.type === "unfollow") {
    return { kind: raw.type, webhookEventId, lineUserId, occurredAt, replyToken };
  }

  if (raw.type !== "message" || !isObject(raw.message)) return null;
  const lineMessageId = stringOrNull(raw.message.id);
  const messageType = stringOrNull(raw.message.type);
  if (!lineMessageId || !messageType) return null;

  // Tokens are kept in their own columns, not in the stored payload.
  const { markAsReadToken, quoteToken: _quoteToken, ...payload } = raw.message;

  return {
    kind: "message",
    webhookEventId,
    lineUserId,
    occurredAt,
    replyToken,
    lineMessageId,
    messageType,
    text: readableText(raw.message),
    markAsReadToken: stringOrNull(markAsReadToken),
    payload,
  };
}

export function parseLineWebhook(body: unknown): LineInboxEvent[] {
  if (!isObject(body) || !Array.isArray(body.events)) {
    throw new Error("LINE webhook body has no events array");
  }
  return body.events.map(toEvent).filter((event): event is LineInboxEvent => event !== null);
}
