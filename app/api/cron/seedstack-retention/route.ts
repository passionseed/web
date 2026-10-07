import { NextRequest, NextResponse } from "next/server";

import { SEEDSTACK_RETENTION_DAYS } from "@/lib/seedstack/consent";
import { purgeOldSeedstackEvents } from "@/lib/seedstack/server";

/** Daily: deletes SeedStack events past the retention promised in the notice. */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deleted = await purgeOldSeedstackEvents(SEEDSTACK_RETENTION_DAYS);
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    console.error("[seedstack retention] failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
