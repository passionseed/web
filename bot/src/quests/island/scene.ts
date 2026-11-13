/**
 * SHIFT Island as data: where every tile, path, tree, tag and decoration sits,
 * in native pixels at scale 1. Pure TypeScript with no Node, DOM or Buffer
 * imports, so the same scene feeds two rasterizers:
 *
 * - render.ts draws it into the PNG the Discord bot posts (pixel for pixel
 *   what it drew before this module existed; the pinned hash proves it);
 * - the website draws it on a canvas with motion sprites and lighting
 *   (lib/shift-island/live).
 *
 * Stable: every slot has one fixed spot, measured from the plaza, on a
 * lattice whose order never depends on how many plots exist. The plot number
 * on the image is the slot itself. Adding, archiving or reordering plots never
 * moves or renumbers another tree; the island only grows around them.
 *
 * Deterministic: the same plots always produce the same scene.
 */
import { SPRITES } from "../../../assets/island/sprites";

export interface IslandPlot {
  slot: number;
  stage: number;
  visitor: boolean;
  key: boolean;
  helper: boolean;
  lantern: boolean;
  name: string | null;
  mine: boolean;
  /** The viewer may see only the slot (no full consent): drawn as an empty plot, whatever else it carries. */
  plain?: boolean;
  /**
   * Roots level 0..3 from the team's reflections (shift_quest_island_roots,
   * schema 10; island/roots.ts merges it by slot). Absent is 0. Drawn over
   * the tree's soil; never on a plain plot.
   */
  roots?: number;
}

/** Why a render failed. The detail is a sprite key or a slot, never student text. */
export type RenderErrorCode = "missing_sprite" | "bad_plot" | "too_large";

export class RenderError extends Error {
  constructor(
    readonly code: RenderErrorCode,
    readonly detail: string
  ) {
    super(`island render failed: ${code} (${detail})`);
    this.name = "RenderError";
  }
}

/** Tile size in native pixels. */
export const TILE = 16;
/** Widest image, in output pixels: big islands drop to scale 1 before they pass it. */
export const MAX_WIDTH = 1600;
const MIN_COLS = 30;
const MAX_COLS = MAX_WIDTH / TILE;
/** Plaza size in tiles, centred on the island. */
const PLAZA_W = 6;
const PLAZA_H = 4;
/** The land is an ellipse this many columns and rows wide (as a share of the image). */
const LAND_X = 0.44;
const LAND_Y = 0.4;
const ROWS_PER_COL = 0.56;
/** Highest roots level (roots_1..roots_3). */
export const MAX_ROOTS = 3;
/** The first soil row of every tree sprite: roots are drawn from here down, inside the tree's own box. */
export const ROOTS_ROW = 30;

/**
 * Deterministic noise for a tile, keyed by its offset from the plaza, so the
 * coast and the grass look hand-made but never reshuffle as the island grows.
 */
function noise(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ 0x5f1f7;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** A sprite's size in native pixels. Throws RenderError("missing_sprite") for an unknown name. */
export function spriteSize(name: string): { w: number; h: number } {
  const rows = SPRITES[name];
  if (!rows?.length) throw new RenderError("missing_sprite", name);
  return { w: rows[0].length, h: rows.length };
}

/** First row with a visible pixel: where the drawn shape actually starts. */
export function inkTop(name: string): number {
  const rows = SPRITES[name];
  if (!rows?.length) throw new RenderError("missing_sprite", name);
  const top = rows.findIndex((row) => /[^. ]/.test(row));
  return top < 0 ? 0 : top;
}

/** 3 x 5 pixel digits, row-major ("1" is ink), for the plot number tags. */
export const DIGITS: readonly string[] = [
  "111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001",
  "111100111001111", "111100111101111", "111001010010010", "111101111101111", "111101111001111",
];

/** A rectangle in native pixels. */
export interface SceneRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where a plot number's tag sits: centred on cx, its top edge on cy, each digit pixel g x g. */
export function tagRect(n: number, cx: number, cy: number, g: number): SceneRect {
  const w = (String(n).length * 4 + 3) * g;
  // Top edge on the soil line: the tag never covers the tree above it.
  return { x: cx - Math.floor(w / 2), y: cy, w, h: 9 * g };
}

/** A plot spot as an offset in tiles from the plaza centre: the tree's left column and base row. */
export interface Spot {
  x: number;
  y: number;
}

/**
 * Every spot a plot can take, in slot order: slot k always takes SPOTS[k - 1].
 * A staggered lattice (4 tiles apart, rows 3 tiles apart) sorted by distance
 * from the plaza on the island's own ellipse, so early slots sit near the
 * centre and the island fills evenly as it grows. Computed once; it never
 * depends on how many plots exist.
 */
export const SPOTS: readonly Spot[] = (() => {
  const list: (Spot & { d: number })[] = [];
  const ax = LAND_X;
  const ay = LAND_Y * ROWS_PER_COL;
  for (let j = -12; j <= 12; j++) {
    const y = j * 3;
    for (let i = -14; i <= 14; i++) {
      const x = i * 4 + (Math.abs(j) % 2) * 2;
      // The plaza, its well, and the festival banner above it stay clear.
      if (x >= -6 && x <= 4 && y >= -3 && y <= 4) continue;
      // The tree's centre is one tile right of its left column, a quarter tile above its base.
      const cx = x + 1;
      const cy = y - 0.25;
      list.push({ x, y, d: (cx / ax) ** 2 + (cy / ay) ** 2 });
    }
  }
  list.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
  return list.map(({ x, y }) => ({ x, y }));
})();

export interface Layout {
  cols: number;
  rows: number;
  land: boolean[][];
  /** Plaza rectangle in tiles; its centre is (pcx, pcy). */
  plaza: { x: number; y: number; w: number; h: number };
  pcx: number;
  pcy: number;
}

function rowsFor(cols: number): number {
  return 2 * Math.round((cols * ROWS_PER_COL) / 2);
}

/** Land test for a tile given as an offset from the plaza centre, on an island of this size. */
function isLand(cols: number, rows: number, rx: number, ry: number): boolean {
  if (rx < -cols / 2 || rx >= cols / 2 || ry < -rows / 2 || ry >= rows / 2) return false;
  const nx = (rx + 0.5) / (cols * LAND_X);
  const ny = (ry + 0.5) / (rows * LAND_Y);
  const wobble = (Math.sin(rx * 0.55) + Math.cos(ry * 0.8) + (noise(rx, ry) - 0.5) * 0.6) * 0.045;
  return nx * nx + ny * ny + wobble < 1;
}

/** A spot fits when its tree, its soil and the path row below it are all on land. */
function fits(cols: number, rows: number, s: Spot): boolean {
  for (let dy = -2; dy <= 1; dy++) for (let dx = -1; dx <= 2; dx++) if (!isLand(cols, rows, s.x + dx, s.y + dy)) return false;
  return true;
}

/** Layouts by island width: the land never changes for a given size, so it is built once. */
const layouts = new Map<number, Layout>();
/** How many leading spots fit on an island of this width (the first slot that does not, minus one). */
const capacities = new Map<number, number>();

function capacity(cols: number): number {
  let k = capacities.get(cols);
  if (k === undefined) {
    const rows = rowsFor(cols);
    k = 0;
    while (k < SPOTS.length && fits(cols, rows, SPOTS[k])) k++;
    capacities.set(cols, k);
  }
  return k;
}

/**
 * The smallest island (even sizes, growing one step at a time) whose land
 * holds every spot up to the highest slot drawn. More plots never shrink it.
 * Shared and cached: callers must not change it.
 */
export function layoutFor(maxSlot: number): Layout {
  if (maxSlot > SPOTS.length) throw new RenderError("too_large", `slot ${maxSlot}`);
  for (let cols = MIN_COLS; cols <= MAX_COLS; cols += 2) {
    if (capacity(cols) < maxSlot) continue;
    const cached = layouts.get(cols);
    if (cached) return cached;
    const rows = rowsFor(cols);
    const pcx = cols / 2;
    const pcy = rows / 2;
    const land: boolean[][] = [];
    for (let y = 0; y < rows; y++) {
      land.push([]);
      for (let x = 0; x < cols; x++) land[y].push(isLand(cols, rows, x - pcx, y - pcy));
    }
    const layout = { cols, rows, land, plaza: { x: pcx - PLAZA_W / 2, y: pcy - PLAZA_H / 2, w: PLAZA_W, h: PLAZA_H }, pcx, pcy };
    layouts.set(cols, layout);
    return layout;
  }
  throw new RenderError("too_large", `slot ${maxSlot}`);
}

/** One character per tile kind, for IslandScene.tiles. */
export const TILE_CODES = {
  water_a: "a",
  water_b: "b",
  sand: "s",
  sand_b: "t",
  grass_a: "1",
  grass_b: "2",
  grass_c: "3",
  plaza: "p",
  shore_n: "N",
  shore_s: "S",
  shore_e: "E",
  shore_w: "W",
} as const;

export type TileKey = keyof typeof TILE_CODES;

/** The tile (and sprite) name for each code in IslandScene.tiles. */
export const TILE_BY_CODE: Readonly<Record<string, TileKey>> = Object.fromEntries(
  (Object.entries(TILE_CODES) as [TileKey, string][]).map(([name, code]) => [code, name])
);

/**
 * The open-sea tile at column x, row y of an island this size: the same
 * choice the island makes for its own water, so the web can keep drawing the
 * sea past the picture's edges (any x and y, also negative) without a seam.
 */
export function openWaterTile(island: { cols: number; rows: number }, x: number, y: number): "water_a" | "water_b" {
  return noise(x - island.cols / 2 + 1000, y - island.rows / 2 + 1000) < 0.12 ? "water_b" : "water_a";
}

function tileName(layout: Layout, x: number, y: number): TileKey {
  const { land, plaza, pcx, pcy } = layout;
  if (x >= plaza.x && x < plaza.x + plaza.w && y >= plaza.y && y < plaza.y + plaza.h) return "plaza";
  if (!land[y][x]) return openWaterTile(layout, x, y);
  const n = noise(x - pcx + 1000, y - pcy + 1000);
  const water = (dx: number, dy: number) => !land[y + dy]?.[x + dx];
  if (water(0, -1)) return "shore_n";
  if (water(0, 1)) return "shore_s";
  if (water(-1, 0)) return "shore_w";
  if (water(1, 0)) return "shore_e";
  const coast = [-2, 2].some((d) => water(d, 0) || water(0, d));
  if (coast) return n < 0.3 ? "sand_b" : "sand";
  if (n < 0.08) return "grass_c";
  if (n < 0.35) return "grass_b";
  return "grass_a";
}

/**
 * Pixel size of a number tag's digit cells. Discord shows an inline image at
 * roughly 550 px wide; bigger islands get bigger tags so a number stays about
 * 5 px tall in that preview.
 */
export function glyphFor(cols: number): number {
  return Math.min(3, Math.max(1, Math.ceil(cols / 34)));
}

function checkPlots(plots: IslandPlot[]): void {
  const seen = new Set<number>();
  for (const p of plots) {
    if (!Number.isInteger(p.slot) || p.slot < 1 || seen.has(p.slot)) throw new RenderError("bad_plot", `slot ${String(p.slot)}`);
    if (!Number.isFinite(p.stage)) throw new RenderError("bad_plot", `slot ${p.slot}`);
    seen.add(p.slot);
  }
}

/**
 * Where each drawn slot's tree sits, in tiles from the plaza centre. Exposed
 * for tests: the same function places plots in buildScene.
 */
export function plotSpots(plots: IslandPlot[]): Map<number, Spot> {
  checkPlots(plots);
  return new Map(
    plots.map((p) => {
      if (p.slot > SPOTS.length) throw new RenderError("too_large", `slot ${p.slot}`);
      return [p.slot, SPOTS[p.slot - 1]];
    })
  );
}

/** The plots as drawn, in slot order, with their spots and the island that holds them. */
interface Arrangement {
  spots: Map<number, Spot>;
  ordered: IslandPlot[];
  layout: Layout;
}

function arrange(plots: IslandPlot[]): Arrangement {
  const spots = plotSpots(plots);
  // A plain plot is a slot only: the database already sends stage 0, no
  // decorations and no roots for one; drawing it empty here too keeps that
  // true for any input.
  const ordered = plots
    .map((p) => (p.plain ? { ...p, stage: 0, visitor: false, key: false, helper: false, lantern: false, roots: 0 } : p))
    .sort((a, b) => a.slot - b.slot);
  const layout = layoutFor(ordered.length ? ordered[ordered.length - 1].slot : 0);
  return { spots, ordered, layout };
}

/** A roots level as drawn: 0..MAX_ROOTS, rounded and clamped; anything not a finite number is 0. */
export function rootsLevel(value: unknown): number {
  const n = typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 0), MAX_ROOTS) : 0;
}

/** A tree as drawn: its stage sprite and that sprite's top-left corner, in image pixels at scale 1. */
interface PlacedTree {
  plot: IslandPlot;
  stage: number;
  sprite: string;
  size: { w: number; h: number };
  left: number;
  top: number;
}

/**
 * Where each tree is drawn: centred one tile right of its spot's left column,
 * standing on the spot's base row. The one placement both buildScene and
 * plotBoxes use, so the picture and its tap targets cannot drift apart.
 */
function placeTrees({ spots, ordered, layout }: Arrangement): PlacedTree[] {
  return ordered.map((plot) => {
    const spot = spots.get(plot.slot)!;
    const sx = layout.pcx + spot.x;
    const sy = layout.pcy + spot.y;
    const stage = Math.min(Math.max(Math.round(plot.stage), 0), 7);
    const sprite = `stage_${stage}`;
    const size = spriteSize(sprite);
    const left = sx * TILE + TILE - Math.floor(size.w / 2);
    const top = (sy + 1) * TILE - size.h;
    return { plot, stage, sprite, size, left, top };
  });
}

/** Where a tree's roots are drawn, or null (roots 0). The sprite is checked so a missing one fails like a tree's. */
function rootsSprite(plot: IslandPlot, left: number, top: number): SceneTree["roots"] {
  const level = rootsLevel(plot.roots);
  if (level === 0) return null;
  const sprite = `roots_${level}`;
  spriteSize(sprite);
  return { sprite, x: left, y: top + ROOTS_ROW };
}

/** A tree's number tag: centred under the tree, on its soil line. */
function treeTag({ plot, size, left, top }: PlacedTree, glyph: number): SceneRect {
  return tagRect(plot.slot, left + Math.floor(size.w / 2), top + size.h, glyph);
}

/** A plot's tree sprite and its number tag, in native pixels at scale 1 (renderIsland with scale 1). */
export interface PlotBox {
  slot: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * The box each plot takes on the picture renderIsland draws for the same
 * plots, at scale 1: its tree sprite and the number tag below it, in slot
 * order. Same placement as buildScene (plain plots too). Throws RenderError.
 */
export function plotBoxes(plots: IslandPlot[]): { width: number; height: number; boxes: PlotBox[] } {
  const arrangement = arrange(plots);
  const { layout } = arrangement;
  const glyph = glyphFor(layout.cols);
  const boxes = placeTrees(arrangement).map((tree) => {
    const { plot, size, left, top } = tree;
    const tag = treeTag(tree, glyph);
    const x0 = Math.min(left, tag.x);
    const y0 = Math.min(top, tag.y);
    const x1 = Math.max(left + size.w, tag.x + tag.w);
    const y1 = Math.max(top + size.h, tag.y + tag.h);
    return { slot: plot.slot, left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
  });
  return { width: layout.cols * TILE, height: layout.rows * TILE, boxes };
}

export interface ScenePoint {
  x: number;
  y: number;
}

/** A tree and its decorations, each a sprite's top-left corner in native pixels; null when not drawn. */
export interface SceneTree {
  slot: number;
  /** 0..7, after rounding and clamping (a plain plot is 0). */
  stage: number;
  /** "stage_N". */
  sprite: string;
  left: number;
  top: number;
  w: number;
  h: number;
  key: ScenePoint | null;
  visitor: ScenePoint | null;
  /** Only an earned lantern is drawn. */
  lantern: ScenePoint | null;
  /**
   * The roots overlay ("roots_1".."roots_3") over the tree's soil, at
   * (left, top + ROOTS_ROW): inside the tree's box, so it never covers a tag.
   * Null for roots 0 and for every plain plot. Absent in scenes built before
   * roots (treat as null).
   */
  roots?: { sprite: string; x: number; y: number } | null;
  mine: boolean;
}

/** A plot number tag: a dark box with pixel digits of the slot. */
export interface SceneTag {
  slot: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Everything renderIsland draws, in its draw order, at scale 1. Plain JSON,
 * so a server component can hand it to the browser. It carries no names.
 */
export interface IslandScene {
  v: 1;
  cols: number;
  rows: number;
  tile: 16;
  /** cols * 16 and rows * 16. */
  width: number;
  height: number;
  /** Digit pixel size of the tags, and the marker's upscale. */
  glyph: number;
  /** cols * rows characters, row-major, TILE_CODES values. */
  tiles: string;
  /** Cells (y * cols + x) with a helper path, in draw order. */
  paths: number[];
  well: ScenePoint;
  /** The festival bunting, only while a season runs. */
  banner: ScenePoint | null;
  /** Where the PNG anchors its boat. */
  boatStill: ScenePoint;
  trees: SceneTree[];
  tags: SceneTag[];
  /** The caller's pin, drawn at `scale`; null unless asked for and the caller has a plot. */
  marker: { x: number; y: number; scale: number } | null;
  /** Rows the web animates along: boatY inside the bottom two water rows, gullY inside the top two. */
  lanes: { boatY: number; gullY: number };
}

/** Where the caller's pin sits over a tree: centred, just above the tree's first inked row. */
export function markerAt(tree: Pick<SceneTree, "sprite" | "left" | "top" | "w">, glyph: number): { x: number; y: number; scale: number } {
  const pin = spriteSize("marker");
  const w = pin.w * glyph;
  return { x: tree.left + Math.floor((tree.w - w) / 2), y: tree.top + inkTop(tree.sprite) - pin.h * glyph - 2, scale: glyph };
}

/**
 * The island as a display list. Each plot sits at its slot's fixed spot and
 * carries its slot number; the island is sized from the highest slot drawn,
 * so archived slots leave a gap instead of shifting anyone. Throws RenderError.
 */
export function buildScene(plots: IslandPlot[], options: { markMine?: boolean; festival?: boolean } = {}): IslandScene {
  const arrangement = arrange(plots);
  const { spots, ordered, layout } = arrangement;
  const { cols, rows, plaza } = layout;
  const glyph = glyphFor(cols);
  const width = cols * TILE;
  const height = rows * TILE;

  let tiles = "";
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) tiles += TILE_CODES[tileName(layout, x, y)];

  // Helper paths: along the row below the tree, then up the plaza column. Never over water.
  const paths: number[] = [];
  const seen = new Set<number>();
  const path = (tx: number, ty: number) => {
    const onPlaza = tx >= plaza.x && tx < plaza.x + plaza.w && ty >= plaza.y && ty < plaza.y + plaza.h;
    if (!layout.land[ty]?.[tx] || onPlaza) return;
    const cell = ty * cols + tx;
    // The same sprite drawn twice in a row with nothing between looks the same as once.
    if (seen.has(cell)) return;
    seen.add(cell);
    paths.push(cell);
  };
  for (const plot of ordered) {
    if (!plot.helper) continue;
    const spot = spots.get(plot.slot)!;
    const sx = layout.pcx + spot.x;
    const row = layout.pcy + spot.y + 1;
    const fromX = sx + 1;
    const plazaCol = layout.pcx;
    const stepX = Math.sign(plazaCol - fromX);
    for (let x = fromX; stepX !== 0 && x !== plazaCol; x += stepX) path(x, row);
    const stepY = Math.sign(layout.pcy - row);
    for (let y = row; stepY !== 0 && Math.abs(y - layout.pcy) > 1; y += stepY) path(plazaCol, y);
  }

  const plazaCx = layout.pcx * TILE;
  const plazaCy = layout.pcy * TILE;
  const wellSize = spriteSize("well");
  const well = { x: Math.round(plazaCx - wellSize.w / 2), y: Math.round(plazaCy - wellSize.h / 2) };
  let banner: ScenePoint | null = null;
  if (options.festival) {
    const size = spriteSize("banner");
    banner = { x: Math.round(plazaCx - size.w / 2), y: plaza.y * TILE - size.h + 4 };
  }
  const boatSize = spriteSize("boat");
  const boatStill = { x: TILE * 2, y: height - TILE * 2 - boatSize.h };

  const placed = placeTrees(arrangement);
  const trees: SceneTree[] = placed.map(({ plot, stage, sprite, size, left, top }) => ({
    slot: plot.slot,
    stage,
    sprite,
    left,
    top,
    w: size.w,
    h: size.h,
    key: plot.key ? { x: left - 6, y: top + size.h - 22 } : null,
    visitor: plot.visitor ? { x: left + size.w - 2, y: top + size.h - 18 } : null,
    lantern: plot.lantern ? { x: left + size.w + 6, y: top + size.h - 20 } : null,
    roots: rootsSprite(plot, left, top),
    mine: plot.mine,
  }));
  const tags: SceneTag[] = placed.map((tree) => ({ slot: tree.plot.slot, ...treeTag(tree, glyph) }));
  const mine = options.markMine ? trees.find((t) => t.mine) : undefined;

  return {
    v: 1,
    cols,
    rows,
    tile: TILE,
    width,
    height,
    glyph,
    tiles,
    paths,
    well,
    banner,
    boatStill,
    trees,
    tags,
    marker: mine ? markerAt(mine, glyph) : null,
    lanes: { boatY: height - 30, gullY: 6 },
  };
}
