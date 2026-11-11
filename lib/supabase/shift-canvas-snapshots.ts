import { describeCanvasChange } from "@/lib/shift/canvas-claude";
import {
  bangkokDay,
  buildSnapshots,
  canvasKey,
  type DescribeChange,
  type Snapshot,
  type SnapshotStats,
} from "@/lib/shift/canvas-snapshots";
import { createAdminClient } from "@/utils/supabase/admin";

import { readAllCanvases } from "./shift-canvases";

/**
 * Daily SHIFT canvas snapshots (shift_canvas_snapshots). Uses the service role:
 * the job runs from a cron route, and the pages check canViewShiftCanvases first.
 */

type Row = {
  whiteboard_id: string;
  frame_id: string;
  day: string;
  stats: SnapshotStats;
  markdown: string;
  change_note: string | null;
};

/**
 * Saves today's snapshot of every canvas (replacing one already taken today),
 * with Claude Haiku's note on what changed since each canvas's last snapshot.
 */
export async function takeCanvasSnapshots(
  day = bangkokDay(),
  describe: DescribeChange = describeCanvasChange,
): Promise<{ canvases: number; described: number }> {
  const db = createAdminClient();
  const canvases = await readAllCanvases();
  if (canvases.length === 0) return { canvases: 0, described: 0 };

  // The latest snapshot before today of each canvas.
  const { data, error } = await db
    .from("shift_canvas_snapshots")
    .select("whiteboard_id, frame_id, day, markdown")
    .in("whiteboard_id", [...new Set(canvases.map((c) => c.row.boardId))])
    .lt("day", day)
    .order("day", { ascending: false });
  if (error) throw error;
  const previous = new Map<string, { markdown: string }>();
  for (const r of data ?? []) {
    const key = canvasKey({ boardId: r.whiteboard_id as string, frameId: r.frame_id as string });
    if (!previous.has(key)) previous.set(key, { markdown: r.markdown as string });
  }

  let described = 0;
  const snapshots = await buildSnapshots(canvases, previous, day, async (before, now) => {
    described++;
    return describe(before, now);
  });
  const { error: saveError } = await db.from("shift_canvas_snapshots").upsert(
    snapshots.map((s) => ({
      whiteboard_id: s.boardId,
      frame_id: s.frameId,
      project: s.project,
      owner_id: s.ownerId,
      day: s.day,
      stats: s.stats,
      markdown: s.markdown,
      change_note: s.changeNote,
    })),
    { onConflict: "whiteboard_id,frame_id,day" },
  );
  if (saveError) throw saveError;
  return { canvases: snapshots.length, described };
}

/** One canvas's snapshots, newest first. */
export async function canvasSnapshots(boardId: string, frameId: string, days = 14): Promise<Pick<Snapshot, "day" | "stats" | "changeNote">[]> {
  const { data, error } = await createAdminClient()
    .from("shift_canvas_snapshots")
    .select("day, stats, change_note")
    .eq("whiteboard_id", boardId)
    .eq("frame_id", frameId)
    .order("day", { ascending: false })
    .limit(days);
  if (error) throw error;
  return (data ?? []).map((r) => ({ day: r.day as string, stats: r.stats as SnapshotStats, changeNote: (r.change_note as string | null) ?? null }));
}

/** Each canvas's latest change note from the last two weeks, by canvasKey. */
export async function latestChanges(): Promise<Map<string, { day: string; changeNote: string | null }>> {
  const since = bangkokDay(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000));
  const { data, error } = await createAdminClient()
    .from("shift_canvas_snapshots")
    .select("whiteboard_id, frame_id, day, change_note")
    .gte("day", since)
    .order("day", { ascending: false });
  if (error) throw error;
  const out = new Map<string, { day: string; changeNote: string | null }>();
  for (const r of (data ?? []) as Pick<Row, "whiteboard_id" | "frame_id" | "day" | "change_note">[]) {
    const key = canvasKey({ boardId: r.whiteboard_id, frameId: r.frame_id });
    if (!out.has(key)) out.set(key, { day: r.day, changeNote: r.change_note });
  }
  return out;
}
