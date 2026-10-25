import { NextRequest, NextResponse } from "next/server";
import { verifyLineOaSignature } from "@/lib/line-oa/client";
import { storeLineInboxEvent } from "@/lib/line-oa/inbox";
import { parseLineWebhook } from "@/lib/line-oa/webhook-events";

/**
 * Webhook for the @passionseed LINE Official Account. Stores every 1:1 message
 * and follow change for the /admin/line inbox. It never auto-replies, so chat
 * in LINE OA Manager keeps working alongside it.
 *
 * Any storage failure returns 500 so LINE redelivers; webhookEventId makes the
 * redelivered insert a no-op for events that were already saved.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  let signatureValid: boolean;
  try {
    signatureValid = verifyLineOaSignature(rawBody, request.headers.get("x-line-signature"));
  } catch (error) {
    console.error("[line-oa] signature check failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  if (!signatureValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let events;
  try {
    events = parseLineWebhook(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  let failed = 0;
  for (const event of events) {
    try {
      await storeLineInboxEvent(event);
    } catch (error) {
      failed += 1;
      console.error("[line-oa] event storage failed", {
        kind: event.kind,
        webhookEventId: event.webhookEventId,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  if (failed > 0) {
    return NextResponse.json({ ok: false, failed }, { status: 500 });
  }
  return NextResponse.json({ ok: true, stored: events.length });
}
