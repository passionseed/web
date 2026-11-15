/**
 * The SHIFT Island tree close-up: the team's tree large on a plain backdrop,
 * the ground cut open below with one root per root reflection. One pixel grid
 * for the web canvas, the Discord bot's PNG and the promo renderer. Pure and
 * deterministic (seeded RNG): no DOM, Node or Discord imports.
 *
 * The look is soft, painterly pixel art with no outlines. A canopy is a few
 * round lobes with a ragged edge, lit from the top left like a heap of
 * spheres, and painted in small leaf clusters, each a touch lighter on its own
 * top left. Every item colour becomes five tones: shadows cooler and duller,
 * highlights warmer and lighter.
 */
import { PALETTE, SPRITES } from "@/bot/assets/island/sprites";

import { mapTreeColor, resolveStyle, treeItem, type TreeItem, type TreeSlot, type TreeStyle } from "./tree-style";

export interface CloseupInput {
  style: TreeStyle;
  stage: number;
  seeded: boolean;
  roots: { count: number; recent: number };
}

export type PixelGrid = (string | null)[][];

export const CLOSEUP_SIZE: Readonly<{ w: number; h: number; ground: number }> = { w: 96, h: 150, ground: 96 };

type Trio = [string, string, string];
type Pt = [number, number];
type Rng = () => number;

const { w: W, h: H, ground: GROUND } = CLOSEUP_SIZE;
const CX = 48;
const TREE_SCALE = [0, 0, 0, 0.34, 0.56, 0.78, 1, 1];
const ZOOM_LAST_STAGE = 2;
const ZOOM = 2;
const MAX_ROOTS = 15;
const SPRITE_CENTRE = 16;
const SPRITE_SOIL_ROW = 30;
/** Light from the top left and a little toward the viewer. */
const LIGHT = unit(-0.5, -0.72, 0.48);
/** The same light flat on the picture: which side of a leaf cluster is lit. */
const LX = -0.6;
const LY = -0.8;

const COLOR = {
  bg: "#E9DFC9",
  grassHi: "#B3C46B",
  grass: "#8FA957",
  grassMid: "#759349",
  grassDark: "#5C7A3E",
  grassShade: "#6A8744",
  topsoil: "#6E5743",
  soil: "#5F4A3A",
  soilDeep: "#503F33",
  fleck: "#7A6450",
  fleckLo: "#4A3A2E",
  pebble: "#8E8070",
  pebbleHi: "#B3A591",
  pebbleLo: "#4A3C31",
  seed: "#8B6343",
  seedHi: "#B58C62",
  seedOut: "#45311F",
  root: "#AC8C69",
  rootHi: "#CBAE86",
  rootLo: "#806650",
};

/** The plain backdrop behind the tree: everything above the ground that is not the plant. */
export const CLOSEUP_BACKDROP = COLOR.bg;

/** Blossoms row by row: p petal, h lit petal, c centre, s petal in shadow; fruit f, F in shadow, H lit. */
/** Blossoms come in small bunches of petals, lit on top, a few showing their centre, and single buds. */
const BLOSSOMS = [
  ["hh.", "hpp", ".ps"],
  [".hp", "hcp", "ps."],
  ["hp.", "pps"],
  [".h.", "hpp", "ps."],
  ["hp", "ps"],
  ["h", "s"],
];
const FRUIT = [".Hf.", "Hfff", "ffFF", ".FF."];
const NEIGHBOURS: Pt[] = [[0, -1], [0, 1], [-1, 0], [1, 0]];

/** Five tones per item, and a faint one for stray leaves against the sky. */
interface Ramp {
  deep: string;
  dark: string;
  mid: string;
  light: string;
  hi: string;
  ghost: string;
}
type Tone = "deep" | "dark" | "mid" | "light" | "hi";

interface Look {
  shape: string;
  leaf: Ramp;
  bark: Ramp;
  bloom: Trio;
  bloomLo: string;
}

interface Lobe {
  x: number;
  y: number;
  r: number;
}

/** A canopy before it is painted: which pixels are leaves, the light on each, and the size and stretch of its leaf clusters. */
interface Field {
  inside: boolean[][];
  light: number[][];
  cell: number;
  stretch: Pt;
  /** Willow strands: no stray leaves around them. */
  hang?: boolean[][];
}

export function closeupGrid(input: CloseupInput): PixelGrid {
  const style = resolveStyle(input.style);
  const look = lookOf(style);
  const stage = clampInt(input.stage, 0, 7);
  const planted = stage > 0 || input.seeded;
  const zoom = stage <= ZOOM_LAST_STAGE ? ZOOM : 1;
  const count = planted ? clampInt(input.roots.count, 0, MAX_ROOTS) : 0;
  const recent = clampInt(input.roots.recent, 0, count);

  const px = grid<string | null>(null);
  if (stage >= 3) drawTree(px, look, stage);
  else if (stage === 2) drawSprout(px, look.leaf);
  else if (stage === 1) drawShoot(px, look.leaf);
  else drawStake(px, style);
  if (planted && stage <= ZOOM_LAST_STAGE) drawSeed(px, stage);

  const out = compose(backdrop(), px, zoom);
  drawRoots(out, stage, count, recent);
  return out;
}

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

export type CloseupView = "full" | "tree" | "canopy";

export const CLOSEUP_WINDOWS: Readonly<Record<CloseupView, { rows: readonly [number, number]; cols: readonly [number, number] }>> = {
  full: { rows: [0, H], cols: [0, W] },
  tree: { rows: [4, 100], cols: [0, W] },
  canopy: { rows: [14, 62], cols: [24, 72] },
};

export function cropGrid(grid: PixelGrid, view: CloseupView): PixelGrid {
  const { rows, cols } = CLOSEUP_WINDOWS[view];
  return grid.slice(...rows).map((row) => row.slice(...cols));
}

export const SHOWS_FROM: Readonly<Record<TreeSlot, number>> = { shape: 5, leaf: 5, bark: 5, bloom: 7 };

export function wearItem(base: CloseupInput, itemId: string): CloseupInput | null {
  const item = treeItem(itemId);
  if (!item) return null;
  return {
    ...base,
    style: { ...resolveStyle(base.style), [item.slot]: item.id },
    stage: Math.max(Math.trunc(base.stage) || 0, SHOWS_FROM[item.slot]),
    seeded: true,
  };
}

export function previewView(slot: TreeSlot): { view: CloseupView; scale: number } {
  return slot === "shape" ? { view: "canopy", scale: 2 } : { view: "tree", scale: 1 };
}

// ---------------------------------------------------------------- colour

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(Math.min(1, Math.max(0, c)) * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/** Move a colour's hue toward `target` by up to `by` degrees, and set its lightness and saturation. */
function shift(hex: string, target: number, by: number, light: (l: number) => number, sat = 1): string {
  const [h, s, l] = hexToHsl(hex);
  const diff = ((target - h + 540) % 360) - 180;
  const nh = (h + Math.sign(diff) * Math.min(Math.abs(diff), by) + 360) % 360;
  return hslToHex(nh, Math.min(1, s * sat), Math.min(0.96, Math.max(0.04, light(l))));
}

function mix(a: string, b: string, t: number): string {
  const p = parseInt(a.slice(1), 16);
  const q = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((p >> sh) & 255) * (1 - t) + ((q >> sh) & 255) * t);
  return `#${[16, 8, 0].map((sh) => ch(sh).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** An item's three colours as five tones: the deepest cooler and duller, the highlight warmer and lighter. */
function rampOf([dark, mid, light]: Trio): Ramp {
  return {
    deep: shift(dark, 235, 18, (l) => l * 0.74, 0.9),
    dark,
    mid,
    light,
    hi: shift(light, 50, 30, (l) => l + (1 - l) * 0.32, 1.25),
    ghost: mix(mid, COLOR.bg, 0.55),
  };
}

function lookOf(style: TreeStyle): Look {
  const bloom = drawingOf(style.bloom, "colors");
  return {
    shape: style.shape,
    leaf: rampOf(drawingOf(style.leaf, "colors")),
    bark: rampOf(drawingOf(style.bark, "colors")),
    bloom,
    bloomLo: shift(bloom[2], 300, 10, (l) => l * 0.8, 1.05),
  };
}

function drawingOf<K extends "stamp" | "colors">(id: string, key: K): NonNullable<TreeItem[K]> {
  const drawing = treeItem(id)?.[key];
  if (!drawing) throw new Error(`tree-closeup: ${id} has no ${key}`);
  return drawing;
}

// ---------------------------------------------------------------- grid basics

function clampInt(v: number, lo: number, hi: number): number {
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.floor(v))) : lo;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function unit(x: number, y: number, z: number): [number, number, number] {
  const n = Math.hypot(x, y, z);
  return [x / n, y / n, z / n];
}

function grid<T>(fill: T): T[][] {
  return Array.from({ length: H }, () => Array<T>(W).fill(fill));
}

function rng(seed: number): Rng {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 0..1 value per pixel, for texture that must not shift between renders. */
function hash(x: number, y: number, salt = 0): number {
  let h = Math.imul(x * 374761393 + y * 668265263 + salt * 2246822519, 3266489917);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

/** The leaf cluster a pixel belongs to: the nearest of a jittered grid of points, `size` apart and stretched by `stretch`. */
function cellAt(x: number, y: number, size: number, [sx, sy]: Pt): { i: number; j: number; x: number; y: number } {
  const w = size * sx;
  const h = size * sy;
  const gi = Math.floor(x / w);
  const gj = Math.floor(y / h);
  let best = { i: 0, j: 0, x: 0, y: 0 };
  let bd = Infinity;
  for (let j = gj - 1; j <= gj + 1; j++) {
    for (let i = gi - 1; i <= gi + 1; i++) {
      const cx = (i + 0.15 + 0.7 * hash(i, j, 41)) * w;
      const cy = (j + 0.15 + 0.7 * hash(i, j, 43)) * h;
      const d = ((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2;
      if (d < bd) {
        bd = d;
        best = { i, j, x: cx, y: cy };
      }
    }
  }
  return best;
}

function put(px: PixelGrid, x: number, y: number, color: string): boolean {
  const c = Math.round(x);
  const r = Math.round(y);
  if (c < 0 || r < 0 || c >= W || r >= H) return false;
  px[r][c] = color;
  return true;
}

// ---------------------------------------------------------------- backdrop

function backdrop(): PixelGrid {
  const g = grid<string | null>(null);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[y][x] = y < GROUND ? COLOR.bg : soilAt(x, y);
  drawGrass(g);
  drawPebbles(g);
  return g;
}

/** The grass strip: a few tufts standing up, then three rows down to the cut soil. */
function drawGrass(g: PixelGrid): void {
  for (let x = 0; x < W; x++) {
    g[GROUND][x] = hash(x, 1) < 0.55 ? COLOR.grassHi : COLOR.grass;
    g[GROUND + 1][x] = hash(x, 2) < 0.65 ? COLOR.grass : COLOR.grassMid;
    g[GROUND + 2][x] = hash(x, 3) < 0.55 ? COLOR.grassMid : COLOR.grassDark;
    g[GROUND + 3][x] = hash(x, 4) < 0.4 ? COLOR.grassDark : COLOR.topsoil;
  }
  // Tufts in small clumps, a blade or two tall, the left blades lit.
  for (let c = 0; c < W; c += 6) {
    if (hash(c, 7) < 0.45) continue;
    const at = c + Math.floor(hash(c, 8) * 4);
    for (let i = 0; i < 3; i++) {
      const x = at + i;
      if (x >= W || hash(x, 9) < 0.3) continue;
      g[GROUND - 1][x] = i === 0 ? COLOR.grassHi : COLOR.grass;
      if (i === 1 && hash(c, 10) < 0.6) g[GROUND - 2][x] = COLOR.grassHi;
    }
  }
}

function soilAt(x: number, y: number): string {
  const q = y - GROUND;
  let c: string;
  if (q < 7) c = COLOR.topsoil;
  else if (q < 9) c = (x + y) % 2 ? COLOR.topsoil : COLOR.soil;
  else if (q < 32) c = COLOR.soil;
  else if (q < 34) c = (x + y) % 2 ? COLOR.soil : COLOR.soilDeep;
  else c = COLOR.soilDeep;
  // Short flecks of grit, lighter near the top.
  const f = hash(Math.floor(x / 2), y, 61);
  if (q > 4 && f < 0.022) return COLOR.fleckLo;
  if (q > 4 && f > 0.986) return COLOR.fleck;
  return c;
}

/** A few small stones in the soil, lit from the top left. */
function drawPebbles(g: PixelGrid): void {
  const R = rng(91);
  for (let i = 0; i < 12; i++) {
    const x = 3 + Math.floor(R() * (W - 8));
    const y = GROUND + 8 + Math.floor(R() * (H - GROUND - 11));
    const wide = R() < 0.5;
    g[y][x] = COLOR.pebbleHi;
    g[y][x + 1] = COLOR.pebble;
    g[y + 1][x] = COLOR.pebble;
    g[y + 1][x + 1] = COLOR.pebbleLo;
    if (wide) {
      g[y][x + 2] = COLOR.pebble;
      g[y + 1][x + 2] = COLOR.pebbleLo;
    }
  }
}

function compose(back: PixelGrid, world: PixelGrid, zoom: number): PixelGrid {
  return back.map((row, y) =>
    row.map((c, x) => world[GROUND + Math.floor((y - GROUND) / zoom)][CX + Math.floor((x - CX) / zoom)] ?? c),
  );
}

// ---------------------------------------------------------------- young plants

function drawStake(px: PixelGrid, style: TreeStyle): void {
  SPRITES.stage_0.slice(0, SPRITE_SOIL_ROW).forEach((line, row) =>
    [...line].forEach((ch, col) => {
      if (ch === ".") return;
      put(px, CX + col - SPRITE_CENTRE, GROUND - SPRITE_SOIL_ROW + row, mapTreeColor(style, ch, row) ?? PALETTE[ch]);
    }),
  );
}

/** Stage 1: a curled shoot with one folded leaf, just out of the soil. */
function drawShoot(px: PixelGrid, leaf: Ramp): void {
  const pixels: [number, number, Tone][] = [
    [0, -1, "dark"],
    [0, -2, "mid"],
    [0, -3, "mid"],
    [1, -4, "light"],
    [2, -4, "dark"],
    [1, -5, "hi"],
    [2, -5, "light"],
    [3, -5, "mid"],
    [3, -4, "deep"],
  ];
  for (const [dx, dy, t] of pixels) put(px, CX + dx, GROUND + dy, leaf[t]);
}

/** Stage 2: a stem with two seed leaves, the left one in the light. */
function drawSprout(px: PixelGrid, leaf: Ramp): void {
  for (let y = GROUND - 1; y >= GROUND - 9; y--) put(px, CX, y, y > GROUND - 4 ? leaf.dark : leaf.mid);
  // Each leaf: rows of [from, to] columns out from the stem, top row first.
  const rows: [number, number][] = [
    [3, 5],
    [1, 6],
    [1, 6],
    [2, 4],
  ];
  for (const dir of [-1, 1]) {
    const lit = dir < 0;
    rows.forEach(([a, b], r) => {
      for (let i = a; i <= b; i++) {
        let tone: Tone = r === 0 ? (lit ? "hi" : "light") : r === rows.length - 1 ? (lit ? "dark" : "deep") : lit ? "light" : "mid";
        if (r === 1 && i === b) tone = lit ? "mid" : "dark";
        put(px, CX + dir * i, GROUND - 11 + r - Math.floor(i / 2), leaf[tone]);
      }
    });
  }
  put(px, CX, GROUND - 10, leaf.light);
}

function drawSeed(px: PixelGrid, stage: number): void {
  const sy = seedY(stage);
  for (let a = -4; a <= 4; a++) {
    for (let b = -3; b <= 3; b++) {
      const d = (a * a) / 16 + (b * b) / 9;
      if (d > 1) continue;
      const rimPx = (a * a) / 9 + (b * b) / 4 > 1;
      put(px, CX + a, sy + b, rimPx ? COLOR.seedOut : a < 0 && b < 0 ? COLOR.seedHi : COLOR.seed);
    }
  }
  put(px, CX - 2, sy - 1, PALETTE.e);
  if (stage === 0) return;
  for (let y = GROUND + 2; y < sy - 3; y++) put(px, CX, y, COLOR.rootHi);
  for (let y = sy + 4; y < sy + 4 + stage * 3; y++) put(px, CX + (y % 3 ? 0 : 1), y, COLOR.rootHi);
}

function seedY(stage: number): number {
  return GROUND + (stage === 2 ? 5 : 7);
}

// ---------------------------------------------------------------- the tree

/** The canopy of each lobed shape, full size: lobes [x, y, radius]. */
const LOBES: Record<string, [number, number, number][]> = {
  "shape:round": [
    [35, 53, 11],
    [61, 53, 11],
    [24, 44, 10],
    [72, 44, 10],
    [48, 44, 14],
    [33, 33, 12],
    [63, 33, 12],
    [48, 26, 14],
    [38, 18, 10],
    [58, 18, 10],
  ],
  "shape:maple": [
    [38, 56, 9],
    [58, 56, 9],
    [16, 44, 6],
    [80, 44, 6],
    [26, 48, 10],
    [70, 48, 10],
    [48, 44, 13],
    [24, 33, 7],
    [72, 33, 7],
    [35, 35, 11],
    [61, 35, 11],
    [48, 26, 12],
    [48, 15, 10],
  ],
  "shape:willow": [
    [22, 44, 9],
    [74, 44, 9],
    [34, 40, 12],
    [62, 40, 12],
    [48, 38, 14],
    [36, 27, 12],
    [60, 27, 12],
    [48, 20, 12],
  ],
};

/** Branch ends per shape, full size: where the trunk forks into the canopy. */
const BRANCHES: Record<string, Pt[]> = {
  "shape:round": [[30, 50], [64, 48], [50, 36]],
  "shape:maple": [[28, 48], [68, 46], [50, 34]],
  "shape:willow": [[28, 42], [68, 40], [50, 30]],
  "shape:heart": [[34, 46], [62, 46], [50, 40]],
  "shape:star": [[36, 50], [60, 50], [50, 40]],
  "shape:pine": [],
};

function drawTree(px: PixelGrid, look: Look, stage: number): void {
  const k = TREE_SCALE[stage];
  const R = rng(7);
  const T = (x: number, y: number): Pt => [CX + (x - CX) * k, GROUND + (y - GROUND) * k];
  const shape = look.shape in BRANCHES ? look.shape : "shape:round";

  let field: Field;
  if (shape === "shape:pine") field = pineField(k);
  else if (shape === "shape:heart" || shape === "shape:star") field = topiaryField(k, shape, R);
  else {
    const lobes = LOBES[shape].map(([x, y, r]) => {
      const [cx, cy] = T(x, y);
      return { x: cx, y: cy, r: Math.max(2.4, r * k) };
    });
    field = lobeField(lobes, k, shape === "shape:maple" ? 2.6 + 1.8 * k : 2.2 + 1.6 * k);
    if (shape === "shape:willow") addCurtain(field, lobes, k, R);
  }

  const top = shape === "shape:pine" ? T(0, 72)[1] : T(0, 60)[1];
  drawGroundShadow(px, field);
  const fork = T(0, 68)[1];
  for (const end of BRANCHES[shape]) drawBranch(px, [trunkX(fork, k, top), fork], T(...end), Math.max(1.5, 4 * k), 1, look.bark);
  drawTrunk(px, k, top, look.bark, field);
  drawTufts(px, k);
  paintCanopy(px, field, look.leaf);
  if (stage >= 6) drawBlossoms(px, look, stage === 7, k, field, rng(11));
}

function newField(cell: number, stretch: Pt): Field {
  return { inside: grid(false), light: grid(0), cell, stretch };
}

/**
 * A canopy of lobes seen as a heap of spheres: each pixel takes the light of
 * the lobe nearest the viewer there, the creases where two lobes meet go
 * dark, and the whole canopy darkens toward its bottom right. The edge is
 * ragged by whole leaf clusters, up to `rag` pixels in or out.
 */
function lobeField(lobes: Lobe[], k: number, rag: number, clip?: (x: number, y: number) => boolean): Field {
  const f = newField(2 + 0.9 * k, [1, 1]);
  const top = Math.min(...lobes.map((l) => l.y - l.r));
  const bottom = Math.max(...lobes.map((l) => l.y + l.r));
  const half = Math.max(...lobes.map((l) => Math.abs(l.x - CX) + l.r));
  for (let y = 0; y < GROUND; y++) {
    for (let x = 0; x < W; x++) {
      let z1 = -1;
      let z2 = -1;
      let best = -1;
      let near = 0;
      let gap = Infinity;
      lobes.forEach((l, i) => {
        const d = Math.hypot(x - l.x, y - l.y);
        if (d - l.r < gap) {
          gap = d - l.r;
          near = i;
        }
        if (d >= l.r) return;
        const z = Math.sqrt(l.r * l.r - d * d);
        if (z > z1) {
          z2 = z1;
          z1 = z;
          best = i;
        } else if (z > z2) z2 = z;
      });
      const c = cellAt(x, y, f.cell, [1, 1]);
      const jag = (hash(c.i, c.j, 5) - 0.5) * rag + (hash(x, y, 9) - 0.5) * 0.8;
      if (gap > jag) continue;
      if (clip && !clip(x + (hash(x, y, 11) - 0.5) * 1.4, y + (hash(x, y, 12) - 0.5) * 1.4)) continue;
      const l = lobes[best >= 0 ? best : near];
      const d = Math.max(0.01, Math.hypot(x - l.x, y - l.y));
      const n: [number, number, number] = best >= 0 ? [(x - l.x) / l.r, (y - l.y) / l.r, z1 / l.r] : [(x - l.x) / d, (y - l.y) / d, 0];
      const lam = clamp01(n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
      const crease = best >= 0 && z2 > 0 ? clamp01(1 - (z1 - z2) / (0.35 * l.r)) : 0;
      const slope = clamp01(1 - (0.85 * (y - top)) / (bottom - top) - (0.25 * (x - CX)) / half);
      f.inside[y][x] = true;
      f.light[y][x] = 0.42 * lam + 0.58 * slope - 0.12 * crease;
    }
  }
  return f;
}

/** Heart and star: a trimmed hedge in that outline, made of lobes clipped to it. */
function topiaryField(k: number, shape: string, R: Rng): Field {
  const full = shape === "shape:heart" ? inHeart : inStar;
  const clip = (x: number, y: number) => full(CX + (x - CX) / k, GROUND + (y - GROUND) / k);
  const step = 11;
  const lobes: Lobe[] = [];
  for (let y = 2, row = 0; y < 80; y += step * 0.78, row++) {
    for (let x = 2 + (row % 2) * (step / 2); x < 94; x += step) {
      const jx = x + (R() - 0.5) * 3;
      const jy = y + (R() - 0.5) * 3;
      if (!full(jx, jy) && !full(jx, jy + 4)) continue;
      lobes.push({ x: CX + (jx - CX) * k, y: GROUND + (jy - GROUND) * k, r: Math.max(2.4, 9 * k) });
    }
  }
  return lobeField(lobes, k, 1.2, clip);
}

const HEART = { cy: 39, sx: 31, sy: 23 };
function inHeart(x: number, y: number): boolean {
  const u = (x - CX) / HEART.sx;
  const v = (HEART.cy - y) / HEART.sy;
  const w = v + 0.28 * Math.exp(-((u / 0.32) ** 2));
  return (u * u + w * w - 1) ** 3 - u * u * w ** 3 <= 0;
}

const STAR = { cx: CX, cy: 40, outer: 35, inner: 17 };
const STAR_CORNERS: Pt[] = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 === 0 ? STAR.outer : STAR.inner;
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  return [STAR.cx + r * Math.cos(a), STAR.cy + r * Math.sin(a)];
});
function inStar(x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = STAR_CORNERS.length - 1; i < STAR_CORNERS.length; j = i++) {
    const [xi, yi] = STAR_CORNERS[i];
    const [xj, yj] = STAR_CORNERS[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Pine: five tiers, widest at the bottom, each a skirt of fronds fanning from
 * its tip: lit on the left, dark grooves between fronds, a dark underside,
 * and each tier in the shadow of the one above.
 */
function pineField(k: number): Field {
  const f = newField(2 + 0.9 * k, [1.5, 0.75]);
  const T = (y: number) => GROUND + (y - GROUND) * k;
  const tiers = [0, 1, 2, 3, 4].map((i) => {
    const top = T(6 + i * 11);
    const height = (18 + i * 2.5) * k;
    const halfW = (8 + i * 5.6) * k;
    const fronds = 3 + i;
    const frondAt = (side: number) => ((side + 1) / 2) * fronds;
    const bottomAt = (x: number) => {
      const u = frondAt((x - CX) / halfW);
      const tip = 1 - Math.abs((u - Math.floor(u)) * 2 - 1);
      return top + height + (Math.abs(x - CX) / halfW) * 3 * k + (tip - 0.5) * Math.max(1, 3 * k);
    };
    return { top, height, halfW, frondAt, bottomAt };
  });
  for (let y = 0; y < GROUND; y++) {
    for (let x = 0; x < W; x++) {
      const c = cellAt(x, y, f.cell, f.stretch);
      const jag = (hash(c.i, c.j, 5) - 0.5) * (1 + 1.4 * k);
      for (let i = 0; i < tiers.length; i++) {
        const s = tiers[i];
        const w = s.halfW * Math.min(1, (y - s.top) / s.height);
        if (y < s.top || y > s.bottomAt(x) + jag * 0.6 || Math.abs(x - CX) > w + 0.5 + jag) continue;
        const side = Math.max(-1, Math.min(1, (x - CX) / Math.max(0.5, w)));
        const deep = (y - s.top) / s.height;
        const u = s.frondAt(side);
        const frac = u - Math.floor(u);
        let v = 0.7 - 0.36 * side - 0.3 * deep * deep + 0.12 * (1 - i / 4);
        if (s.bottomAt(x) - y < Math.max(1.2, 2.2 * k)) v -= 0.2;
        if (deep > 0.35 && (frac < 0.1 || frac > 0.92) && k > 0.4) v -= 0.16;
        const above = i > 0 ? tiers[i - 1].bottomAt(x) : -Infinity;
        if (y > above && y - above < 3.2 * k) v -= 0.24;
        f.inside[y][x] = true;
        f.light[y][x] = v;
        break;
      }
    }
  }
  return f;
}

/**
 * Willow: strands hanging from under the dome, two or three columns wide with
 * a gap between, swaying a little, a leaf poking out every few rows, thinning
 * at the tip. Short in the middle so the trunk shows. In the dome's shade.
 */
function addCurtain(f: Field, lobes: Lobe[], k: number, R: Rng): void {
  f.stretch = [1, 2.6];
  const hang = grid(false);
  f.hang = hang;
  const half = Math.max(...lobes.map((l) => Math.abs(l.x - CX) + l.r));
  const bottoms = Array.from({ length: W }, (_, x) => {
    for (let y = GROUND - 1; y >= 0; y--) if (f.inside[y][x]) return y;
    return -1;
  });
  const mark = (x: number, y: number, i: number, len: number) => {
    if (x < 0 || x >= W || y >= GROUND - 3 || (f.inside[y][x] && !hang[y][x])) return;
    f.inside[y][x] = true;
    hang[y][x] = true;
    f.light[y][x] = 0.58 - (0.3 * (x - CX)) / half - (0.22 * i) / len - (i < 3 ? 0.18 : 0);
  };
  for (let x = 1; x < W; ) {
    const width = R() < 0.4 ? 3 : 2;
    const middle = Math.abs(x - CX) < 8 * k;
    const len = Math.round((middle ? 2 + R() * 4 : 9 + R() * 24) * k);
    const phase = R() * 6;
    const tops = bottoms.slice(x, x + width).filter((b) => b >= 0);
    if (tops.length === width) {
      const start = Math.min(...tops);
      for (let i = 1; i <= len + (Math.max(...tops) - start); i++) {
        const y = start + i;
        const sway = Math.round(Math.sin(y / 6 + phase) * 0.8 * Math.min(1, i / 6));
        const tip = i > len - 3;
        for (let j = tip ? 1 : 0; j < (tip ? 2 : width); j++) mark(x + j + sway, y, i, len);
        if (i % 3 === 0 && !tip && hash(x, y, 91) < 0.7) mark(hash(x, y, 92) < 0.5 ? x - 1 + sway : x + width + sway, y, i, len);
      }
    }
    x += width + 1 + (R() < 0.3 ? 1 : 0);
  }
}

/** Paint a canopy in leaf clusters: each cluster shifts the light a little, and is lit on its own top left. */
function paintCanopy(px: PixelGrid, f: Field, leaf: Ramp): void {
  const ins = (x: number, y: number) => f.inside[y]?.[x] ?? false;
  const stretch = Math.hypot(f.stretch[0], f.stretch[1]) / Math.SQRT2;
  for (let y = 0; y < GROUND; y++) {
    for (let x = 0; x < W; x++) {
      if (!f.inside[y][x]) continue;
      const c = cellAt(x, y, f.cell, f.stretch);
      const hole = hash(c.i, c.j, 31);
      if (hole < 0.05 && x === Math.round(c.x) && (y === Math.round(c.y) || (hole < 0.02 && y === Math.round(c.y) + 1))) {
        if (ins(x - 2, y) && ins(x + 2, y) && ins(x, y - 2) && ins(x, y + 3)) continue;
      }
      let v = f.light[y][x] + 0.34 * (hash(c.i, c.j, 21) - 0.5) + (0.22 * ((x - c.x) * LX + (y - c.y) * LY)) / (f.cell * stretch);
      if (!ins(x, y + 1)) v -= 0.12;
      if (!ins(x, y - 1) && x < CX + 6) v += 0.08;
      px[y][x] = leaf[toneOf(v)];
    }
  }
  // A few stray leaves just off the edge, faint against the sky.
  for (let y = 1; y < GROUND - 3; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (f.inside[y][x] || hash(x, y, 51) > 0.07) continue;
      if (NEIGHBOURS.some(([dx, dy]) => f.hang?.[y + dy]?.[x + dx])) continue;
      if (NEIGHBOURS.some(([dx, dy]) => ins(x + dx, y + dy))) px[y][x] = leaf.ghost;
    }
  }
}

function toneOf(v: number): Tone {
  return v < 0.2 ? "deep" : v < 0.38 ? "dark" : v < 0.56 ? "mid" : v < 0.76 ? "light" : "hi";
}

/** The canopy's shadow on the grass, as wide as the canopy, darkest near the trunk. */
function drawGroundShadow(px: PixelGrid, f: Field): void {
  let left = W;
  let right = 0;
  f.inside.forEach((row) => row.forEach((on, x) => on && ((left = Math.min(left, x)), (right = Math.max(right, x)))));
  if (left > right) return;
  const half = ((right - left) / 2) * 0.85;
  const mid = (left + right) / 2 + 2;
  for (let x = Math.round(mid - half); x <= Math.round(mid + half); x++) {
    const t = Math.abs(x - mid) / half;
    put(px, x, GROUND, t < 0.45 ? COLOR.grassMid : COLOR.grassShade);
    if (t < 0.7) put(px, x, GROUND + 1, COLOR.grassMid);
  }
}

/** Where the trunk's middle is at row y: it leans a little to the right as it rises. */
function trunkX(y: number, k: number, top: number): number {
  const t = clamp01((y - top) / (GROUND - top));
  return CX + k * (2.2 * (1 - t) - 1.6 * t) + Math.sin(t * Math.PI) * 0.8 * k;
}

/** A branch from p0 to p1, tapering, lit on its upper side. */
function drawBranch(px: PixelGrid, [x0, y0]: Pt, [x1, y1]: Pt, t0: number, t1: number, bark: Ramp): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.ceil(len * 2));
  const nx = -(y1 - y0) / (len || 1);
  const ny = (x1 - x0) / (len || 1);
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const t = t0 + (t1 - t0) * f;
    const cx = x0 + (x1 - x0) * f;
    const cy = y0 + (y1 - y0) * f;
    for (let o = -t / 2; o <= t / 2; o += 0.5) {
      const up = ny * o < 0 || (ny === 0 && nx * o < 0);
      const tone = Math.abs(o) < t / 2 - 0.9 ? bark.mid : up ? bark.light : bark.dark;
      put(px, cx + nx * o, cy + ny * o, tone);
    }
  }
}

/** A tapered, leaning trunk with a root flare: lit on the left, in the canopy's shadow at the top, with bark texture. */
function drawTrunk(px: PixelGrid, k: number, top: number, bark: Ramp, f: Field): void {
  const pale = hexToHsl(bark.mid)[2] > 0.66;
  const flareRows = Math.max(2, 6 * k);
  const span = GROUND - top;
  for (let y = Math.round(top); y < GROUND; y++) {
    const t = (y - top) / span;
    const fl = Math.max(0, y - (GROUND - flareRows)) / flareRows;
    const half = (2.8 + 1.5 * t) * k + 0.8 + fl * fl * 4.5 * k;
    const mid = trunkX(y, k, top);
    const left = Math.round(mid - half);
    const right = Math.round(mid + half);
    for (let x = left; x <= right; x++) {
      const rel = (x - left) / Math.max(1, right - left);
      let v = 0.86 - rel * 0.78;
      if (k > 0.5) {
        if (pale) {
          // Pale bark: short dark bands across it, like birch.
          const c = cellAt(x, y, 2, [1.8, 0.7]);
          if (hash(c.i, c.j, 71) < 0.24 && rel > 0.1) v -= 0.5;
        } else {
          // Dark bark: long cracks running down it.
          const c = cellAt(x, y, 2, [0.8, 2.6]);
          v += (hash(c.i, c.j, 71) - 0.5) * 0.36;
        }
      }
      for (let d = 1; d <= 4; d++) if (f.inside[y - d]?.[x]) v -= 0.08;
      const tone: Tone = v < 0.14 ? "deep" : v < 0.36 ? "dark" : v < 0.66 ? "mid" : "light";
      put(px, x, y, bark[tone]);
    }
  }
}

/** Grass blades in front of the trunk's foot. */
function drawTufts(px: PixelGrid, k: number): void {
  const reach = Math.round(9 * k + 3);
  for (let x = CX - reach; x <= CX + reach; x++) {
    const h = hash(x, 5, 81);
    if (h < 0.45) continue;
    put(px, x, GROUND - 1, h > 0.8 ? COLOR.grassHi : COLOR.grass);
    if (h > 0.88 && k > 0.5) put(px, x, GROUND - 2, COLOR.grassHi);
  }
}

/** Stage 6 fruit or stage 7 flowers, on the canopy, clear of its edge. */
function drawBlossoms(px: PixelGrid, look: Look, flowers: boolean, k: number, f: Field, R: Rng): void {
  const want = Math.round((flowers ? 24 : 9) * Math.max(0.5, k));
  const placed: Pt[] = [];
  const [hi, centre, petal] = look.bloom;
  const fruitLo = shift(centre, 330, 10, (l) => l * 0.72, 1.05);
  const tone: Record<string, string> = { p: petal, h: mix(petal, hi, 0.5), c: centre, s: look.bloomLo, f: centre, F: fruitLo, H: hi };
  const ins = (x: number, y: number) => f.inside[y]?.[x] ?? false;
  for (let tries = 0; placed.length < want && tries < 900; tries++) {
    const x = Math.round(6 + R() * 84);
    const y = Math.round(4 + R() * 84);
    if (![[-2, 0], [2, 0], [0, -2], [0, 3], [0, 0]].every(([dx, dy]) => ins(x + dx, y + dy))) continue;
    if (placed.some(([px, py]) => Math.abs(px - x) < 4 && Math.abs(py - y) < 4)) continue;
    placed.push([x, y]);
    const rows = flowers ? BLOSSOMS[Math.floor(R() * BLOSSOMS.length)] : FRUIT;
    const o = Math.floor((rows.length - 1) / 2);
    const mine = new Set<string>();
    rows.forEach((row, r) =>
      [...row].forEach((ch, q) => {
        if (ch === ".") return;
        put(px, x + q - o, y + r - o, tone[ch]);
        mine.add(`${x + q - o},${y + r - o}`);
      }),
    );
    // A soft shadow on the leaves below and to the right.
    for (const key of mine) {
      const [mx, my] = key.split(",").map(Number);
      const spots: Pt[] = flowers ? [[1, 1]] : [[0, 1], [1, 0]];
      for (const [dx, dy] of spots) if (!mine.has(`${mx + dx},${my + dy}`) && ins(mx + dx, my + dy)) put(px, mx + dx, my + dy, look.leaf.deep);
    }
    if (!flowers) put(px, x + 1 - o, y - 1 - o, look.leaf.deep);
  }
}

// ---------------------------------------------------------------- roots

function drawRoots(px: PixelGrid, stage: number, count: number, recent: number): void {
  const tree = stage > ZOOM_LAST_STAGE;
  const k = TREE_SCALE[tree ? stage : ZOOM_LAST_STAGE + 1];
  const top = tree ? GROUND + 4 : GROUND + (seedY(stage) + 4 - GROUND) * ZOOM - 1;
  const reach = 0.4 + 0.6 * k;
  const thick = tree ? Math.max(2, Math.round(3 * k)) : 2;
  const crown = tree ? drawRootCrown(px, k) : null;
  const tips: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const p = rootSlot(i);
    const R = rng(3 + i);
    // From the crown's edge: the outer roots leave high and sideways, the middle ones low and down.
    const from: Pt = crown
      ? [CX + (p - 0.5) * 2 * crown.half * 0.8, crown.top + crown.depth * (0.25 + 0.75 * (1 - Math.abs(p - 0.5) * 2))]
      : [CX + (p - 0.5) * 10, top];
    const ends = growRoot(px, R, from, Math.PI * (0.06 + 0.88 * p), (20 + R() * 10) * reach, 0, thick);
    if (i >= count - recent) tips.push(...ends);
  }
  for (const [x, y] of tips) {
    put(px, x, y, PALETTE.f);
    for (const [dx, dy] of NEIGHBOURS) put(px, x + dx, y + dy, PALETTE.y);
  }
}

/** Under a tree: the trunk's base carried on into the soil, narrowing, lit on the left. */
function drawRootCrown(px: PixelGrid, k: number): { top: number; depth: number; half: number } {
  const top = GROUND + 3;
  const depth = Math.max(3, Math.round(5 * k));
  const half = 8 * k + 1;
  for (let i = 0; i < depth; i++) {
    const f = i / depth;
    const h = Math.max(1, half * (1 - f) ** 1.6 * 0.85 + 1.5 * k);
    for (let x = Math.round(CX - h); x <= Math.round(CX + h); x++) {
      const rel = (x - (CX - h)) / (2 * h);
      put(px, x, top + i, rel < 0.2 ? COLOR.rootHi : rel > 0.6 ? COLOR.rootLo : COLOR.root);
    }
  }
  return { top, depth, half };
}

function rootSlot(i: number): number {
  let p = 0;
  for (let n = i + 1, f = 0.5; n > 0; n >>= 1, f /= 2) if (n & 1) p += f;
  return p;
}

/** A wandering root, thick at its base and thinning to its tips: lit along its upper edge. Returns its tips. */
function growRoot(px: PixelGrid, R: Rng, [x0, y0]: Pt, ang0: number, len: number, depth: number, thick: number): Pt[] {
  let x = x0;
  let y = y0;
  let ang = ang0;
  for (let i = 0; i < len; i++) {
    const nx = x + Math.cos(ang);
    const ny = y + Math.sin(ang);
    ang += (R() - 0.5) * 0.22;
    if (ny >= H - 2 || ny < GROUND + 4) break;
    x = nx;
    y = ny;
    const t = Math.max(1, Math.round(thick * (1 - (0.5 * i) / len)));
    const ox = -Math.sin(ang);
    const oy = Math.cos(ang);
    for (let o = 0; o < t; o++) {
      const off = o - (t - 1) / 2;
      const c = t === 1 ? COLOR.root : o === 0 ? COLOR.rootHi : o === t - 1 ? COLOR.rootLo : COLOR.root;
      put(px, x + ox * off, y + oy * off, c);
    }
  }
  if (depth >= 1) return [[x, y]];
  // One fork at the end: the root goes on, and a shorter side root splits off.
  const side = R() < 0.5 ? -1 : 1;
  const next = Math.max(1, thick - 1);
  return [
    ...growRoot(px, R, [x, y], ang - side * 0.25, len * 0.7, depth + 1, next),
    ...growRoot(px, R, [x, y], ang + side * 0.7, len * 0.45, depth + 1, 1),
  ];
}
