import type { ShiftCanvasStats } from "@/lib/whiteboard/shift-overview";
import { progressOf } from "@/lib/whiteboard/shift-overview";

/**
 * Daily snapshots of SHIFT canvases (shift_canvas_snapshots): what each one
 * holds, and how a day's snapshot is built from the day before. Pure, so the
 * job (lib/supabase/shift-canvas-snapshots.ts) and the pages share it.
 */

export type SnapshotStats = {
  notes: number;
  versions: number;
  interviews: number;
  references: number;
  tests: number;
  pivots: number;
  daysLogged: number;
  days: number;
  /** Problem, Target, Idea, Ship: whether each is written. */
  beliefs: Record<string, boolean>;
};

export type CanvasKey = { boardId: string; frameId: string };
export const canvasKey = (c: CanvasKey) => `${c.boardId}:${c.frameId}`;

export type Snapshot = CanvasKey & {
  project: string;
  ownerId: string | null;
  day: string;
  stats: SnapshotStats;
  markdown: string;
  changeNote: string | null;
};

/** The longest change note the table takes. */
export const MAX_CHANGE_NOTE = 600;
export const NO_CHANGE = "No change.";

const BANGKOK_MS = 7 * 60 * 60 * 1000;

/** The day in Asia/Bangkok (UTC+7 all year) as YYYY-MM-DD. */
export function bangkokDay(at: Date = new Date()): string {
  return new Date(at.getTime() + BANGKOK_MS).toISOString().slice(0, 10);
}

export function snapshotStats(canvas: Pick<ShiftCanvasStats, "zones" | "notes" | "versions">): SnapshotStats {
  const p = progressOf(canvas.zones);
  return {
    notes: canvas.notes,
    versions: canvas.versions,
    interviews: p.interviews,
    references: p.references,
    tests: p.tests,
    pivots: p.pivots,
    daysLogged: p.daysLogged,
    days: p.days,
    beliefs: Object.fromEntries(p.beliefs.map((b) => [b.kind, b.written])),
  };
}

/** A model's note, trimmed to what the table takes, or null when there is none. */
export function cleanNote(note: string | null | undefined): string | null {
  const text = note?.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length <= MAX_CHANGE_NOTE ? text : `${text.slice(0, MAX_CHANGE_NOTE - 1)}…`;
}

/** Writes the change note: Markdown from the last snapshot (null on the first) and today's. */
export type DescribeChange = (previous: string | null, current: string) => Promise<string | null>;

/**
 * Today's snapshot of each canvas. A canvas whose Markdown matches its last
 * snapshot gets "No change." without asking the model; the rest are described
 * a few at a time.
 */
export async function buildSnapshots(
  canvases: { row: CanvasKey & ShiftCanvasStats; markdown: string }[],
  previous: Map<string, Pick<Snapshot, "markdown">>,
  day: string,
  describe: DescribeChange,
  parallel = 4,
): Promise<Snapshot[]> {
  const out: Snapshot[] = new Array(canvases.length);
  let next = 0;
  const work = async () => {
    for (let i = next++; i < canvases.length; i = next++) {
      const { row, markdown } = canvases[i];
      const before = previous.get(canvasKey(row))?.markdown ?? null;
      let changeNote: string | null;
      if (before === markdown) changeNote = NO_CHANGE;
      else {
        try {
          changeNote = cleanNote(await describe(before, markdown));
        } catch (error) {
          // One canvas's note failing must not lose everyone's numbers.
          console.error("canvas snapshot: change note failed", error);
          changeNote = null;
        }
      }
      out[i] = {
        boardId: row.boardId,
        frameId: row.frameId,
        project: row.project,
        ownerId: row.owner,
        day,
        stats: snapshotStats(row),
        markdown,
        changeNote,
      };
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, canvases.length) }, work));
  return out;
}

const COUNTS = ["notes", "interviews", "references", "tests", "pivots", "versions", "daysLogged"] as const;
export type TrendRow = { day: string; stats: SnapshotStats; changeNote: string | null; delta: Partial<Record<(typeof COUNTS)[number], number>> };

/** Snapshots newest first, each with what grew or shrank since the day before it. */
export function trendOf(snapshots: Pick<Snapshot, "day" | "stats" | "changeNote">[]): TrendRow[] {
  const byDay = [...snapshots].sort((a, b) => b.day.localeCompare(a.day));
  return byDay.map((s, i) => {
    const prev = byDay[i + 1];
    const delta: TrendRow["delta"] = {};
    if (prev) for (const k of COUNTS) if (s.stats[k] !== prev.stats[k]) delta[k] = (s.stats[k] ?? 0) - (prev.stats[k] ?? 0);
    return { day: s.day, stats: s.stats, changeNote: s.changeNote, delta };
  });
}
