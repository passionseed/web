import * as line from "@line/bot-sdk";

/**
 * Client for the PassionSeed LINE Official Account (@passionseed).
 *
 * This is a different Messaging API channel from the hackathon mentor bot in
 * `lib/hackathon/line.ts`, so it reads its own LINE_OA_* env vars. Clients are
 * built per call so importing this module never throws during `next build`.
 */

function requireEnv(name: "LINE_OA_CHANNEL_SECRET" | "LINE_OA_CHANNEL_ACCESS_TOKEN"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function getClient(): line.messagingApi.MessagingApiClient {
  return new line.messagingApi.MessagingApiClient({
    channelAccessToken: requireEnv("LINE_OA_CHANNEL_ACCESS_TOKEN"),
  });
}

function getBlobClient(): line.messagingApi.MessagingApiBlobClient {
  return new line.messagingApi.MessagingApiBlobClient({
    channelAccessToken: requireEnv("LINE_OA_CHANNEL_ACCESS_TOKEN"),
  });
}

export function verifyLineOaSignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  return line.validateSignature(body, requireEnv("LINE_OA_CHANNEL_SECRET"), signature);
}

export interface LineOaProfile {
  displayName: string;
  pictureUrl: string | null;
  statusMessage: string | null;
  language: string | null;
}

export async function getLineOaProfile(lineUserId: string): Promise<LineOaProfile> {
  const profile = await getClient().getProfile(lineUserId);
  return {
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl ?? null,
    statusMessage: profile.statusMessage ?? null,
    language: profile.language ?? null,
  };
}

function textMessage(text: string): line.messagingApi.TextMessage {
  return { type: "text", text };
}

/** Reply messages are free; they only fail when the token is used or expired. */
export async function replyLineOaText(replyToken: string, text: string): Promise<string | null> {
  const response = await getClient().replyMessage({
    replyToken,
    messages: [textMessage(text)],
  });
  return response.sentMessages?.[0]?.id ?? null;
}

/**
 * Push messages count against the monthly quota. The retry key makes a
 * retried request with the same key a no-op on LINE's side.
 */
export async function pushLineOaText(
  lineUserId: string,
  text: string,
  retryKey: string
): Promise<string | null> {
  const response = await getClient().pushMessage(
    { to: lineUserId, messages: [textMessage(text)] },
    retryKey
  );
  return response.sentMessages?.[0]?.id ?? null;
}

export async function markLineOaRead(markAsReadToken: string): Promise<void> {
  await getClient().markMessagesAsReadByToken({ markAsReadToken });
}

/** Media a customer sent. LINE only keeps it for a limited time. */
export async function getLineOaMessageContent(lineMessageId: string) {
  const { httpResponse, body } = await getBlobClient().getMessageContentWithHttpInfo(lineMessageId);
  return { body, contentType: httpResponse.headers.get("content-type") };
}

export function lineErrorStatus(error: unknown): number | null {
  return error instanceof line.HTTPFetchError ? error.status : null;
}

/** LINE's own reason (e.g. "Invalid reply token"), which is more useful to staff than "400". */
export function lineErrorMessage(error: unknown): string {
  if (error instanceof line.HTTPFetchError) {
    try {
      const parsed = JSON.parse(error.body) as { message?: unknown };
      if (typeof parsed.message === "string") return `LINE ${error.status}: ${parsed.message}`;
    } catch {
      // Body was not JSON; fall through to the status line.
    }
    return `LINE ${error.status}: ${error.statusText}`;
  }
  return error instanceof Error ? error.message : "Unknown LINE error";
}
