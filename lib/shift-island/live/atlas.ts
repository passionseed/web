/**
 * Every island sprite (the bot's SPRITES plus the web's MOTION_SPRITES)
 * decoded once into one RGBA atlas per light phase, with the phase's multiply
 * applied to the palette. Lantern glow, lamp light, festoon bulbs, the
 * campfire's flame and embers, the goal's lit bulbs, the finished stage's
 * lights and the caller's pin stay untinted, so they read as lit at night. Mirrored copies
 * of everything but ground tiles sit beside the originals, so a boat sailing
 * left is one plain drawImage.
 *
 * Pure: buildAtlasData returns bytes; uploading them to a canvas (once, at
 * init or on a phase change) is the caller's job.
 */
import { MOTION_SPRITES } from "@/bot/assets/island/motion-sprites";
import { PALETTE, SPRITES } from "@/bot/assets/island/sprites";

import { styleKey } from "@/bot/src/quests/island/tree";
import { mapTreeColor, type TreeStyle } from "@/lib/shift-island/tree-style";

import { crowdSprites } from "./crowdSprites";
import { paletteRgb, tint, type RGB } from "./lighting";
import type { LightPhase } from "./types";

export interface AtlasRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AtlasData {
  phase: LightPhase;
  width: number;
  height: number;
  /** RGBA, row-major, width * height * 4. */
  data: Uint8ClampedArray;
  rects: ReadonlyMap<string, AtlasRect>;
  /** Mirrored copies (left to right). Ground tiles have none. */
  flipped: ReadonlyMap<string, AtlasRect>;
}

/** Drawn as is in every phase: the pin, glows, the campfire's flame and the goal's lit bulbs. */
const UNTINTED = new Set([
  "marker",
  "lantern_glow_0",
  "lantern_glow_1",
  "campfire_flame_0",
  "campfire_flame_1",
  "campfire_flame_2",
  "goal_bulb",
]);
/** Palette keys that stay untinted in these sprites: their light. */
const LIT_KEYS: Readonly<Record<string, string>> = {
  lantern: "yif",
  lamp_post: "yif",
  festoon: "yifrp",
  campfire_pit: "yi",
  fest_stage_3: "y",
};

/** Ground tiles are never mirrored. */
const GROUND = /^(water|shore|sand|grass|path|plaza)/;

const ATLAS_WIDTH = 512;
/** Empty pixels around each sprite, so neighbours never bleed into each other. */
const PAD = 1;

/** Every sprite the live island can draw, by name: SPRITES, then MOTION_SPRITES and the plaza's crowd, never shadowing it. */
export function allSprites(): Record<string, string[]> {
  const out: Record<string, string[]> = { ...SPRITES };
  for (const [name, rows] of Object.entries(MOTION_SPRITES)) if (!(name in out)) out[name] = rows;
  for (const [name, rows] of Object.entries(crowdSprites())) if (!(name in out)) out[name] = rows;
  return out;
}

/** The tree sprites a style recolours: the stages, their sway frames and the planted seed. */
const TREE_SPRITE = /^stage_(\d|seed)(_b)?$/;

export { styleKey };

/** The atlas name of a tree sprite as drawn: its own, or the recoloured copy for a style. */
export function treeSpriteKey(sprite: string, style?: TreeStyle): string {
  return style ? `${sprite}|${styleKey(style)}` : sprite;
}

/** The distinct styles a scene's trees use, in first-seen order. */
export function stylesOf(trees: readonly { style?: TreeStyle }[]): TreeStyle[] {
  const seen = new Map<string, TreeStyle>();
  for (const t of trees) if (t.style && !seen.has(styleKey(t.style))) seen.set(styleKey(t.style), t.style);
  return [...seen.values()];
}

interface Placed {
  name: string;
  /** The style this copy of a tree sprite is recoloured with. */
  style?: TreeStyle;
  rows: string[];
  w: number;
  h: number;
  x: number;
  y: number;
  flip: boolean;
}

/** Shelf packing, tallest first; the same input always packs the same way, in every phase. */
function pack(sprites: Record<string, string[]>, styles: readonly TreeStyle[]): { placed: Placed[]; height: number } {
  const items: Omit<Placed, "x" | "y">[] = [];
  for (const name of Object.keys(sprites).sort()) {
    const rows = sprites[name];
    if (!rows?.length || !rows[0].length) continue;
    const w = rows[0].length;
    const h = rows.length;
    items.push({ name, rows, w, h, flip: false });
    if (!GROUND.test(name)) items.push({ name, rows, w, h, flip: true });
    if (TREE_SPRITE.test(name)) {
      for (const style of styles) {
        items.push({ name: treeSpriteKey(name, style), style, rows, w, h, flip: false });
        items.push({ name: treeSpriteKey(name, style), style, rows, w, h, flip: true });
      }
    }
  }
  items.sort((a, b) => b.h - a.h || b.w - a.w || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) || Number(a.flip) - Number(b.flip));
  const placed: Placed[] = [];
  let x = 0;
  let y = 0;
  let shelf = 0;
  for (const item of items) {
    if (x + item.w + PAD > ATLAS_WIDTH) {
      x = 0;
      y += shelf + PAD;
      shelf = 0;
    }
    placed.push({ ...item, x, y });
    x += item.w + PAD;
    shelf = Math.max(shelf, item.h);
  }
  return { placed, height: y + shelf };
}

/** Palette colours by char code, as RGBA words (little-endian), tinted and as by day; 0 is transparent. */
function colourTables(phase: LightPhase): { tinted: Uint32Array; day: Uint32Array } {
  const tinted = new Uint32Array(128);
  const day = new Uint32Array(128);
  for (const key of Object.keys(PALETTE)) {
    const rgb = paletteRgb(key);
    const code = key.charCodeAt(0);
    if (!rgb || key.length !== 1 || code >= 128) continue;
    day[code] = word(rgb);
    tinted[code] = word(tint(rgb, phase));
  }
  return { tinted, day };
}

const word = ([r, g, b]: RGB) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;

function hexRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

/** The atlas for one phase. Day is the identity: its pixels are the palette's own. */
export function buildAtlasData(phase: LightPhase, sprites: Record<string, string[]> = allSprites(), styles: readonly TreeStyle[] = []): AtlasData {
  const { placed, height } = pack(sprites, styles);
  const width = ATLAS_WIDTH;
  const rowsTall = Math.max(1, height);
  const data = new Uint8ClampedArray(width * rowsTall * 4);
  // Uint32 writes are RGBA in memory on little-endian machines (every browser this runs on).
  const words = new Uint32Array(data.buffer);
  const { tinted, day } = colourTables(phase);
  const rects = new Map<string, AtlasRect>();
  const flipped = new Map<string, AtlasRect>();
  for (const item of placed) {
    let table = tinted;
    let lit: Uint32Array | null = null;
    if (UNTINTED.has(item.name)) table = day;
    else if (LIT_KEYS[item.name]) {
      lit = tinted.slice();
      for (const ch of LIT_KEYS[item.name]) lit[ch.charCodeAt(0)] = day[ch.charCodeAt(0)];
      table = lit;
    }
    for (let j = 0; j < item.h; j++) {
      const row = item.rows[j];
      const base = (item.y + j) * width + item.x;
      for (let i = 0; i < item.w; i++) {
        const ch = row[item.flip ? item.w - 1 - i : i];
        const code = ch.charCodeAt(0);
        const override = item.style ? mapTreeColor(item.style, ch, j) : null;
        const rgb = override ? hexRgb(override) : null;
        const v = rgb ? word(tint(rgb, phase)) : code < 128 ? table[code] : 0;
        if (v !== 0) words[base + i] = v;
      }
    }
    (item.flip ? flipped : rects).set(item.name, { x: item.x, y: item.y, w: item.w, h: item.h });
  }
  return { phase, width, height: rowsTall, data, rects, flipped };
}
