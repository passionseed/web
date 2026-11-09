/**
 * Health of the Instagram and LINE integrations, for /api/ops/integration-health.
 * Every check reports a status and a short reason, never message content or
 * anyone's identity, so the response is safe to log and to post to staff.
 */

export type IntegrationCheckName = "instagram_token" | "instagram_webhook" | "line_webhook";

export interface IntegrationCheck {
  name: IntegrationCheckName;
  ok: boolean;
  detail: string;
}

export interface IntegrationHealth {
  ok: boolean;
  checkedAt: string;
  checks: IntegrationCheck[];
}

/**
 * Instagram webhook events arrive about 90 times a day; the longest quiet
 * spell in Oct to Nov 2026 was 12.3 hours, overnight. Eighteen hours of
 * silence means deliveries have stopped, not that nobody wrote.
 */
export const INSTAGRAM_WEBHOOK_SILENCE_HOURS = 18;

/**
 * LINE OA is quiet for days at a time (58 hours with no message in Oct 2026),
 * so silence proves nothing there. Its webhook is checked end to end with
 * LINE's own endpoint test instead.
 */

export function hoursSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  return (now.getTime() - new Date(iso).getTime()) / 3_600_000;
}

export function instagramWebhookCheck(lastEventAt: string | null, now: Date): IntegrationCheck {
  const hours = hoursSince(lastEventAt, now);
  if (hours === null) return { name: "instagram_webhook", ok: false, detail: "no webhook event recorded" };
  const ok = hours < INSTAGRAM_WEBHOOK_SILENCE_HOURS;
  return {
    name: "instagram_webhook",
    ok,
    detail: `last event ${hours.toFixed(1)} h ago${ok ? "" : ` (alert after ${INSTAGRAM_WEBHOOK_SILENCE_HOURS} h)`}`,
  };
}

export function summarize(checks: IntegrationCheck[], now: Date): IntegrationHealth {
  return { ok: checks.every((c) => c.ok), checkedAt: now.toISOString(), checks };
}
