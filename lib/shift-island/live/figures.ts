/**
 * The island's people as things to tap: every walking or standing figure
 * (today's visitors in the plaza, the viewer's own figure, their teammates,
 * the partner beside a tree, the story's builder and tester) says one short
 * line when tapped. Pure and client-safe: no DOM.
 *
 * Privacy: a figure carries a kind and a number only (its order among its
 * kind, or a tree's slot), never a person. Its line (copy.ts FIGURES) is
 * picked from those two, so the same figure always says the same thing and
 * no line can name or point to a student.
 *
 * Adding a figure (the campfire's evening guest, say): give it a kind here
 * and its lines in copy.ts FIGURES, then list it where its actor is made
 * (plaza.ts plazaWorld, with the actor's index). The tap, the bubble that
 * follows it and the screen reader's line come with that. The people
 * button's turn goes round today's visitors only (figureLine.ts TURN_RANK):
 * a figure that is one of them gets a rank there; any other gets its words
 * into the name of the button it stands on, as a tree's partner does.
 */
import type { IslandScene } from "@/bot/src/quests/island/scene";

import type { Rect } from "./geometry";

/**
 * Who a figure stands for: the viewer ("me"), a teammate who checked in
 * today ("team"), anyone else who checked in today ("crowd"), a team's first
 * partner beside its tree ("partner", main quest 3), and the story's
 * "builder" and "tester".
 */
export type FigureKind = "me" | "team" | "crowd" | "partner" | "builder" | "tester";

export interface Figure {
  kind: FigureKind;
  /** Which one of its kind: its order among them, or its tree's slot. Picks its line. */
  n: number;
  /** A figure the engine moves: its index in the actors it draws. */
  actor?: number;
  /** A figure drawn in place with the scene (a tree's partner): its box, native px. */
  box?: Rect;
  /** A partner beside the viewer's own team's tree. */
  mine?: boolean;
}

/** Every person sprite has the plot visitor's size (10 x 14 native px). */
export const FIGURE_W = 10;
export const FIGURE_H = 14;

/** Native px round a figure that always count as the figure itself, even over a plot's own tap target. */
export const TIGHT = 2;
/** The smallest tap target, CSS px: a fingertip, so a figure that walks is still easy to catch. */
export const TAP_PX = 44;

/** The partner beside each tree that has one (the visitor sprite: the team passed main quest 3), in slot order. */
export function treeFigures(scene: Pick<IslandScene, "trees"> | null | undefined): Figure[] {
  if (!scene) return [];
  return scene.trees
    .filter((tree) => tree.visitor != null)
    .sort((a, b) => a.slot - b.slot)
    .map((tree) => ({
      kind: "partner" as const,
      n: tree.slot,
      box: { x: tree.visitor!.x, y: tree.visitor!.y, w: FIGURE_W, h: FIGURE_H },
      ...(tree.mine ? { mine: true } : {}),
    }));
}

/** A figure's box now: its actor's box (from the engine), or its own fixed box. */
export function figureBox(figure: Figure, actorBoxes: readonly (Rect | null | undefined)[]): Rect | null {
  if (figure.actor != null) return actorBoxes[figure.actor] ?? null;
  return figure.box ?? null;
}

/**
 * How far past a figure's box a tap still counts, native px each way: enough
 * for a TAP_PX target at `scale` CSS px per native px, plus one pixel for a
 * figure that took a step since it was drawn. On the whole island (`whole`,
 * a small scale) only TIGHT, as the plots drop their 48px floor there.
 */
export function hitSlop(scale: number, whole: boolean): { x: number; y: number } {
  if (whole || !Number.isFinite(scale) || scale <= 0) return { x: TIGHT, y: TIGHT };
  const target = TAP_PX / scale;
  return {
    x: Math.max(TIGHT, Math.ceil((target - FIGURE_W) / 2)) + 1,
    y: Math.max(TIGHT, Math.ceil((target - FIGURE_H) / 2)) + 1,
  };
}

export interface FigureHit {
  /** Index into the figures. */
  index: number;
  /** The tap landed on the figure itself (within TIGHT), not only in its slop. */
  tight: boolean;
}

const grown = (r: Rect, x: number, y: number): Rect => ({ x: r.x - x, y: r.y - y, w: r.w + 2 * x, h: r.h + 2 * y });

const holds = (r: Rect, p: { x: number; y: number }) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;

/**
 * The figure under a point (native px): of those whose box, grown by `slop`,
 * holds it, the one whose centre is nearest. Null when none does.
 */
export function hitFigure(
  figures: readonly Figure[],
  actorBoxes: readonly (Rect | null | undefined)[],
  point: { x: number; y: number },
  slop: { x: number; y: number },
): FigureHit | null {
  let best: FigureHit | null = null;
  let bestDistance = Infinity;
  for (let index = 0; index < figures.length; index++) {
    const box = figureBox(figures[index], actorBoxes);
    if (!box || !holds(grown(box, slop.x, slop.y), point)) continue;
    const distance = Math.hypot(point.x - (box.x + box.w / 2), point.y - (box.y + box.h / 2));
    if (distance >= bestDistance) continue;
    bestDistance = distance;
    best = { index, tight: holds(grown(box, TIGHT, TIGHT), point) };
  }
  return best;
}

/**
 * Where a figure's bubble points: the middle of the top of its head, in
 * percent (left, top) of `view`, the native rect its box on screen shows
 * (the whole scene on the island, a panel's crop in the story).
 */
export function bubbleAnchor(box: Rect, view: Rect): { x: number; y: number } {
  const round4 = (v: number) => Math.round(v * 10_000) / 10_000;
  return { x: round4(((box.x + box.w / 2 - view.x) / view.w) * 100), y: round4(((box.y - view.y) / view.h) * 100) };
}
