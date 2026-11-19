/**
 * The plots' signposts on the web island, in place of the bot's black number
 * tags: a small wooden post standing in front of each plot, its number
 * painted cream on a dark plank. A plot whose sign shows a name (the close
 * view only) gets a longer post with two short ropes under the plank, and the
 * name's board hangs from them: a DOM layer (PlotSigns), because the pixel
 * renderer has no fonts. Web only: the bot's PNG and GIF keep their tags.
 *
 * Palette-key sprites, so the atlas grades them with the rest of the island,
 * baked into the overlay layer once per scene, phase and view: nothing here
 * runs per frame. Pure and client-safe.
 */
import { DIGITS, type IslandScene, type SceneTree } from "@/bot/src/quests/island/scene";

import type { AtlasRect } from "./atlas";
import type { DrawContext } from "./draw";
import type { Rect } from "./geometry";
import type { LightPhase } from "./types";
import { gradeKey, rgbHex } from "./grade";

/** Palette keys: the plank's face and its lit top edge, the outline, the post, the ropes and the painted digits. */
const FACE = "b";
const LIP = "e";
const EDGE = "o";
const POST = "e";
const ROPE = "c";
const PAINT = "i";

/** The plank: an outline round a lit top edge, a padding row, the digits and another padding row. */
const PLANK_ROWS = 10;
/** Where the digits start inside the sprite: centred across the plank, under its lit edge and a row of wood. */
const digitX = (plank: number, digits: number) => (plank - (4 * digits - 1)) / 2;
const DIGIT_Y = 3;
/** Visible post under the plank, then the foot. */
const POST_ROWS = 2;

/**
 * A name's board, in native px: it hangs this far under the plank's top, is
 * this tall (outline, 8 rows of text, outline) and at most this wide (its
 * text as wide as the old plot signs' 96 CSS px at 2x).
 */
export const BOARD = { top: PLANK_ROWS + 2, h: 10, maxW: 56 } as const;

/** Rows of a signpost sprite: the plain one, and one with a name's board hanging under its plank. */
const PLAIN_ROWS = PLANK_ROWS + POST_ROWS + 1;
const HUNG_ROWS = BOARD.top + BOARD.h + POST_ROWS + 1;

/**
 * A plank wide enough for n digits (3 px each, 1 px apart), with 2 px of wood
 * each side inside its outline; one that carries a board is at least two
 * digits wide, so its ropes hang clear of the post.
 */
export const plankWidth = (digits: number, hung = false) => 4 * Math.max(digits, hung ? 2 : 1) + 5;

const spriteName = (digits: number, hung: boolean) => `signpost_${digits}${hung ? "_hung" : ""}`;
const digitName = (d: string) => `sign_digit_${d}`;

/** One signpost's sprite rows. */
function postRows(digits: number, hung: boolean): string[] {
  const w = plankWidth(digits, hung);
  const mid = (w - 1) / 2;
  const blank = ".".repeat(w);
  const at = (row: string, x: number, ink: string) => row.slice(0, x) + ink + row.slice(x + ink.length);
  const rim = "." + EDGE.repeat(w - 2) + ".";
  const rows = [rim, EDGE + LIP.repeat(w - 2) + EDGE];
  while (rows.length < PLANK_ROWS - 1) rows.push(EDGE + FACE.repeat(w - 2) + EDGE);
  rows.push(rim);
  const height = hung ? HUNG_ROWS : PLAIN_ROWS;
  while (rows.length < height - 1) {
    let row = at(blank, mid - 1, EDGE + POST + EDGE);
    // Two short ropes from the plank's ends down into the board's top edge.
    if (hung && rows.length < BOARD.top + 1) row = at(at(row, 1, ROPE), w - 2, ROPE);
    rows.push(row);
  }
  rows.push(at(blank, mid - 2, EDGE + FACE.repeat(3) + EDGE));
  return rows;
}

/** A 3 x 5 painted digit, from the bot's own digit shapes. */
function digitRows(d: number): string[] {
  const bits = DIGITS[d];
  return Array.from({ length: 5 }, (_, j) => [0, 1, 2].map((i) => (bits[j * 3 + i] === "1" ? PAINT : ".")).join(""));
}

let sprites: Readonly<Record<string, string[]>> | null = null;

/** Every signpost sprite (posts for 1 to 3 digits, plain and hung, and the ten digits), for the web's atlas. Built once. */
export function signSprites(): Readonly<Record<string, string[]>> {
  if (!sprites) {
    const out: Record<string, string[]> = {};
    for (const digits of [1, 2, 3]) {
      out[spriteName(digits, false)] = postRows(digits, false);
      out[spriteName(digits, true)] = postRows(digits, true);
    }
    for (let d = 0; d < 10; d++) out[digitName(String(d))] = digitRows(d);
    sprites = out;
  }
  return sprites;
}

export interface Signpost {
  slot: number;
  /** The post and plank's sprite, drawn at `unit` x from (x, y). */
  sprite: string;
  x: number;
  y: number;
  /** Native px per sprite pixel: 1 close up, wholeUnit on the whole island. */
  unit: number;
  /** The painted digits, each at its top-left corner. */
  digits: { sprite: string; x: number; y: number }[];
  /** Everything it covers, its shadow aside. */
  rect: Rect;
  /** Its contact shadow, before the sun's lean. */
  shadow: Rect;
  /** Where a name's board hangs: its centre line, its top edge and its narrowest width (the ropes' span); null without one. */
  hang: { cx: number; y: number; minW: number } | null;
}

export interface SignpostOptions {
  /** Native px per sprite pixel (default 1). */
  unit?: number;
  /** The slots whose sign shows a name: their post carries the board's ropes (unit 1 only). */
  hung?: readonly number[];
}

/**
 * How big the signposts stand on the whole island, where a native pixel is a
 * device pixel or less: as big as the bot's tags (its glyph), so a number
 * reads as well as the tag did, but never past 2x, where a post would reach
 * the next row's booth flags on the biggest islands.
 */
export const wholeUnit = (scene: Pick<IslandScene, "glyph">) => Math.min(2, Math.max(1, scene.glyph));

/**
 * A plot's signpost: centred under its tree like the bot's tag, its plank's
 * top one row under the soil mound (every tree sprite's last row is empty).
 */
export function signpostFor(tree: Pick<SceneTree, "slot" | "left" | "top" | "w" | "h">, unit = 1, hung = false): Signpost {
  const label = String(tree.slot);
  const digits = Math.min(3, label.length);
  const withBoard = hung && unit === 1;
  const w = plankWidth(digits, withBoard);
  const h = withBoard ? HUNG_ROWS : PLAIN_ROWS;
  const x = tree.left + Math.floor(tree.w / 2) - Math.floor((w * unit) / 2);
  const y = tree.top + tree.h;
  const mid = (w - 1) / 2;
  const foot = h - 1;
  const dx = digitX(w, digits);
  return {
    slot: tree.slot,
    sprite: spriteName(digits, withBoard),
    x,
    y,
    unit,
    digits: [...label.slice(0, 3)].map((d, k) => ({ sprite: digitName(d), x: x + (dx + 4 * k) * unit, y: y + DIGIT_Y * unit })),
    rect: { x, y, w: w * unit, h: h * unit },
    // Centred under the foot, from its row down: the foot's own row and two below it.
    shadow: { x: x + (mid - 3) * unit, y: y + foot * unit, w: 7 * unit, h: 3 * unit },
    hang: withBoard ? { cx: x + w / 2, y: y + BOARD.top, minW: w } : null,
  };
}

/** Every plot's signpost on a scene, in slot order. */
export function signposts(scene: Pick<IslandScene, "trees">, options: SignpostOptions = {}): Signpost[] {
  const unit = Math.max(1, Math.round(options.unit ?? 1));
  const hung = new Set(options.hung ?? []);
  return scene.trees.map((tree) => signpostFor(tree, unit, hung.has(tree.slot)));
}

function blit<Img>(ctx: DrawContext<Img>, atlas: Img, a: AtlasRect | undefined, x: number, y: number, unit: number): void {
  if (a) ctx.drawImage(atlas, a.x, a.y, a.w, a.h, x, y, a.w * unit, a.h * unit);
}

/** Paints the signposts from the atlas (into the overlay layer, once per bake): posts, then their digits. */
export function paintSignposts<Img>(ctx: DrawContext<Img>, posts: readonly Signpost[], atlas: Img, rects: ReadonlyMap<string, AtlasRect>): void {
  ctx.imageSmoothingEnabled = false;
  for (const post of posts) {
    blit(ctx, atlas, rects.get(post.sprite), post.x, post.y, post.unit);
    for (const d of post.digits) blit(ctx, atlas, rects.get(d.sprite), d.x, d.y, post.unit);
  }
}

/** A name board's colours in a phase: the plank's own wood under the hour's grade, its name in the digits' paint. */
export interface BoardInk {
  face: string;
  lip: string;
  edge: string;
  ink: string;
}

export function boardInk(phase: LightPhase): BoardInk {
  const hex = (key: string) => rgbHex(gradeKey(key, phase));
  return { face: hex(FACE), lip: hex(LIP), edge: hex(EDGE), ink: hex(PAINT) };
}
