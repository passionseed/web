import { NextRequest, NextResponse } from "next/server";

import { QuestDbError, QuestError } from "@/bot/src/quests/api";
import { DIGEST_KEY_ENV, DIGEST_MODEL, describeTeam, hasDigestKey } from "@/lib/shift-island/digest/claude";
import { bangkokDay, runIslandDigest } from "@/lib/shift-island/digest/generate";
import { questApi } from "@/lib/supabase/shift-quests/db";

// The plan's limit. Past RUN_BUDGET_MS no new team or retry starts, so even a
// call begun just before it (10 s timeout, one SDK retry: claude.ts) ends in
// time to save; teams it did not reach keep their last summary.
export const maxDuration = 60;
const RUN_BUDGET_MS = 30_000;

/**
 * Daily at 20:00 Bangkok (vercel.json): the AI island news (ข่าวเกาะ) for
 * SHIFT High. Writes one short Thai summary per eligible team for today,
 * plus the weekly recap on Sundays, through the web role's
 * shift_quest_digest_inputs and shift_quest_digest_save. Nothing runs while
 * digest_enabled is off. Without ANTHROPIC_API_KEY it logs why and stores
 * nothing; the island, the bot and everything else keep working.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const day = bangkokDay();
  const deadline = Date.now() + RUN_BUDGET_MS;
  try {
    const run = await runIslandDigest({
      api: questApi(),
      day,
      describe: hasDigestKey() ? describeTeam : null,
      model: DIGEST_MODEL,
      deadline,
    });
    if (run.status === "disabled") return NextResponse.json({ ok: true, skipped: "disabled", day });
    if (run.status === "no_key") {
      console.error(
        `[shift island digest] ${DIGEST_KEY_ENV} is not set, so no island news was written for ${day}. ` +
          `Set ${DIGEST_KEY_ENV} in the project's environment to turn on the AI summaries; everything else keeps working.`
      );
      return NextResponse.json({ ok: false, reason: "no_key", day });
    }
    if (run.errors.length > 0) {
      const codes = [...new Set(run.errors)].join(", ");
      const hint = run.errors.includes("auth") ? ` Check that ${DIGEST_KEY_ENV} is a valid key.` : "";
      console.error(`[shift island digest] ${run.errors.length} team summaries failed (${codes}); their last summaries stay.${hint}`);
    }
    const skipped = run.runs.reduce((sum, r) => sum + r.skipped, 0);
    if (skipped > 0) {
      console.error(`[shift island digest] ran out of time: ${skipped} teams not summarized for ${day}; their last summaries stay.`);
    }
    return NextResponse.json({ ok: true, day, runs: run.runs });
  } catch (error) {
    const reason =
      error instanceof QuestError
        ? `sq:${error.code}`
        : error instanceof QuestDbError
          ? `${error.fn} SQLSTATE ${error.sqlstate}`
          : error instanceof Error
            ? error.message === "shift_quest_db_not_configured"
              ? "SHIFT_QUEST_DATABASE_URL is not configured"
              : error.name
            : "unknown";
    console.error(`[shift island digest] failed: ${reason}`);
    return NextResponse.json({ ok: false, reason: "error", day }, { status: 500 });
  }
}
