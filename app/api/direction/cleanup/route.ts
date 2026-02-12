import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * POST /api/direction/cleanup
 *
 * Cron job that runs daily at 2 AM to:
 * 1. Delete completed jobs older than 30 days
 * 2. Reset stuck jobs (processing for >10 minutes)
 *
 * This keeps the jobs table clean and recovers from worker crashes.
 */
export async function POST(request: Request) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Create service role client (bypasses RLS)
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Clean up old completed jobs
    const { data: cleanupResult, error: cleanupError } = await supabase.rpc(
      'cleanup_old_direction_jobs'
    );

    if (cleanupError) {
      console.error("Error cleaning up old jobs:", cleanupError);
    }

    const deletedCount = cleanupResult || 0;
    console.log(`[Cleanup] Deleted ${deletedCount} old jobs`);

    // Reset stuck jobs
    const { data: resetResult, error: resetError } = await supabase.rpc(
      'reset_stuck_direction_jobs'
    );

    if (resetError) {
      console.error("Error resetting stuck jobs:", resetError);
    }

    const resetCount = resetResult || 0;
    console.log(`[Cleanup] Reset ${resetCount} stuck jobs`);

    return NextResponse.json({
      message: "Cleanup completed",
      deletedJobs: deletedCount,
      resetJobs: resetCount,
    });

  } catch (error) {
    console.error("Error in /api/direction/cleanup:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
