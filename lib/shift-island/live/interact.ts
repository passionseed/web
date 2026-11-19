/**
 * The interact outline's targets (founder ask, 2026-11-19): every clickable
 * thing on the map, with the box where it counts as near and the shape its
 * outline traces (outline.ts draws it). Only one at a time shows the
 * outline: the one nearest the middle of the visible map on a touch screen,
 * or the mouse pointer on a desktop, within a reach; the hotspot a keyboard
 * has focused wins over both. Nothing near, no outline. Pure and
 * client-safe.
 *
 * - A plot: its button's box (the 48px floor close up, as IslandViewport
 *   draws it), outlining its tree with its roots, key flag and lantern.
 * - A plaza spot (the notice board, the stage under its countdown, the prize
 *   board, the campfire): its button's box, outlining the actors that draw
 *   it (plaza.ts PlazaSpot.actors).
 * - A person: a walker's box where it stands now, or a tree partner's fixed
 *   box, grown by the tap's slop (figures.ts hitSlop), outlining the person.
 *
 * Nothing here decides where a tap goes: the plots' and the plaza's buttons
 * and the figures' own hit test (figures.ts) do that, as before. The pick
 * follows the tap's rule, though, so the outline never names one thing while
 * a click opens another: over a plot's or the plaza's button a person counts
 * only within TIGHT of itself (IslandViewport's figureHit), and anywhere
 * else within its slop.
 */
import type { IslandScene } from "@/bot/src/quests/island/scene";

import { TIGHT, hitSlop, type Figure } from "./figures";
import type { Rect } from "./geometry";
import type { PlazaSpot, PlazaSpotId } from "./plaza";

/** What an outline traces: a plot's tree, the partner beside tree `tree`, or some of the engine's actors. */
export type OutlineShape =
  | { kind: "tree"; tree: number }
  | { kind: "partner"; tree: number }
  | { kind: "actors"; actors: readonly number[] };

export interface InteractTarget {
  /** Which button or person: plotKey, spotKey or figureKey. */
  key: string;
  /** Where it counts as near, native px. Absent: its actors' boxes where they stand now, grown by `slop`. */
  box?: Rect;
  /** Native px each way round a walker's box that still count as it (its tap's slop). */
  slop?: { x: number; y: number };
  /** A person (a walker or a tree's partner): over a button, it counts only within TIGHT of itself, as a tap does. */
  person?: true;
  /** A partner's box grown by TIGHT alone (a walker's is its actors' box grown by TIGHT, outline.ts targetTight). */
  tight?: Rect;
  shape: OutlineShape;
}

/** A point on the island to measure from, native px, and how far from a target's box (native px) still counts as near. */
export interface Aim {
  x: number;
  y: number;
  reach: number;
}

/**
 * How far from a thing's box still counts as near, CSS px: a little more
 * than a fingertip round the middle of the map on a touch screen, less
 * round a mouse pointer, which can point at things exactly.
 */
export const REACH_PX = { centre: 28, pointer: 14 } as const;

/** A plot's and a plaza spot's smallest button close up, CSS px (IslandViewport, PlazaLayer). */
const BUTTON_MIN_PX = 48;

export const plotKey = (slot: number) => `plot:${slot}`;
export const spotKey = (id: PlazaSpotId) => `spot:${id}`;
export const figureKey = (index: number) => `figure:${index}`;

/** The key of the hotspot button an element is (data-slot or data-spot), or null. */
export function hotspotKey(element: { getAttribute(name: string): string | null } | null): string | null {
  if (!element) return null;
  const slot = element.getAttribute("data-slot");
  if (slot != null && slot !== "" && Number.isFinite(Number(slot))) return plotKey(Number(slot));
  const spot = element.getAttribute("data-spot");
  return spot ? spotKey(spot as PlazaSpotId) : null;
}

export interface TargetInput {
  scene: Pick<IslandScene, "width" | "height" | "trees">;
  /** The plots' buttons, percent of the picture (IslandHotspot). */
  hotspots: readonly { slot: number; x: number; y: number; w: number; h: number }[];
  /** The plaza's buttons that are on the map (only those with a name), percent of the picture. */
  spots: readonly PlazaSpot[];
  /** The people to tap, in the viewport's order (a figure's key is its index here). */
  figures: readonly Figure[];
  /** CSS px per native px. */
  scale: number;
  /** The whole island: exact boxes, no 48px floor, as the buttons. */
  whole: boolean;
}

/**
 * A button's box in native px, from its percent box: centred on it and at
 * least `min` native px each way, as the button is drawn (left = x + w / 2,
 * translate(-50%, -50%), max(48px, w%)).
 */
function buttonBox(b: { x: number; y: number; w: number; h: number }, scene: Pick<IslandScene, "width" | "height">, min: number): Rect {
  const w = Math.max(min, (b.w / 100) * scene.width);
  const h = Math.max(min, (b.h / 100) * scene.height);
  const cx = ((b.x + b.w / 2) / 100) * scene.width;
  const cy = ((b.y + b.h / 2) / 100) * scene.height;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

const grown = (r: Rect, x: number, y: number): Rect => ({ x: r.x - x, y: r.y - y, w: r.w + 2 * x, h: r.h + 2 * y });

/** Every clickable thing on the map as a target: the plots, the plaza's spots, then the people. */
export function interactTargets(input: TargetInput): InteractTarget[] {
  const { scene, scale, whole } = input;
  const min = whole || !Number.isFinite(scale) || scale <= 0 ? 0 : BUTTON_MIN_PX / scale;
  const treeOf = new Map(scene.trees.map((t, i) => [t.slot, i]));
  const out: InteractTarget[] = [];
  for (const h of input.hotspots) {
    const tree = treeOf.get(h.slot);
    if (tree != null) out.push({ key: plotKey(h.slot), box: buttonBox(h, scene, min), shape: { kind: "tree", tree } });
  }
  for (const spot of input.spots) {
    if (spot.actors.length) out.push({ key: spotKey(spot.id), box: buttonBox(spot, scene, min), shape: { kind: "actors", actors: spot.actors } });
  }
  const slop = hitSlop(scale, whole);
  input.figures.forEach((figure, i) => {
    if (figure.actor != null) out.push({ key: figureKey(i), slop, person: true, shape: { kind: "actors", actors: [figure.actor] } });
    else if (figure.box && figure.kind === "partner") {
      const tree = treeOf.get(figure.n);
      if (tree != null) {
        out.push({ key: figureKey(i), box: grown(figure.box, slop.x, slop.y), person: true, tight: grown(figure.box, TIGHT, TIGHT), shape: { kind: "partner", tree } });
      }
    }
  });
  return out;
}

/** A point inside a box, its right and bottom edges left out (figures.ts hitFigure measures a tap the same way). */
export function holds(box: Rect, p: { x: number; y: number }): boolean {
  return p.x >= box.x && p.x < box.x + box.w && p.y >= box.y && p.y < box.y + box.h;
}

/** How far a point lies outside a box, squared, native px (0 inside it). */
export function gapSquared(box: Rect, p: { x: number; y: number }): number {
  const dx = Math.max(box.x - p.x, 0, p.x - (box.x + box.w));
  const dy = Math.max(box.y - p.y, 0, p.y - (box.y + box.h));
  return dx * dx + dy * dy;
}

/** How far a point lies outside a box, native px (0 inside it). */
export function gapTo(box: Rect, p: { x: number; y: number }): number {
  return Math.sqrt(gapSquared(box, p));
}

/**
 * The target nearest the aim: of those whose box (boxOf; null: not drawn
 * now) lies within the reach, the one with the smallest gap, and between
 * two the aim is inside of (two people, or two buttons), the one whose box's
 * middle is nearer. Between a person and a button the aim is inside of, the
 * tap's own rule (settle): the person only within TIGHT of itself (tightOf:
 * its box grown by TIGHT; a partner's own `tight` by default). -1 when none
 * is near. Every tick on a moving island, so it compares squared distances.
 */
export function nearestTarget(
  targets: readonly InteractTarget[],
  boxOf: (target: InteractTarget, index: number) => Rect | null,
  aim: Aim,
  tightOf: (target: InteractTarget, index: number) => Rect | null = (target) => target.tight ?? null
): number {
  const buttons: number[] = [];
  const people: number[] = [];
  targets.forEach((t, i) => (t.person ? people : buttons).push(i));
  const button = nearestOf(targets, boxOf, aim, buttons);
  const person = nearestOf(targets, boxOf, aim, people);
  return settle(button, person, (i) => {
    const tight = tightOf(targets[i], i);
    return tight != null && holds(tight, aim);
  });
}

/**
 * The nearest button and the nearest person, settled the way a tap is
 * (IslandViewport figureHit: `hit.tight || !overButton`): when the aim is
 * inside both, the person only if it is within TIGHT of them (`tight`),
 * else the button; otherwise the nearer of the two (the smaller gap, then
 * the nearer middle; the button on a tie). -1 when neither is near.
 */
export function settle(button: Nearest, person: Nearest, tight: (index: number) => boolean): number {
  if (person.index < 0) return button.index;
  if (button.index < 0) return person.index;
  if (person.gap === 0 && button.gap === 0) return tight(person.index) ? person.index : button.index;
  return person.gap < button.gap || (person.gap === button.gap && person.mid < button.mid) ? person.index : button.index;
}

/** The nearest so far: its index (-1 for none), and its gap and middle's distance, squared. */
export interface Nearest {
  index: number;
  gap: number;
  mid: number;
}

export const NONE_NEAR: Nearest = { index: -1, gap: Infinity, mid: Infinity };

/**
 * nearestTarget's search over some of the targets (`indexes`, default all),
 * carrying on from `from`: so the targets that never move can be searched
 * once per aim, and only the walkers near it on each tick.
 */
export function nearestOf(
  targets: readonly InteractTarget[],
  boxOf: (target: InteractTarget, index: number) => Rect | null,
  aim: Aim,
  indexes?: readonly number[],
  from: Nearest = NONE_NEAR
): Nearest {
  let { index: best, gap: bestGap, mid: bestMid } = from;
  const reach = aim.reach * aim.reach;
  const count = indexes ? indexes.length : targets.length;
  for (let k = 0; k < count; k++) {
    const i = indexes ? indexes[k] : k;
    const box = boxOf(targets[i], i);
    if (!box) continue;
    const gap = gapSquared(box, aim);
    if (gap > reach) continue;
    const mx = aim.x - (box.x + box.w / 2);
    const my = aim.y - (box.y + box.h / 2);
    const mid = mx * mx + my * my;
    if (gap < bestGap || (gap === bestGap && mid < bestMid)) {
      best = i;
      bestGap = gap;
      bestMid = mid;
    }
  }
  return { index: best, gap: bestGap, mid: bestMid };
}

/** A client-space box, as getBoundingClientRect gives it. */
export interface ClientBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * The middle of the visible map in client px: the world's middle across,
 * and the middle of the room between the HUD bars (`reserve`, the safe-area
 * insets included) down, where scrollToCentre puts the student's own plot.
 */
export function mapCentre(world: ClientBox, reserve: { top: number; bottom: number }): { x: number; y: number } {
  const top = world.top + reserve.top;
  const bottom = world.top + world.height - reserve.bottom;
  return { x: world.left + world.width / 2, y: bottom > top ? (top + bottom) / 2 : world.top + world.height / 2 };
}

/** A client point on the picture's box, in the scene's native px. */
export function toNative(p: { x: number; y: number }, box: ClientBox, size: { width: number; height: number }): { x: number; y: number } | null {
  if (box.width <= 0 || box.height <= 0) return null;
  return { x: ((p.x - box.left) / box.width) * size.width, y: ((p.y - box.top) / box.height) * size.height };
}
