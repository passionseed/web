import { NextRequest, NextResponse } from "next/server";
import { runDmConversationBackfillBatch, runIgCommentsBackfillBatch } from "@/lib/meta/backfill-runner";
import { hasBearerSecret } from "@/lib/ops/opsAuth";

export const maxDuration = 60;

const TIME_BUDGET_MS = 50_000;

function failedBatch(errorCode: string) {
  return {
    processed: 0,
    remaining: -1,
    stoppedReason: "error" as const,
    errorCode,
  };
}

/**
 * Stateless catch-up: derives "already done" straight from the DB each tick,
 * so this can just run every N minutes indefinitely. If Meta's rate limit is
 * blocking us it stops immediately and the next tick tries again for free —
 * no manual retry/cooldown babysitting needed.
 */
export async function GET(request: NextRequest) {
  // OPS_CRON_SECRET lets the ops watcher (ops/integration-watch) run this
  // every 30 minutes from outside Vercel without holding CRON_SECRET, which
  // also triggers parent emails and data retention.
  if (!hasBearerSecret(request.headers.get("authorization"), "CRON_SECRET", "OPS_CRON_SECRET")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deadline = Date.now() + TIME_BUDGET_MS;

  const dmResult = await runDmConversationBackfillBatch(deadline).catch(() => {
    console.error("Meta DM backfill batch failed", { errorCode: "dm_backfill_failed" });
    return failedBatch("dm_backfill_failed");
  });

  const remainingBudget = deadline - Date.now();
  const commentsResult =
    remainingBudget > 5_000
      ? await runIgCommentsBackfillBatch(deadline).catch(() => {
          console.error("Meta comments backfill batch failed", {
            errorCode: "comments_backfill_failed",
          });
          return failedBatch("comments_backfill_failed");
        })
      : { processed: 0, remaining: -1, stoppedReason: "deadline" as const };

  return NextResponse.json({ dm: dmResult, comments: commentsResult });
}
