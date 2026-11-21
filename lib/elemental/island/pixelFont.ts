/**
 * Pixel digits for the Elemental pictures: SHIFT's 3 x 5 DIGITS (imported
 * read-only), each digit pixel drawn as a g x g block. Digits only, never
 * letters: no fonts and no names reach a picture. Thai and every name go in
 * message text.
 *
 * Plot number tags match SHIFT's (a dark box from tagRect with white digits),
 * at g = TAG_GLYPH. E14's card reuses drawDigits for its big numbers.
 */
import { DIGITS, tagRect, type SceneRect } from "../../../bot/src/quests/island/scene";

import type { RGBA, Surface } from "./surface";

/** Digit pixel size of a plot number tag: each digit pixel is 2 x 2. */
export const TAG_GLYPH = 2;

/** SHIFT's tag box and digit ink. */
export const TAG_FILL: RGBA = [24, 28, 38, 230];
export const DIGIT_INK: RGBA = [255, 255, 255, 255];

/** Digit cells: 3 wide, 5 tall, 1 cell between digits. */
const DIGIT_W = 3;
const DIGIT_H = 5;
const DIGIT_STEP = 4;

function digitsOf(n: number): string {
  if (!Number.isInteger(n) || n < 0) throw new RangeError("pixel digits take a whole number 0 or more");
  return String(n);
}

/** Width and height in pixels of n drawn by drawDigits at digit pixel g. */
export function digitsSize(n: number, g: number): { w: number; h: number } {
  const text = digitsOf(n);
  return { w: (text.length * DIGIT_STEP - 1) * g, h: DIGIT_H * g };
}

/** Draws n's digits with their top-left at (x, y), each digit pixel g x g. */
export function drawDigits(surface: Surface, n: number, x: number, y: number, g: number, ink: RGBA = DIGIT_INK): void {
  [...digitsOf(n)].forEach((d, k) => {
    const bits = DIGITS[Number(d)];
    for (let j = 0; j < DIGIT_H; j++) {
      for (let i = 0; i < DIGIT_W; i++) {
        if (bits[j * DIGIT_W + i] === "1") surface.rect(x + (k * DIGIT_STEP + i) * g, y + j * g, g, g, ink);
      }
    }
  });
}

/** A plot number tag: centred on cx, its top edge on cy (the soil line), as SHIFT's tagRect. */
export function plotTag(slot: number, cx: number, cy: number, g: number = TAG_GLYPH): SceneRect {
  return tagRect(slot, cx, cy, g);
}

/** Draws a plot number tag in its rect (from plotTag): SHIFT's dark box with the digits 2 cells in. */
export function drawTag(surface: Surface, slot: number, tag: SceneRect, g: number = TAG_GLYPH): void {
  surface.rect(tag.x, tag.y, tag.w, tag.h, TAG_FILL);
  drawDigits(surface, slot, tag.x + 2 * g, tag.y + 2 * g, g);
}
