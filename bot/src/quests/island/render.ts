/**
 * Draws SHIFT Island as a PNG from the island map (shift_quest_island_map).
 *
 * Pure JavaScript: sprites are pixel matrices (bot/assets/island/sprites.ts),
 * composited into an RGBA buffer and encoded as PNG with Node's own zlib. No
 * dependencies, no native modules, no fonts: plots carry pixel-digit number
 * markers and every name is listed in the message text, where Discord renders
 * Thai properly.
 *
 * Stable: every slot has one fixed spot, measured from the plaza, on a
 * lattice whose order never depends on how many plots exist. The plot number
 * on the image is the slot itself. Adding, archiving or reordering plots never
 * moves or renumbers another tree; the island only grows around them.
 *
 * Deterministic: the same map always produces the same pixels, so tests can
 * pin them.
 */
import { deflateSync } from "node:zlib";

import { PALETTE, SPRITES } from "../../../assets/island/sprites";

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
}

export interface RenderOptions {
  /** Largest integer upscale to use (default 2). Big islands drop to 1 to stay under the width cap. */
  scale?: number;
  /** Draw a pin over the caller's plot. */
  markMine?: boolean;
  /** Festival bunting over the plaza while a season runs. */
  festival?: boolean;
}

export interface RenderedIsland {
  png: Buffer;
  width: number;
  height: number;
  /** The upscale actually used. */
  scale: number;
  /** Plot number shown on the image for each slot: the slot itself. */
  numbers: Map<number, number>;
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

const TILE = 16;
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

type RGBA = [number, number, number, number];

const colorCache = new Map<string, RGBA>();
function rgba(ch: string): RGBA | null {
  if (ch === "." || ch === " ") return null;
  const cached = colorCache.get(ch);
  if (cached) return cached;
  const hex = PALETTE[ch];
  if (!hex) return null;
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(hex);
  if (!m) return null;
  const value: RGBA = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16), m[4] ? parseInt(m[4], 16) : 255];
  colorCache.set(ch, value);
  return value;
}

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

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/** A truecolour (RGB, 8-bit) PNG from packed RGBA pixels; deterministic bytes. */
export function encodePng(px: Uint32Array, width: number, height: number): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none (pixel art deflates well without one)
    for (let x = 0; x < width; x++) {
      const v = px[y * width + x];
      raw[o++] = v & 0xff;
      raw[o++] = (v >>> 8) & 0xff;
      raw[o++] = (v >>> 16) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    // Level 6: a sixth of level 9's time on a 200-plot island for about 14% more bytes.
    chunk("IDAT", deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Little-endian RGBA packed into one 32-bit word, as a Uint32Array over RGBA bytes stores it. */
function pack(c: RGBA): number {
  return ((c[3] << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
}

interface Bitmap {
  rows: string[];
  w: number;
  h: number;
  /** Packed pixels; 0 is transparent. */
  px: Uint32Array;
}

/** Sprites decoded once into packed pixels, so drawing is one write per pixel. */
const bitmaps = new Map<string, Bitmap>();
function bitmap(name: string): Bitmap {
  const rows = SPRITES[name];
  if (!rows?.length) throw new RenderError("missing_sprite", name);
  const cached = bitmaps.get(name);
  if (cached && cached.rows === rows) return cached;
  const w = rows[0].length;
  const px = new Uint32Array(w * rows.length);
  rows.forEach((row, j) => {
    for (let i = 0; i < w; i++) {
      const c = rgba(row[i]);
      if (c) px[j * w + i] = pack(c);
    }
  });
  const value = { rows, w, h: rows.length, px };
  bitmaps.set(name, value);
  return value;
}

class Canvas {
  /** RGBA bytes, viewed as packed words for fast writes. */
  readonly bytes: Uint8Array;
  readonly px: Uint32Array;
  constructor(
    readonly width: number,
    readonly height: number
  ) {
    this.px = new Uint32Array(width * height);
    this.bytes = new Uint8Array(this.px.buffer);
  }

  pixel(x: number, y: number, c: RGBA): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const k = y * this.width + x;
    if (c[3] >= 255) {
      this.px[k] = pack(c);
      return;
    }
    const a = c[3] / 255;
    const i = k * 4;
    this.bytes[i] = Math.round(c[0] * a + this.bytes[i] * (1 - a));
    this.bytes[i + 1] = Math.round(c[1] * a + this.bytes[i + 1] * (1 - a));
    this.bytes[i + 2] = Math.round(c[2] * a + this.bytes[i + 2] * (1 - a));
    this.bytes[i + 3] = 255;
  }

  rect(x: number, y: number, w: number, h: number, c: RGBA): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.pixel(x + i, y + j, c);
  }

  /** Draws a sprite with its top-left at (x, y), each source pixel as a k x k block. */
  sprite(name: string, x: number, y: number, k = 1): void {
    const b = bitmap(name);
    if (k === 1) {
      for (let j = 0; j < b.h; j++) {
        const ty = y + j;
        if (ty < 0 || ty >= this.height) continue;
        const row = ty * this.width;
        for (let i = 0; i < b.w; i++) {
          const tx = x + i;
          const v = b.px[j * b.w + i];
          if (v !== 0 && tx >= 0 && tx < this.width) this.px[row + tx] = v;
        }
      }
      return;
    }
    for (let j = 0; j < b.h * k; j++) {
      const ty = y + j;
      if (ty < 0 || ty >= this.height) continue;
      const row = ty * this.width;
      const src = Math.floor(j / k) * b.w;
      for (let i = 0; i < b.w * k; i++) {
        const tx = x + i;
        const v = b.px[src + Math.floor(i / k)];
        if (v !== 0 && tx >= 0 && tx < this.width) this.px[row + tx] = v;
      }
    }
  }

  /** First row with a visible pixel: where the drawn shape actually starts. */
  inkTop(name: string): number {
    const top = bitmap(name).rows.findIndex((row) => /[^. ]/.test(row));
    return top < 0 ? 0 : top;
  }

  size(name: string): { w: number; h: number } {
    const b = bitmap(name);
    return { w: b.w, h: b.h };
  }

  /** Nearest-neighbour upscale: each source row is widened once, then copied. */
  scaled(scale: number): Buffer {
    const W = this.width * scale;
    const out = new Uint32Array(W * this.height * scale);
    for (let y = 0; y < this.height; y++) {
      const start = y * scale * W;
      const src = y * this.width;
      for (let x = 0; x < this.width; x++) out.fill(this.px[src + x], start + x * scale, start + x * scale + scale);
      for (let dy = 1; dy < scale; dy++) out.copyWithin(start + dy * W, start, start + W);
    }
    return encodePng(out, W, this.height * scale);
  }
}

const DIGITS = [
  "111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001",
  "111100111001111", "111100111101111", "111001010010010", "111101111101111", "111101111001111",
];

/** A plot number: 3 x 5 pixel digits on a dark tag, each digit pixel g x g, centred on (cx, cy). */
function drawNumber(c: Canvas, n: number, cx: number, cy: number, g: number): void {
  const text = String(n);
  const w = (text.length * 4 + 3) * g;
  const h = 9 * g;
  const x0 = cx - Math.floor(w / 2);
  // Top edge on the soil line: the tag never covers the tree above it.
  const y0 = cy;
  const ink: RGBA = [255, 255, 255, 255];
  c.rect(x0, y0, w, h, [24, 28, 38, 230]);
  [...text].forEach((d, k) => {
    const bits = DIGITS[Number(d)];
    for (let j = 0; j < 5; j++) {
      for (let i = 0; i < 3; i++) {
        if (bits[j * 3 + i] === "1") c.rect(x0 + (2 + k * 4 + i) * g, y0 + (2 + j) * g, g, g, ink);
      }
    }
  });
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

function tileName(layout: Layout, x: number, y: number): string {
  const { land, plaza, pcx, pcy } = layout;
  if (x >= plaza.x && x < plaza.x + plaza.w && y >= plaza.y && y < plaza.y + plaza.h) return "plaza";
  const n = noise(x - pcx + 1000, y - pcy + 1000);
  if (!land[y][x]) return n < 0.12 ? "water_b" : "water_a";
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

/** Output upscale: the largest allowed one that keeps the image within MAX_WIDTH. */
function scaleFor(cols: number, requested: number | undefined): number {
  let scale = Math.min(Math.max(Math.floor(requested ?? 2), 1), 4);
  while (scale > 1 && cols * TILE * scale > MAX_WIDTH) scale--;
  return scale;
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
 * for tests: the same function places plots in renderIsland.
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

/**
 * Renders the island. Each plot sits at its slot's fixed spot and carries its
 * slot number; the island is sized from the highest slot drawn, so archived
 * slots leave a gap instead of shifting anyone. Throws RenderError.
 */
export function renderIsland(plots: IslandPlot[], options: RenderOptions = {}): RenderedIsland {
  const spots = plotSpots(plots);
  // A plain plot is a slot only: the database already sends stage 0 and no
  // decorations for one; drawing it empty here too keeps that true for any input.
  const ordered = plots
    .map((p) => (p.plain ? { ...p, stage: 0, visitor: false, key: false, helper: false, lantern: false } : p))
    .sort((a, b) => a.slot - b.slot);
  const layout = layoutFor(ordered.length ? ordered[ordered.length - 1].slot : 0);
  const scale = scaleFor(layout.cols, options.scale);
  const glyph = glyphFor(layout.cols);

  const canvas = new Canvas(layout.cols * TILE, layout.rows * TILE);
  for (let y = 0; y < layout.rows; y++) {
    for (let x = 0; x < layout.cols; x++) canvas.sprite(tileName(layout, x, y), x * TILE, y * TILE);
  }

  const plazaCx = layout.pcx * TILE;
  const plazaCy = layout.pcy * TILE;
  /** Tile (in image tiles) of a spot's tree: left column and base row. */
  const at = (s: Spot) => ({ x: layout.pcx + s.x, y: layout.pcy + s.y });

  // Helper paths: along the row below the tree, then up the plaza column. Never over water.
  const { plaza } = layout;
  const path = (tx: number, ty: number) => {
    const onPlaza = tx >= plaza.x && tx < plaza.x + plaza.w && ty >= plaza.y && ty < plaza.y + plaza.h;
    if (layout.land[ty]?.[tx] && !onPlaza) canvas.sprite("path", tx * TILE, ty * TILE);
  };
  for (const plot of ordered) {
    if (!plot.helper) continue;
    const s = at(spots.get(plot.slot)!);
    const row = s.y + 1;
    const fromX = s.x + 1;
    const plazaCol = layout.pcx;
    const stepX = Math.sign(plazaCol - fromX);
    for (let x = fromX; stepX !== 0 && x !== plazaCol; x += stepX) path(x, row);
    const stepY = Math.sign(layout.pcy - row);
    for (let y = row; stepY !== 0 && Math.abs(y - layout.pcy) > 1; y += stepY) path(plazaCol, y);
  }

  const well = canvas.size("well");
  canvas.sprite("well", Math.round(plazaCx - well.w / 2), Math.round(plazaCy - well.h / 2));
  if (options.festival) {
    const banner = canvas.size("banner");
    canvas.sprite("banner", Math.round(plazaCx - banner.w / 2), plaza.y * TILE - banner.h + 4);
  }
  const boat = canvas.size("boat");
  canvas.sprite("boat", TILE * 2, canvas.height - TILE * 2 - boat.h);

  const placed = ordered.map((plot) => {
    const s = at(spots.get(plot.slot)!);
    const stage = `stage_${Math.min(Math.max(Math.round(plot.stage), 0), 7)}`;
    const size = canvas.size(stage);
    const left = s.x * TILE + TILE - Math.floor(size.w / 2);
    const top = (s.y + 1) * TILE - size.h;
    return { plot, stage, size, left, top };
  });

  // Trees first, then every tag on top, so no tree hides a neighbour's number.
  for (const { plot, stage, size, left, top } of placed) {
    canvas.sprite(stage, left, top);
    if (plot.key) canvas.sprite("key_flag", left - 6, top + size.h - 22);
    if (plot.visitor) canvas.sprite("visitor", left + size.w - 2, top + size.h - 18);
    if (plot.lantern) canvas.sprite("lantern", left + size.w + 6, top + size.h - 20);
  }
  const numbers = new Map<number, number>();
  for (const { plot, size, left, top } of placed) {
    numbers.set(plot.slot, plot.slot);
    drawNumber(canvas, plot.slot, left + Math.floor(size.w / 2), top + size.h, glyph);
  }
  if (options.markMine) {
    for (const { plot, stage, size, left, top } of placed) {
      if (!plot.mine) continue;
      const pin = canvas.size("marker");
      const w = pin.w * glyph;
      canvas.sprite("marker", left + Math.floor((size.w - w) / 2), top + canvas.inkTop(stage) - pin.h * glyph - 2, glyph);
    }
  }

  return { png: canvas.scaled(scale), width: canvas.width * scale, height: canvas.height * scale, scale, numbers };
}
