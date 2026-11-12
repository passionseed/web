import type { IntegrationCheck } from "@/lib/ops/integrationHealth";

/**
 * Live probes against Instagram and LINE. Each is bounded so the health route
 * stays inside Vercel's 10-second limit, and reports only a status and a
 * reason: never a token, a message or a user.
 */

const PROBE_TIMEOUT_MS = 4_000;
const IG_GRAPH = "https://graph.instagram.com/v21.0";

function failure(name: IntegrationCheck["name"], error: unknown): IntegrationCheck {
  const reason = error instanceof Error && error.name === "TimeoutError" ? "timed out" : "request failed";
  return { name, ok: false, detail: reason };
}

/**
 * The Instagram-Login token in META_PAGE_ACCESS_TOKEN. It dies when the
 * account's password changes or after 60 days unrefreshed, and then replies,
 * profile lookups and the backfill all fail while webhooks keep arriving.
 */
export async function probeInstagramToken(): Promise<IntegrationCheck> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) return { name: "instagram_token", ok: false, detail: "META_PAGE_ACCESS_TOKEN is not set" };
  try {
    const res = await fetch(`${IG_GRAPH}/me?fields=user_id&access_token=${encodeURIComponent(token)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (res.ok) return { name: "instagram_token", ok: true, detail: "valid" };
    const body = (await res.json().catch(() => null)) as { error?: { code?: number; error_subcode?: number } } | null;
    const code = body?.error?.code;
    // 190 is Meta's "invalid or expired token"; anything else may be transient.
    const detail = code === 190 ? "invalid or expired (Meta error 190): issue a new token" : `HTTP ${res.status}${code ? `, Meta error ${code}` : ""}`;
    return { name: "instagram_token", ok: false, detail };
  } catch (error) {
    return failure("instagram_token", error);
  }
}

/**
 * LINE's own webhook test: LINE sends a signed request with no events to the
 * endpoint set in the LINE console and reports what it got back. Proves the
 * channel token, the endpoint URL and our handler in one call.
 */
export async function probeLineWebhook(): Promise<IntegrationCheck> {
  const token = process.env.LINE_OA_CHANNEL_ACCESS_TOKEN;
  if (!token) return { name: "line_webhook", ok: false, detail: "LINE_OA_CHANNEL_ACCESS_TOKEN is not set" };
  try {
    const res = await fetch("https://api.line.me/v2/bot/channel/webhook/test", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (res.status === 401) return { name: "line_webhook", ok: false, detail: "channel access token rejected" };
    if (!res.ok) return { name: "line_webhook", ok: false, detail: `LINE API HTTP ${res.status}` };
    const body = (await res.json()) as { success?: boolean; statusCode?: number; reason?: string };
    return body.success
      ? { name: "line_webhook", ok: true, detail: "endpoint answered 200" }
      : { name: "line_webhook", ok: false, detail: `endpoint answered ${body.statusCode ?? "?"} (${body.reason ?? "no reason"})` };
  } catch (error) {
    return failure("line_webhook", error);
  }
}
