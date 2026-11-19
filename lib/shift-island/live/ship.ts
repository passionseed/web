/**
 * The merchant ship: the island shop, moored off the coast nearest the
 * plaza, as a LiveActor the engine draws above the sea. Pure and
 * client-safe; plaza.ts adds it to the plaza's actors, spots and labels.
 *
 * Where it moors: the spot closest to the plaza centre where the hull (the
 * sprite's bottom rows) floats on open water and the whole ship, sails
 * included, stays clear of every tree, tag, the caller's pin, the plaza and
 * the parked rowing boat. The sails may hang over the beach; nothing that
 * can be tapped is ever under them. Same scene, same answer, so the ship
 * never drifts between visits. An island with no such spot gets no ship
 * (the menu still opens the shop).
 *
 * On a phone the next-step card stands over the bottom of the world, taller
 * than the room the world keeps under the island (world.ts HUD_RESERVE), so
 * a ship in the last rows of the picture would sit behind it even scrolled
 * all the way down. The ship moors at least HUD_CLEAR px above the
 * picture's bottom edge wherever the island has such a spot, and only
 * falls back to the bottom rows when it has none.
 */
import { MOTION_SIZES } from "@/bot/assets/island/motion-sprites";
import type { IslandScene, SceneRect } from "@/bot/src/quests/island/scene";

import { overlaps } from "./geometry";

/** The ship's sprite size, native px. */
export const SHIP_SIZE = { w: MOTION_SIZES.merchant_ship_0[0], h: MOTION_SIZES.merchant_ship_0[1] } as const;

/** The first sprite row of the hull (its rail); from here down the ship must float on open water. */
export const SHIP_HULL_TOP = 29;

/** Room kept between the ship and anything it must not cover, native px. */
const CLEAR = 4;
/** Candidate positions step this many native px. */
const STEP = 2;
/**
 * Native px kept between the ship and the picture's bottom edge where it can
 * be: what the next-step card covers past the world's bottom reserve (about
 * 70 CSS px at 375 px wide, 2 CSS px per native px), and a little more.
 */
export const HUD_CLEAR = 40;
/** The parked rowing boat's sprite (SPRITES.boat). */
const BOAT = { w: 20, h: 12 } as const;
/** Room for a tree's decorations (key, visitor, lantern) beside its sprite. */
const DECOR = 12;

const WATER = new Set(["a", "b"]);
const PLAZA = "p";

type TileScene = Pick<IslandScene, "tiles" | "cols" | "rows" | "tile">;

function tileAt(scene: TileScene, tx: number, ty: number): string | null {
  if (tx < 0 || ty < 0 || tx >= scene.cols || ty >= scene.rows) return null;
  return scene.tiles[ty * scene.cols + tx];
}

/** True when every tile the box touches is open water. */
export function allWater(scene: TileScene, box: SceneRect): boolean {
  const x0 = Math.floor(box.x / scene.tile);
  const y0 = Math.floor(box.y / scene.tile);
  const x1 = Math.floor((box.x + box.w - 1) / scene.tile);
  const y1 = Math.floor((box.y + box.h - 1) / scene.tile);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const tile = tileAt(scene, tx, ty);
      if (tile == null || !WATER.has(tile)) return false;
    }
  }
  return true;
}

const grow = (r: SceneRect, by: number): SceneRect => ({ x: r.x - by, y: r.y - by, w: r.w + 2 * by, h: r.h + 2 * by });

/** Everything the ship must stay clear of, native px. */
export function shipKeepOut(scene: IslandScene): SceneRect[] {
  const out: SceneRect[] = [];
  for (const tree of scene.trees) out.push({ x: tree.left - DECOR, y: tree.top, w: tree.w + 2 * DECOR, h: tree.h + 4 });
  for (const tag of scene.tags) out.push(tag);
  if (scene.marker) out.push({ x: scene.marker.x, y: scene.marker.y, w: 9 * scene.marker.scale, h: 9 * scene.marker.scale });
  out.push({ x: scene.boatStill.x, y: scene.boatStill.y, w: BOAT.w, h: BOAT.h });
  // The plaza's tiles (the well, the banner and every plaza piece stand on or just above them).
  let px0 = Infinity;
  let py0 = Infinity;
  let px1 = -Infinity;
  let py1 = -Infinity;
  for (let i = 0; i < scene.tiles.length; i++) {
    if (scene.tiles[i] !== PLAZA) continue;
    const tx = i % scene.cols;
    const ty = Math.floor(i / scene.cols);
    px0 = Math.min(px0, tx);
    py0 = Math.min(py0, ty);
    px1 = Math.max(px1, tx);
    py1 = Math.max(py1, ty);
  }
  if (px1 >= px0) {
    const t = scene.tile;
    // One tile above it for the banner and the countdown board.
    out.push({ x: px0 * t, y: (py0 - 1) * t, w: (px1 - px0 + 1) * t, h: (py1 - py0 + 2) * t });
  }
  return out.map((r) => grow(r, CLEAR));
}

/**
 * The ship's top-left corner, native px, or null when nowhere fits it: the
 * nearest spot clear of the bottom HUD (HUD_CLEAR), else the nearest at all.
 * Ties go to the first spot found (top to bottom, left to right).
 */
export function shipAnchor(scene: IslandScene, centre: { x: number; y: number }): { x: number; y: number } | null {
  const keepOut = shipKeepOut(scene);
  return nearestMooring(scene, centre, keepOut, HUD_CLEAR) ?? nearestMooring(scene, centre, keepOut, 0);
}

/** The nearest spot whose box ends at least `bottom` px above the picture's bottom edge, or null. */
function nearestMooring(scene: IslandScene, centre: { x: number; y: number }, keepOut: readonly SceneRect[], bottom: number): { x: number; y: number } | null {
  const { w, h } = SHIP_SIZE;
  let best: { x: number; y: number; d: number } | null = null;
  for (let y = 0; y + h <= scene.height - bottom; y += STEP) {
    for (let x = 0; x + w <= scene.width; x += STEP) {
      const d = (x + w / 2 - centre.x) ** 2 + (y + h / 2 - centre.y) ** 2;
      if (best && d >= best.d) continue;
      if (!allWater(scene, { x, y: y + SHIP_HULL_TOP, w, h: h - SHIP_HULL_TOP })) continue;
      const box = { x, y, w, h };
      if (keepOut.some((r) => overlaps(box, r))) continue;
      best = { x, y, d };
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}
