/**
 * POST /api/seedstack/events
 *
 * Progress events from the SeedStack OpenCode skills. Body is one event or
 * `{ events: [...] }` (local backlog sync). Bearer is the student's `psss_`
 * token from /shift/seedstack. Returns 403 `consent_required` until both the
 * student and a parent have agreed; the skill keeps events local meanwhile.
 */

import { NextRequest, NextResponse } from "next/server";

import { parseSeedstackBatch } from "@/lib/seedstack/events";
import { checkSeedstackToken, storeSeedstackEvents } from "@/lib/seedstack/server";
import { extractSeedstackBearer } from "@/lib/seedstack/tokens";

export async function POST(request: NextRequest) {
  const bearer = extractSeedstackBearer(request.headers.get("authorization"));
  if (!bearer) {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const batch = parseSeedstackBatch(body);
  if (!batch) {
    return NextResponse.json({ ok: false, error: "invalid_batch" }, { status: 400 });
  }

  try {
    const check = await checkSeedstackToken(bearer);
    if (!check.ok) {
      return NextResponse.json({ ok: false, error: check.error }, { status: check.status });
    }
    const stored = batch.events.length
      ? await storeSeedstackEvents(check.userId, check.tokenId, batch.events)
      : 0;
    return NextResponse.json({ ok: true, stored, rejected: batch.rejected });
  } catch (error) {
    console.error("[seedstack events] failed:", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
