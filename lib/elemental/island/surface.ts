/**
 * The Elemental compositor's drawing surface: packed RGBA pixels at scale 1
 * and the sprites it draws, decoded once from SHIFT's island art (read-only)
 * and Elemental's own (bot/assets/elemental/sprites.ts).
 *
 * Kept apart from render.ts so healing.ts (E25) can draw on the same surface
 * without an import cycle. Pure and deterministic; no fonts.
 */
import { ELEMENTAL_PALETTE, ELEMENTAL_SPRITES } from "../../../bot/assets/elemental/sprites";
import { PALETTE, SPRITES } from "../../../bot/assets/island/sprites";
import { RenderError } from "../../../bot/src/quests/island/scene";

export type RGBA = readonly [number, number, number, number];

/** Little-endian RGBA packed into one 32-bit word, as a Uint32Array over RGBA bytes stores it (SHIFT's packing). */
export function pack(c: RGBA): number {
  return ((c[3] << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
}

/** "#rrggbb" (or "#rrggbbaa") to RGBA; null when it is not a hex colour. */
export function hexRgba(hex: string): RGBA | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16), m[4] ? parseInt(m[4], 16) : 255] : null;
}

/** A decoded sprite: packed pixels, 0 is transparent. */
export interface Bitmap {
  w: number;
  h: number;
  px: Uint32Array;
}

const bitmaps = new Map<string, Bitmap>();

function decode(rows: readonly string[], palette: Readonly<Record<string, string>>): Bitmap {
  const w = rows[0].length;
  const px = new Uint32Array(w * rows.length);
  rows.forEach((row, j) => {
    for (let i = 0; i < w; i++) {
      const ch = row[i];
      if (ch === "." || ch === " ") continue;
      const c = palette[ch] ? hexRgba(palette[ch]) : null;
      if (c) px[j * w + i] = pack(c);
    }
  });
  return { w, h: rows.length, px };
}

/** The rows of a sprite: Elemental's own first, then SHIFT's island art. */
function spriteRows(name: string): { rows: readonly string[]; palette: Readonly<Record<string, string>> } | null {
  const own = Object.prototype.hasOwnProperty.call(ELEMENTAL_SPRITES, name) ? ELEMENTAL_SPRITES[name] : undefined;
  if (own?.length) return { rows: own, palette: ELEMENTAL_PALETTE };
  const shift = Object.prototype.hasOwnProperty.call(SPRITES, name) ? SPRITES[name] : undefined;
  if (shift?.length) return { rows: shift, palette: PALETTE };
  return null;
}

/** A sprite decoded once. Throws RenderError("missing_sprite") for an unknown name. */
export function bitmap(name: string): Bitmap {
  const cached = bitmaps.get(name);
  if (cached) return cached;
  const found = spriteRows(name);
  if (!found) throw new RenderError("missing_sprite", name);
  const value = decode(found.rows, found.palette);
  bitmaps.set(name, value);
  return value;
}

/** A sprite's size in native pixels (Elemental's or SHIFT's). */
export function spriteBox(name: string): { w: number; h: number } {
  const { w, h } = bitmap(name);
  return { w, h };
}

/** An RGBA canvas at scale 1. Writes outside it are dropped. */
export class Surface {
  readonly px: Uint32Array;
  /** The same pixels as bytes, for blending. */
  readonly bytes: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number
  ) {
    this.px = new Uint32Array(width * height);
    this.bytes = new Uint8Array(this.px.buffer);
  }

  /** One pixel; an alpha below 255 blends over what is there, as SHIFT's canvas does. */
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

  /** Draws a sprite with its top-left at (x, y), at scale 1. */
  sprite(name: string, x: number, y: number): void {
    const b = bitmap(name);
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
  }
}
