/**
 * The SHIFT Island tree close-up: the team's tree large, sky above, the ground
 * cut open below with one root per root reflection. One pixel grid for the
 * web canvas, the Discord bot's PNG and the promo renderer. Pure and
 * deterministic (seeded RNG): no DOM, Node or Discord imports.
 */
import { PALETTE, SPRITES } from "@/bot/assets/island/sprites";

import { mapTreeColor, resolveStyle, treeItem, type TreeItem, type TreeStyle } from "./tree-style";

export interface CloseupInput {
  style: TreeStyle;
  /** Tree stage, 0 (empty plot) to 7 (blossom). */
  stage: number;
  /** Stage 0 only: the team picked a seed, so it is in the ground. */
  seeded: boolean;
  /** Root reflections: all of them, and how many of those are recent (their tips glow). */
  roots: { count: number; recent: number };
}

/** Hex colours, row-major; null is transparent. */
export type PixelGrid = (string | null)[][];

export const CLOSEUP_SIZE: Readonly<{ w: number; h: number; ground: number }> = { w: 96, h: 150, ground: 96 };

type Trio = [string, string, string];
type Pt = [number, number];
type Rng = () => number;

const { w: W, h: H, ground: GROUND } = CLOSEUP_SIZE;
/** The plot centre column: trunk, seed and camera all centre on it. */
const CX = 48;
/** Tree size per stage; stages 0 to 2 have no tree yet. */
const TREE_SCALE = [0, 0, 0, 0.34, 0.56, 0.78, 1, 1];
/** Stages up to this one are seen at ZOOM about the plot centre, so a seed or sprout fills the frame. */
const ZOOM_LAST_STAGE = 2;
const ZOOM = 2;
/** The top roots level: more reflections than this draw no more roots. */
const MAX_ROOTS = 15;
/** Map sprites are 32 wide with soil from row 30: the stake's sprite column 16 sits on CX. */
const SPRITE_CENTRE = 16;
const SPRITE_SOIL_ROW = 30;

const COLOR = {
  skyHigh: "#BFE3E6",
  skyLow: "#D6EEE6",
  sun: "#FFE9A8",
  soil: "#5A4232",
  soilDeep: "#4E3829",
  soilFleck: "#6E523D",
  seed: "#8B5E3C",
};

/** Canopy blobs of the full-size tree: [x, y, radius]. */
const BLOBS: [number, number, number][] = [
  [48, 34, 24],
  [30, 44, 17],
  [66, 44, 17],
  [40, 22, 15],
  [58, 24, 15],
  [48, 52, 15],
];
const FLOWER: Pt[] = [[0, -2], [-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]];
const FRUIT: Pt[] = [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1], [1, 1], [-1, 1], [1, -1]];
const NEIGHBOURS: Pt[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** The resolved colours and leaf stamp of a style. */
interface Look {
  shape: string;
  stamp: string[];
  leaf: Trio;
  bark: Trio;
  bloom: Trio;
}

/** The plant in world pixels, before the camera: colours, plus the solid mask the outline wraps. */
interface Layer {
  px: PixelGrid;
  solid: boolean[][];
}

/** The close-up as a 96 x 150 grid: sky above CLOSEUP_SIZE.ground, cut-open soil below. */
export function closeupGrid(input: CloseupInput): PixelGrid {
  const style = resolveStyle(input.style);
  const look = lookOf(style);
  const stage = clampInt(input.stage, 0, 7);
  const planted = stage > 0 || input.seeded;
  const zoom = stage <= ZOOM_LAST_STAGE ? ZOOM : 1;
  const count = planted ? clampInt(input.roots.count, 0, MAX_ROOTS) : 0;
  const recent = clampInt(input.roots.recent, 0, count);

  const layer: Layer = { px: grid<string | null>(null), solid: grid(false) };
  if (stage >= 3) drawTree(layer, look, stage);
  else if (stage === 2) drawSprout(layer, look.leaf);
  else if (stage === 1) drawShoot(layer, look.leaf);
  else drawStake(layer, style);
  outline(layer);
  if (planted && stage <= ZOOM_LAST_STAGE) drawSeed(layer.px, stage);

  const out = compose(backdrop(), layer.px, zoom);
  drawRoots(out, stage, count, recent);
  return out;
}

/** The grid scaled up by a whole number into RGBA bytes (transparent where the grid is null). */
export function gridToRgba(grid: PixelGrid, scale: number): { width: number; height: number; data: Uint8Array } {
  const s = Math.max(1, Math.floor(scale));
  const width = (grid[0]?.length ?? 0) * s;
  const height = grid.length * s;
  const data = new Uint8Array(width * height * 4);
  grid.forEach((row, y) =>
    row.forEach((hex, x) => {
      if (!hex) return;
      const n = parseInt(hex.slice(1), 16);
      for (let dy = 0; dy < s; dy++) {
        for (let dx = 0; dx < s; dx++) {
          const o = ((y * s + dy) * width + x * s + dx) * 4;
          data[o] = (n >> 16) & 255;
          data[o + 1] = (n >> 8) & 255;
          data[o + 2] = n & 255;
          data[o + 3] = 255;
        }
      }
    }),
  );
  return { width, height, data };
}

function lookOf(style: TreeStyle): Look {
  return {
    shape: style.shape,
    stamp: drawingOf(style.shape, "stamp"),
    leaf: drawingOf(style.leaf, "colors"),
    bark: drawingOf(style.bark, "colors"),
    bloom: drawingOf(style.bloom, "colors"),
  };
}

/** A resolved item's drawing: every shape has a stamp, every leaf, bark and bloom three colours. */
function drawingOf<K extends "stamp" | "colors">(id: string, key: K): NonNullable<TreeItem[K]> {
  const drawing = treeItem(id)?.[key];
  if (!drawing) throw new Error(`tree-closeup: ${id} has no ${key}`);
  return drawing;
}

function clampInt(v: number, lo: number, hi: number): number {
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.floor(v))) : lo;
}

function grid<T>(fill: T): T[][] {
  return Array.from({ length: H }, () => Array<T>(W).fill(fill));
}

/** Mulberry32: the mockup's seeded RNG. */
function rng(seed: number): Rng {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Set one pixel, rounding and clipping to the grid; false when it fell outside. */
function put(px: PixelGrid, x: number, y: number, color: string): boolean {
  const c = Math.round(x);
  const r = Math.round(y);
  if (c < 0 || r < 0 || c >= W || r >= H) return false;
  px[r][c] = color;
  return true;
}

/** Set a plant pixel; solid ones get the outline. */
function paint(layer: Layer, x: number, y: number, color: string, solid = true): void {
  if (put(layer.px, x, y, color) && solid) layer.solid[Math.round(y)][Math.round(x)] = true;
}

/** Sky in two bands with a sun, grass, then soil darkening with depth. Screen space: the camera never moves it. */
function backdrop(): PixelGrid {
  const g = grid<string | null>(null);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) g[y][x] = y < GROUND ? (y < GROUND / 2 ? COLOR.skyHigh : COLOR.skyLow) : soilAt(x, y);
  }
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) if (dx * dx + dy * dy <= 25) g[12 + dy][80 + dx] = COLOR.sun;
  }
  return g;
}

function soilAt(x: number, y: number): string {
  const q = y - GROUND;
  if (q < 2) return x % 3 ? PALETTE.g : PALETTE.h;
  if (q < 3) return PALETTE.h;
  if ((x * 13 + y * 7) % 11 === 0) return COLOR.soilFleck;
  return y > GROUND + 30 ? COLOR.soilDeep : COLOR.soil;
}

/** The plant over the backdrop, magnified by zoom about (CX, GROUND). */
function compose(back: PixelGrid, world: PixelGrid, zoom: number): PixelGrid {
  return back.map((row, y) =>
    row.map((c, x) => world[GROUND + Math.floor((y - GROUND) / zoom)][CX + Math.floor((x - CX) / zoom)] ?? c),
  );
}

/** A 1px dark outline around everything solid above the ground. */
function outline(layer: Layer): void {
  const edge: Pt[] = [];
  for (let y = 0; y < GROUND; y++) {
    for (let x = 0; x < W; x++) {
      if (!layer.solid[y][x] && NEIGHBOURS.some(([dx, dy]) => layer.solid[y + dy]?.[x + dx])) edge.push([x, y]);
    }
  }
  for (const [x, y] of edge) layer.px[y][x] = PALETTE.o;
}

/** Stage 0: the map's marker post (sprite stage_0), bark-coloured like the map tree. */
function drawStake(layer: Layer, style: TreeStyle): void {
  SPRITES.stage_0.slice(0, SPRITE_SOIL_ROW).forEach((line, row) =>
    [...line].forEach((ch, col) => {
      if (ch === ".") return;
      const color = mapTreeColor(style, ch, row) ?? PALETTE[ch];
      paint(layer, CX + col - SPRITE_CENTRE, GROUND - SPRITE_SOIL_ROW + row, color, ch !== "o");
    }),
  );
}

/** Stage 1: a sprout tip just breaking the surface. */
function drawShoot(layer: Layer, leaf: Trio): void {
  paint(layer, CX, GROUND - 1, leaf[2]);
  paint(layer, CX + 1, GROUND - 2, leaf[2]);
}

/** Stage 2: a stem with two leaves. */
function drawSprout(layer: Layer, leaf: Trio): void {
  for (let y = GROUND - 1; y >= GROUND - 9; y--) paint(layer, CX, y, leaf[1]);
  for (const dir of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 3; j++) {
        if ((i === 0 || i === 4) && j !== 1) continue;
        paint(layer, CX + dir * (1 + i), GROUND - 10 - j + (i > 2 ? 1 : 0), j === 0 ? leaf[2] : leaf[1]);
      }
    }
  }
  paint(layer, CX, GROUND - 10, leaf[2]);
}

/** The seed underground (stages 0 to 2), with its stem and taproot once it sprouts. */
function drawSeed(px: PixelGrid, stage: number): void {
  const sy = seedY(stage);
  for (let a = -3; a <= 3; a++) {
    for (let b = -2; b <= 2; b++) {
      if ((a * a) / 9 + (b * b) / 4 <= 1) put(px, CX + a, sy + b, a < 0 && b < 0 ? PALETTE.e : COLOR.seed);
    }
  }
  if (stage === 0) return;
  for (let y = GROUND + 2; y < sy - 2; y++) put(px, CX, y, PALETTE.i);
  for (let y = sy + 3; y < sy + 3 + stage * 3; y++) put(px, CX + (y % 3 ? 0 : 1), y, PALETTE.i);
}

/** The seed's centre row, before the camera. */
function seedY(stage: number): number {
  return GROUND + (stage === 2 ? 5 : 7);
}

/** Stages 3 to 7: branches, trunk, canopy of leaf stamps, then fruit (6) or flowers (7). */
function drawTree(layer: Layer, look: Look, stage: number): void {
  const k = TREE_SCALE[stage];
  const R = rng(7);
  const T = (x: number, y: number): Pt => [CX + (x - CX) * k, GROUND + (y - GROUND) * k];
  const inside = (x: number, y: number) => inCanopy(look.shape, CX + (x - CX) / k, GROUND + (y - GROUND) / k);

  const bt = Math.max(1, Math.round(3 * k));
  drawBranch(layer, T(CX - 1, 64), T(CX - 17, 44), bt, look.bark);
  drawBranch(layer, T(CX + 1, 64), T(CX + 16, 46), bt, look.bark);
  drawBranch(layer, T(CX, 58), T(CX + 3, 38), Math.max(1, bt - 1), look.bark);
  drawTrunk(layer, k, T(0, 52)[1], look.bark);
  drawCanopy(layer, look, k, inside, R);
  if (look.shape === "shape:willow") drawStrands(layer, look.leaf, k, inside, R);
  if (stage >= 6) drawBlossoms(layer, look.bloom, stage === 7, T, inside, R);
}

/** Canopy membership in full-size tree coordinates: tiers for the pine, blobs for every other shape. */
function inCanopy(shape: string, x: number, y: number): boolean {
  if (shape === "shape:pine") {
    return [0, 1, 2, 3].some((q) => {
      const y0 = 6 + q * 13;
      const y1 = y0 + 22;
      return y >= y0 && y <= y1 && Math.abs(x - CX) <= ((y - y0) / (y1 - y0)) * (13 + q * 6);
    });
  }
  return BLOBS.some(([bx, by, br]) => (x - bx) ** 2 + (y - by) ** 2 <= br * br);
}

function drawBranch(layer: Layer, [x0, y0]: Pt, [x1, y1]: Pt, thick: number, bark: Trio): void {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = y0 + ((y1 - y0) * i) / n;
    for (let d = 0; d < thick; d++) paint(layer, x + d, y, d === 0 ? bark[0] : bark[1]);
  }
}

/** A trunk that widens to a flared base, lit on the left, with bark marks once it is big enough. */
function drawTrunk(layer: Layer, k: number, top: number, bark: Trio): void {
  for (let y = Math.round(top); y < GROUND; y++) {
    const t = (y - top) / (GROUND - top);
    const flare = y > GROUND - 7 * k ? (y - (GROUND - 7 * k)) * 1.2 : 0;
    const half = (3 + t * 4) * Math.max(k, 0.3) + flare;
    for (let x = Math.round(CX - half); x <= Math.round(CX + half); x++) {
      const rel = (x - (CX - half)) / (2 * half || 1);
      let c = rel < 0.28 ? bark[2] : rel > 0.72 ? bark[0] : bark[1];
      if (k > 0.5 && rel > 0.22 && rel < 0.8 && (x * 7 + Math.floor(y / 3) * 3) % 5 === 0) c = bark[0];
      paint(layer, x, y, c);
    }
  }
}

/** Dark canopy fill, then leaf stamps lit from the top left, painted back to front. */
function drawCanopy(layer: Layer, look: Look, k: number, inside: (x: number, y: number) => boolean, R: Rng): void {
  for (let y = 0; y < GROUND; y++) for (let x = 0; x < W; x++) if (inside(x, y)) paint(layer, x, y, look.leaf[0]);
  const stamps: [number, number, number][] = [];
  for (let y = 1; y < GROUND; y += 3) {
    for (let x = 1; x < W; x += 3) {
      const sx = x + Math.floor(R() * 3) - 1;
      const sy = y + Math.floor(R() * 3) - 1;
      if (!inside(sx, sy)) continue;
      const ox = CX + (sx - CX) / k;
      const oy = GROUND + (sy - GROUND) / k;
      stamps.push([sx, sy, (ox - 24 + (oy - 8)) / 110 + R() * 0.28]);
    }
  }
  stamps.sort((a, b) => b[2] - a[2]);
  for (const [sx, sy, d] of stamps) {
    const c = look.leaf[d < 0.42 ? 2 : d < 0.75 ? 1 : 0];
    look.stamp.forEach((row, r) =>
      [...row].forEach((ch, q) => {
        const x = sx + q - 1;
        const y = sy + r - 1;
        if (ch === "#" && (inside(x, y) || inside(x, y + 1))) paint(layer, x, y, c);
      }),
    );
  }
}

/** Willow: leafy strands hanging from the canopy's lower edge, clear of the trunk. Not outlined. */
function drawStrands(layer: Layer, leaf: Trio, k: number, inside: (x: number, y: number) => boolean, R: Rng): void {
  for (let x = 1; x < W; x += 2) {
    let bottom = -1;
    for (let y = GROUND - 1; y >= 0 && bottom < 0; y--) if (inside(x, y)) bottom = y;
    const len = Math.round((6 + R() * 10) * k);
    if (bottom < 0 || Math.abs(x - CX) <= 6 * k) continue;
    for (let i = 1; i <= len && bottom + i < GROUND - 2; i++) {
      paint(layer, x, bottom + i, (bottom + i + x) % 3 ? leaf[1] : leaf[2], false);
    }
  }
}

/** Stage 6 fruit or stage 7 flowers in the bloom colours, each fully inside the canopy. */
function drawBlossoms(
  layer: Layer,
  bloom: Trio,
  flowers: boolean,
  T: (x: number, y: number) => Pt,
  inside: (x: number, y: number) => boolean,
  R: Rng,
): void {
  const want = flowers ? 10 : 7;
  for (let n = 0, tries = 0; n < want && tries < 600; tries++) {
    const [x, y] = T(10 + Math.floor(R() * 76), 6 + Math.floor(R() * 56)).map((v) => Math.round(v));
    if (!inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y - 2) || !inside(x, y + 2)) continue;
    if (flowers) {
      for (const [a, b] of FLOWER) paint(layer, x + a, y + b, b < 0 && a <= 0 ? bloom[0] : bloom[2]);
      paint(layer, x, y, bloom[1]);
    } else {
      for (const [a, b] of FRUIT) paint(layer, x + a, y + b, bloom[1]);
      paint(layer, x - 1, y - 1, bloom[0]);
      paint(layer, x, y - 2, PALETTE.b);
    }
    n++;
  }
}

/**
 * One root per reflection, branching twice, drawn after the camera so they
 * stay fine lines at every stage. Each root keeps its place and shape as more
 * are added (slots fill the fan evenly, one RNG per root); the newest `recent`
 * end in glowing tips. They grow from the trunk base, or from the bottom of
 * the magnified seed as far as a stage 3 tree's roots reach.
 */
function drawRoots(px: PixelGrid, stage: number, count: number, recent: number): void {
  const tree = stage > ZOOM_LAST_STAGE;
  const k = TREE_SCALE[tree ? stage : ZOOM_LAST_STAGE + 1];
  // The seed's bottom row (seedY + 2) ends on screen just above where row seedY + 3 would start.
  const top = tree ? GROUND + 3 : GROUND + (seedY(stage) + 3 - GROUND) * ZOOM - 1;
  const spread = tree ? 18 * k : 12;
  const reach = 0.4 + 0.6 * k;
  const tips: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const p = rootSlot(i);
    const R = rng(3 + i);
    const ends = growRoot(px, R, [CX + (p - 0.5) * spread, top], Math.PI * (0.18 + 0.64 * p), (16 + R() * 8) * reach, 0);
    if (i >= count - recent) tips.push(...ends);
  }
  for (const [x, y] of tips) {
    put(px, x, y, PALETTE.y);
    put(px, x + 1, y, PALETTE.y);
    put(px, x, y + 1, PALETTE.f);
  }
}

/** Where root i sits in the fan, in (0, 1): 1/2, 1/4, 3/4, 1/8, ... so any first n spread out. */
function rootSlot(i: number): number {
  let p = 0;
  for (let n = i + 1, f = 0.5; n > 0; n >>= 1, f /= 2) if (n & 1) p += f;
  return p;
}

/** Walk a wandering root until it leaves the soil, split it twice, and return its tips. */
function growRoot(px: PixelGrid, R: Rng, [x0, y0]: Pt, ang0: number, len: number, depth: number): Pt[] {
  let x = x0;
  let y = y0;
  let ang = ang0;
  for (let i = 0; i < len; i++) {
    const nx = x + Math.cos(ang);
    const ny = y + Math.sin(ang);
    ang += (R() - 0.5) * 0.35;
    if (ny >= H - 1 || ny < GROUND + 3) break;
    x = nx;
    y = ny;
    put(px, x, y, PALETTE.i);
  }
  if (depth >= 2) return [[x, y]];
  return [
    ...growRoot(px, R, [x, y], ang - 0.5, len * 0.6, depth + 1),
    ...growRoot(px, R, [x, y], ang + 0.5, len * 0.55, depth + 1),
  ];
}
