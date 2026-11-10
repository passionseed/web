import { NextRequest, NextResponse } from "next/server";

import { takeCanvasSnapshots } from "@/lib/supabase/shift-canvas-snapshots";

// Fluid compute (vercel.json): up to 300 seconds for Haiku to note every canvas.
export const maxDuration = 300;

/** Nightly (late evening in Bangkok): snapshots every SHIFT canvas's progress for /shift/canvases. */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await takeCanvasSnapshots()) });
  } catch (error) {
    console.error("[shift canvas snapshots] failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
