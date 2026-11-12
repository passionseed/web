import { NextRequest, NextResponse } from "next/server";
import { getMediaInsights } from "@/lib/meta/graph";
import { hasBearerSecret } from "@/lib/ops/opsAuth";
import { REEL_INSIGHTS_DAYS, runReelInsights } from "@/lib/radar-guide/reel-insights";
import { listReels } from "@/lib/supabase/radar-reels";
import { createAdminClient } from "@/utils/supabase/admin";

export const maxDuration = 60;

const TIME_BUDGET_MS = 50_000;

/**
 * Daily snapshot of Instagram insights for every mapped Radar reel posted in
 * the last 30 days (spec 5.7), one row per reel per Bangkok day. Missing
 * permissions or metrics are logged and skipped, never fatal; a rerun on the
 * same day overwrites that day's row.
 */
export async function GET(request: NextRequest) {
  // Same auth as meta-backfill: Vercel cron sends CRON_SECRET, the ops watcher OPS_CRON_SECRET.
  if (!hasBearerSecret(request.headers.get("authorization"), "CRON_SECRET", "OPS_CRON_SECRET")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const deadline = now + TIME_BUDGET_MS;

  try {
    const db = createAdminClient();
    const since = new Date(now - REEL_INSIGHTS_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const reels = await listReels({ platform: "instagram", postedSince: since }, db);

    const result = await runReelInsights({
      reels,
      fetchInsights: getMediaInsights,
      now,
      deadline,
      save: async (row) => {
        const { error } = await db
          .from("radar_reel_insights")
          .upsert(row, { onConflict: "reel_id,captured_on" });
        if (error) throw new Error(error.message);
      },
    });

    return NextResponse.json({ reels: reels.length, ...result });
  } catch (error) {
    console.error("Radar reel insights run failed", {
      errorCode: "radar_insights_run_failed",
      message: error instanceof Error ? error.message.slice(0, 120) : "unknown",
    });
    return NextResponse.json({ error: "radar_insights_run_failed" }, { status: 500 });
  }
}
