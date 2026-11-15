/**
 * The island as the ship sees it on the horizon: a side view, built from the
 * island's own sprites (the bot's SPRITES), so the trees are the same trees
 * the student will grow. Sand, a grassy hill, three plots at different
 * stages, two festival lanterns and a jetty on the side the ship comes in.
 *
 * Built once into a grid of PALETTE keys, then into runs. Lantern light uses
 * upper-case keys (Y, I, F) so the cutscene can leave it untinted at night.
 */
import { SPRITES } from "@/bot/assets/island/sprites";

import { pixelRuns, type PixelRun } from "../shipArt";

/** Width of the island with its jetty, native px. */
export const ISLAND_W = 100;
/** Height of the grid: trees on top, jetty posts below the waterline. */
export const ISLAND_H = 62;
/** Grid row where the shore meets the water. */
export const ISLAND_WATER = 58;
/** Where the jetty ends: the ship comes alongside here. */
export const JETTY_END = ISLAND_W;
/** How far the ship's bow overlaps the jetty when it is alongside. */
export const BERTH_OVERLAP = 6;

const LAND_END = 84;
const SAND_H = 3;
const HILL = { from: 6, to: 78, height: 14 } as const;
/** Lit keys in the lantern sprite: drawn untinted, they read as lamps at night. */
const LIT: Readonly<Record<string, string>> = { y: "Y", i: "I", f: "F" };

/** The sprite row of a stage tree's soil mound bottom (the last row is empty). */
const MOUND_BOTTOM = 38;

type Grid = string[][];

function blank(): Grid {
  return Array.from({ length: ISLAND_H }, () => Array.from({ length: ISLAND_W }, () => "."));
}

function put(grid: Grid, x: number, y: number, key: string) {
  if (y >= 0 && y < ISLAND_H && x >= 0 && x < ISLAND_W) grid[y][x] = key;
}

function stamp(grid: Grid, sprite: readonly string[], left: number, top: number, map: (key: string) => string = (k) => k) {
  sprite.forEach((row, dy) => {
    [...row].forEach((key, dx) => {
      if (key !== ".") put(grid, left + dx, top + dy, map(key));
    });
  });
}

/** Sand height at column x: three rows, tapering to the water at both ends. */
function sandAt(x: number): number {
  if (x < 0 || x >= LAND_END) return 0;
  return Math.min(SAND_H, 1 + Math.floor(x / 2), 1 + Math.floor((LAND_END - 1 - x) / 2));
}

/** Hill height above the sand at column x. */
export function hillAt(x: number): number {
  if (x < HILL.from || x >= HILL.to) return 0;
  const t = (x - HILL.from) / (HILL.to - HILL.from - 1);
  return 1 + Math.round((HILL.height - 1) * Math.pow(Math.sin(Math.PI * t), 0.7));
}

/** First grass row (from the top of the grid) at column x. */
export function surfaceAt(x: number): number {
  return ISLAND_WATER - sandAt(x) - hillAt(x);
}

function paintLand(grid: Grid) {
  for (let x = 0; x < LAND_END; x++) {
    const sand = sandAt(x);
    for (let d = 0; d < sand; d++) {
      // Wet sand at the waterline, dry above it.
      put(grid, x, ISLAND_WATER - 1 - d, d === 0 ? "d" : "s");
    }
    const hill = hillAt(x);
    const top = ISLAND_WATER - sand - hill;
    for (let y = top; y < ISLAND_WATER - sand; y++) {
      const depth = y - top;
      const key = depth === 0 ? "j" : depth <= 2 ? "g" : depth > 6 && (x + y) % 2 === 0 ? "m" : "h";
      put(grid, x, y, key);
    }
  }
}

/** A stage tree planted at `centre`, its soil mound sitting on the grass. */
function plant(grid: Grid, stage: number, centre: number) {
  const sprite = SPRITES[`stage_${stage}`];
  if (!sprite) return;
  const top = surfaceAt(centre) + 1 - MOUND_BOTTOM;
  stamp(grid, sprite, centre - 16, top);
}

/** Where each lantern's flame is, in grid px: the cutscene draws a glow there at night. */
export interface IslandLight {
  x: number;
  y: number;
}

function lantern(grid: Grid, lights: IslandLight[], x: number) {
  const sprite = SPRITES.lantern;
  if (!sprite) return;
  const top = surfaceAt(x) + 1 - sprite.length;
  stamp(grid, sprite, x - 4, top, (key) => LIT[key] ?? key);
  // The flame is the sprite's rows 6 to 8, columns 3 and 4.
  lights.push({ x, y: top + 7 });
}

/** Planks a row above the waterline, from the sand out to the berth, on posts. */
function jetty(grid: Grid) {
  const deck = ISLAND_WATER - SAND_H;
  for (let x = LAND_END - 6; x < JETTY_END; x++) {
    put(grid, x, deck, x % 4 === 0 ? "c" : "e");
    put(grid, x, deck + 1, "b");
  }
  for (let x = LAND_END - 2; x < JETTY_END; x += 6) {
    for (let y = deck + 2; y < ISLAND_H; y++) put(grid, x, y, "b");
  }
  // A mooring post at the end, a pixel taller than the planks.
  put(grid, JETTY_END - 2, deck - 1, "b");
}

function buildIsland(): { runs: PixelRun[]; lights: IslandLight[] } {
  const grid = blank();
  const lights: IslandLight[] = [];
  paintLand(grid);
  lantern(grid, lights, 10);
  // Back to front: the small plots first, the tallest tree last, in the middle.
  plant(grid, 3, 18);
  plant(grid, 5, 62);
  plant(grid, 7, 40);
  lantern(grid, lights, 75);
  jetty(grid);
  return { runs: pixelRuns(grid.map((row) => row.join(""))), lights };
}

const ISLAND = buildIsland();
export const ISLAND_RUNS: readonly PixelRun[] = ISLAND.runs;
export const ISLAND_LIGHTS: readonly IslandLight[] = ISLAND.lights;
