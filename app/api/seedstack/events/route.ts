/**
 * POST /api/seedstack/events
 *
 * Progress events from the SeedStack OpenCode skills. Body is one event or
 * `{ events: [...] }` (local backlog sync). Bearer is the student's `psss_`
 * token from /shift/seedstack. Returns 403 `consent_required` until the
 * student agrees, and `parent_required` while an under-20's parent has not;
 * the skill keeps events local meanwhile.
 */

import { NextRequest, NextResponse } from "next/server";

import { parseSeedstackBatch } from "@/lib/seedstack/events";
import { storeSeedstackEvents } from "@/lib/seedstack/server";
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
    const result = await storeSeedstackEvents(bearer, batch.events);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, stored: result.stored, rejected: batch.rejected });
  } catch (error) {
    console.error("[seedstack events] failed:", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
