import { accessOf } from "./canvas-access";
import { isShiftCardKind, type ShiftCardKind } from "./shift-cards";
import { type BoardSummary, canvasItems } from "./summary";

/**
 * Progress on each SHIFT project canvas on a board, for the admin overview
 * (/admin/shift/canvases). Counts come from the board summary, so they match
 * what the Markdown read (and Claude) sees.
 */

type El = {
  id: string;
  type: string;
  isDeleted?: boolean;
  frameId?: string | null;
  containerId?: string | null;
  updated?: number;
  customData?: Record<string, unknown> | null;
};

export type ZoneProgress = { kind: ShiftCardKind; day?: number; title: string; notes: number };

export type ShiftCanvasStats = {
  frameId: string;
  project: string;
  title: string;
  owner: string | null;
  editors: string[];
  zones: ZoneProgress[];
  /** Notes someone wrote on (empty starter notes do not count). */
  notes: number;
  /** Saved versions across the canvas's Problem, Target, Idea and Ship notes. */
  versions: number;
  /** When anything on the canvas last changed (ms), from Excalidraw's `updated`. */
  lastEdited: number | null;
};

/** Every live SHIFT canvas on a board. `summary` is summarizeElements(elements). */
export function shiftCanvasesOf(elements: readonly unknown[], summary: BoardSummary): ShiftCanvasStats[] {
  const live = (elements as El[]).filter((e) => e && !e.isDeleted);
  const byId = new Map(live.map((e) => [e.id, e]));

  return summary.areas
    .filter((a) => a.project && byId.get(a.id)?.type === "frame")
    .map((area) => {
      const frame = byId.get(area.id)!;
      const access = accessOf(frame as Parameters<typeof accessOf>[0]);
      const items = canvasItems(summary, area.id);
      const zones = summary.areas
        .filter((z) => z.parent === area.id && isShiftCardKind(z.zone))
        .map((z) => {
          const day = byId.get(z.id)?.customData?.day;
          return {
            kind: z.zone as ShiftCardKind,
            ...(typeof day === "number" ? { day } : {}),
            title: z.title,
            notes: z.items.filter((i) => i.text).length,
          };
        });
      // The frame, what is in it, and the text inside its notes.
      const inCanvas = live.filter((e) => e.id === area.id || e.frameId === area.id);
      const containers = new Set(inCanvas.map((e) => e.id));
      const touched = [...inCanvas, ...live.filter((e) => e.containerId && containers.has(e.containerId))]
        .map((e) => e.updated)
        .filter((t): t is number => typeof t === "number");
      return {
        frameId: area.id,
        project: area.project!,
        title: area.title,
        owner: access?.owner ?? null,
        editors: access?.editors ?? [],
        zones,
        notes: items.filter((i) => i.text).length,
        versions: items.reduce((n, i) => n + (i.history?.length ?? 0), 0),
        lastEdited: touched.length ? Math.max(...touched) : null,
      };
    });
}

const BELIEFS = ["problem", "target", "idea", "ship"] as const;

export type CanvasProgress = {
  /** Problem, Target, Idea and Ship: whether each has a written note. */
  beliefs: { kind: (typeof BELIEFS)[number]; written: boolean }[];
  interviews: number;
  references: number;
  tests: number;
  pivots: number;
  /** Daily-log zones with a written note, out of `days`. */
  daysLogged: number;
  days: number;
};

/** A canvas's progress at a glance, from its zones. */
export function progressOf(zones: ZoneProgress[]): CanvasProgress {
  const notes = (kind: ShiftCardKind) => zones.filter((z) => z.kind === kind).reduce((n, z) => n + z.notes, 0);
  const daily = zones.filter((z) => z.kind === "daily");
  return {
    beliefs: BELIEFS.map((kind) => ({ kind, written: notes(kind) > 0 })),
    interviews: notes("interview"),
    references: notes("reference"),
    tests: notes("test"),
    pivots: notes("pivot"),
    daysLogged: daily.filter((z) => z.notes > 0).length,
    days: daily.length,
  };
}
