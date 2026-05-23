import { createClient as createServiceClient } from "@supabase/supabase-js";
import webpush from "web-push";

function initVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  try {
    webpush.setVapidDetails("mailto:hi@passionseed.org", publicKey, privateKey);
    return true;
  } catch {
    return false;
  }
}

export async function sendInboxPushNotification({
  serviceClient,
  participantIds,
  title,
  body,
  url,
}: {
  serviceClient: ReturnType<typeof createServiceClient>;
  participantIds: string[];
  title: string;
  body: string;
  url?: string;
}) {
  if (!participantIds.length) return { sent: 0, failed: 0, noToken: 0 };

  const vapidReady = initVapid();

  const { data: tokens } = await serviceClient
    .from("hackathon_participant_push_tokens")
    .select("id, participant_id, push_token, platform")
    .in("participant_id", participantIds);

  if (!tokens?.length) return { sent: 0, failed: 0, noToken: participantIds.length };

  const payload = JSON.stringify({ title, body, url: url || "/hackathon/dashboard" });
  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];
  const expoTokens: { token: string; platform: string }[] = [];

  for (const token of tokens) {
    if (token.push_token.startsWith("ExponentPushToken[") || token.push_token.startsWith("ExpoPushToken[")) {
      expoTokens.push({ token: token.push_token, platform: token.platform });
      continue;
    }

    if (token.platform === "web" && vapidReady) {
      try {
        const subscription = JSON.parse(token.push_token);
        await webpush.sendNotification(subscription, payload);
        sent++;
        await serviceClient
          .from("hackathon_participant_push_tokens")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", token.id);
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          staleIds.push(token.id);
        }
        failed++;
      }
      continue;
    }

    expoTokens.push({ token: token.push_token, platform: token.platform });
  }

  if (expoTokens.length) {
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          expoTokens.map((t) => ({
            to: t.token,
            title,
            body,
            data: { url: url || "/hackathon/dashboard" },
            sound: "default",
          }))
        ),
      });
      const result = await res.json();
      const tickets = result.data ?? [];
      for (const ticket of tickets) {
        if (ticket.status === "ok") sent++;
        else failed++;
      }
    } catch {
      failed += expoTokens.length;
    }
  }

  if (staleIds.length) {
    await serviceClient.from("hackathon_participant_push_tokens").delete().in("id", staleIds);
  }

  const noToken = participantIds.length - new Set(tokens.map((t) => t.participant_id)).size;
  return { sent, failed, noToken };
}
