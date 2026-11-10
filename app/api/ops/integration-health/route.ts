import { NextRequest, NextResponse } from "next/server";

import { hasBearerSecret } from "@/lib/ops/opsAuth";
import { instagramWebhookCheck, summarize, type IntegrationCheck } from "@/lib/ops/integrationHealth";
import { probeInstagramToken, probeLineWebhook } from "@/lib/ops/integrationProbes";
import { latestMetaWebhookEventAt } from "@/lib/supabase/integration-health";

export const dynamic = "force-dynamic";

/**
 * GET /api/ops/integration-health
 *
 * Whether Instagram and LINE are still connected: the Instagram token is
 * valid, Instagram webhook events are still arriving, and LINE's end-to-end
 * webhook test passes. Polled by the ops watcher (ops/integration-watch),
 * which alerts staff when a check keeps failing.
 *
 * Auth: Bearer OPS_CRON_SECRET only. That secret can read this and run the
 * Meta backfill, nothing else, so the host polling it never holds CRON_SECRET.
 * The response carries statuses and reasons, never content or identities.
 */
export async function GET(request: NextRequest) {
  if (!hasBearerSecret(request.headers.get("authorization"), "OPS_CRON_SECRET")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const webhook: Promise<IntegrationCheck> = latestMetaWebhookEventAt()
    .then((lastAt) => instagramWebhookCheck(lastAt, now))
    .catch(() => ({ name: "instagram_webhook", ok: false, detail: "could not read webhook events" }));

  const checks = await Promise.all([probeInstagramToken(), webhook, probeLineWebhook()]);
  return NextResponse.json(summarize(checks, now), { headers: { "Cache-Control": "no-store" } });
}
