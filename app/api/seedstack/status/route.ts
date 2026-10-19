/**
 * GET /api/seedstack/status
 *
 * Lets a SeedStack skill check, at session start, whether this device is
 * linked and whether events will be stored. Same bearer and error codes as
 * /api/seedstack/events: `parent_required` means linked but a parent has not
 * agreed yet, so events stay on the device.
 */

import { NextRequest, NextResponse } from "next/server";

import { checkSeedstackToken } from "@/lib/seedstack/server";
import { extractSeedstackBearer } from "@/lib/seedstack/tokens";

export async function GET(request: NextRequest) {
  const bearer = extractSeedstackBearer(request.headers.get("authorization"));
  if (!bearer) {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 401 });
  }

  try {
    const check = await checkSeedstackToken(bearer);
    if (!check.ok) {
      return NextResponse.json({ ok: false, error: check.error }, { status: check.status });
    }
    return NextResponse.json({ ok: true, status: "active" });
  } catch (error) {
    console.error("[seedstack status] failed:", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
