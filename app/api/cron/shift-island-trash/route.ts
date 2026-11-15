import { NextRequest, NextResponse } from "next/server";

import { QuestDbError, QuestError } from "@/bot/src/quests/api";
import { questApi } from "@/lib/supabase/shift-quests/db";
import { deletePhotos, photosAvailable } from "@/lib/supabase/shift-quests/evidence";

export const maxDuration = 60;

/** Paths per Storage call, and calls per run (the queue only grows by a few photos a day). */
const BATCH = 100;
const MAX_BATCHES = 10;

/**
 * Daily (vercel.json): deletes the quest photos the database queued in
 * shift_quest_storage_trash (a student took one back, an admin erased a
 * member, a submission went) from the private bucket, then clears them from
 * the queue. The database cannot reach Storage, so this is where photo
 * deletion actually happens. Deleting a missing object is not an error, so a
 * retry is safe. Logs counts only, never a path.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const api = questApi();
    if (!(await photosAvailable(api))) return NextResponse.json({ ok: true, skipped: "schema" });
    let deleted = 0;
    for (let i = 0; i < MAX_BATCHES; i += 1) {
      const paths = await api.call<string[]>("shift_quest_storage_trash_claim", BATCH);
      const batch = Array.isArray(paths) ? paths.filter((p): p is string => typeof p === "string") : [];
      if (batch.length === 0) break;
      if (!(await deletePhotos(batch))) {
        console.error(`[shift-island-trash] storage refused a batch of ${batch.length}; kept in the queue`);
        break;
      }
      deleted += Number(await api.call<number>("shift_quest_storage_trash_done", batch)) || 0;
      if (batch.length < BATCH) break;
    }
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    const code =
      error instanceof QuestError ? `sq:${error.code}` : error instanceof QuestDbError ? `SQLSTATE ${error.sqlstate}` : error instanceof Error ? error.name : "unknown";
    console.error(`[shift-island-trash] failed (${code})`);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
