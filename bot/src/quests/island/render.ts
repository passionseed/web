/**
 * Draws SHIFT Island as a PNG from the island map (shift_quest_island_map).
 *
 * Pure JavaScript: sprites are pixel matrices (bot/assets/island/sprites.ts),
 * composited into an RGBA buffer and encoded as PNG with Node's own zlib. No
 * dependencies, no native modules, no fonts: plots carry pixel-digit number
 * markers and every name is listed in the message text, where Discord renders
 * Thai properly.
 *
 * What to draw and where comes from buildScene (./scene, pure and shared with
 * the website's live island); this module only rasterizes that scene, in its
 * order, and encodes it. Stable and deterministic: the same map always
 * produces the same pixels, so tests can pin them.
 */
import { deflateSync } from "node:zlib";

import { PALETTE, SPRITES } from "../../../assets/island/sprites";

import { DIGITS, MAX_WIDTH, RenderError, TILE_BY_CODE, buildScene, markerAt, type IslandPlot, type SceneRect } from "./scene";

export * from "./scene";

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

/** A plot number: 3 x 5 pixel digits on a dark tag (from tagRect), each digit pixel g x g. */
function drawNumber(c: Canvas, n: number, tag: SceneRect, g: number): void {
  const text = String(n);
  const { x: x0, y: y0, w, h } = tag;
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

/** Output upscale: the largest allowed one that keeps the image within MAX_WIDTH. */
function scaleFor(width: number, requested: number | undefined): number {
  let scale = Math.min(Math.max(Math.floor(requested ?? 2), 1), 4);
  while (scale > 1 && width * scale > MAX_WIDTH) scale--;
  return scale;
}

/**
 * Renders the island: rasterizes buildScene() in its order (tiles, helper
 * paths, well, bunting, boat, each tree with its key, visitor and lantern,
 * every tag on top so no tree hides a neighbour's number, then the caller's
 * pin). Each plot sits at its slot's fixed spot and carries its slot number;
 * the island is sized from the highest slot drawn, so archived slots leave a
 * gap instead of shifting anyone. Throws RenderError.
 */
export function renderIsland(plots: IslandPlot[], options: RenderOptions = {}): RenderedIsland {
  const scene = buildScene(plots, { markMine: options.markMine, festival: options.festival });
  const { cols, rows, tile } = scene;
  const scale = scaleFor(scene.width, options.scale);

  const canvas = new Canvas(scene.width, scene.height);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) canvas.sprite(TILE_BY_CODE[scene.tiles[y * cols + x]], x * tile, y * tile);
  }
  for (const cell of scene.paths) canvas.sprite("path", (cell % cols) * tile, Math.floor(cell / cols) * tile);
  canvas.sprite("well", scene.well.x, scene.well.y);
  if (scene.banner) canvas.sprite("banner", scene.banner.x, scene.banner.y);
  canvas.sprite("boat", scene.boatStill.x, scene.boatStill.y);

  // Trees first, then every tag on top, so no tree hides a neighbour's number.
  for (const tree of scene.trees) {
    canvas.sprite(tree.sprite, tree.left, tree.top);
    if (tree.key) canvas.sprite("key_flag", tree.key.x, tree.key.y);
    if (tree.visitor) canvas.sprite("visitor", tree.visitor.x, tree.visitor.y);
    if (tree.lantern) canvas.sprite("lantern", tree.lantern.x, tree.lantern.y);
  }
  const numbers = new Map<number, number>();
  for (const tag of scene.tags) {
    numbers.set(tag.slot, tag.slot);
    drawNumber(canvas, tag.slot, tag, scene.glyph);
  }
  if (options.markMine) {
    // Every plot marked as the caller's gets a pin; the scene keeps the first one for the web.
    for (const tree of scene.trees) {
      if (!tree.mine) continue;
      const pin = markerAt(tree, scene.glyph);
      canvas.sprite("marker", pin.x, pin.y, pin.scale);
    }
  }

  return { png: canvas.scaled(scale), width: canvas.width * scale, height: canvas.height * scale, scale, numbers };
}
