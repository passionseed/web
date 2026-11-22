/**
 * The speech bubble's geometry, backward designed for a muted, 1.5-second
 * read on a phone. Pure: sizes in, positions out, so every frame places the
 * bubble the same way and the rules can be tested without a browser.
 *
 * - Who is speaking is told by the tail, never by a label: the bubble sits
 *   over the speaker and a pixel wedge points down to just above their head.
 * - The bubble is on the cast's pixel grid (CELL is one sprite cell, 6 CSS px,
 *   15 device px at 2.5x), with stepped corners, so it belongs to the pixel
 *   cast standing in the real photo.
 * - It never leaves the platforms' safe zone (cast.ts SAFE): clear of the top
 *   band and the right rail, and above the speaker's head.
 */
import { SAFE } from "./cast";

/** One sprite cell in CSS px. */
export const CELL = 6;
/** The bubble's left limit (the frame's left edge has no platform UI). */
export const BUBBLE_SIDE = 20;
/** Highest a bubble may start. */
export const BUBBLE_TOP = SAFE.top + 8;
/** Cells between the bubble's bottom edge and the top of the speaker's head (the tail lives here). */
export const TAIL_CELLS = 5;
/** The tail's width in cells where it leaves the bubble. */
const TAIL_BASE = 4;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const snap = (v: number) => Math.round(v / 2) * 2;
const up = (v: number) => Math.ceil(v / CELL) * CELL;

/**
 * A rectangle with two-step pixel corners as a clip-path polygon, in px of
 * its own box (`w` by `h`).
 */
export function steppedClip(w: number, h: number, c: number = CELL): string {
  const p = (x: number, y: number) => `${x}px ${y}px`;
  return `polygon(${[
    p(2 * c, 0), p(w - 2 * c, 0), p(w - 2 * c, c), p(w - c, c), p(w - c, 2 * c), p(w, 2 * c),
    p(w, h - 2 * c), p(w - c, h - 2 * c), p(w - c, h - c), p(w - 2 * c, h - c), p(w - 2 * c, h),
    p(2 * c, h), p(2 * c, h - c), p(c, h - c), p(c, h - 2 * c), p(0, h - 2 * c),
    p(0, 2 * c), p(c, 2 * c), p(c, c), p(2 * c, c),
  ].join(", ")})`;
}

export interface BubblePlacement {
  /** The bubble's box in frame px (size rounded up to whole cells). */
  box: Rect;
  /** The tail's cells, top to bottom, in frame px. */
  tail: Rect[];
}

/** The most text height a bubble may have above a head at `headY` (frame px). */
export function bubbleRoom(headY: number): number {
  return headY - TAIL_CELLS * CELL - BUBBLE_TOP;
}

/**
 * Where a bubble of the measured size goes for a speaker standing at
 * `speakerX` with the top of their head at `headY`: centred over them, slid
 * to stay inside [BUBBLE_SIDE, SAFE.right], its bottom TAIL_CELLS above the
 * head (never above BUBBLE_TOP), and a tail from its bottom edge leaning
 * toward the speaker.
 */
export function placeBubble(size: { w: number; h: number }, speakerX: number, headY: number): BubblePlacement {
  const w = up(size.w);
  const h = up(size.h);
  const x = snap(Math.min(Math.max(BUBBLE_SIDE, speakerX - w / 2), SAFE.right - w));
  const y = snap(Math.max(BUBBLE_TOP, headY - TAIL_CELLS * CELL - h));
  const box = { x, y, w, h };
  return { box, tail: tailCells(box, speakerX, headY) };
}

/**
 * The tail: a wedge TAIL_BASE cells wide where it leaves the bubble, one cell
 * at the tip, which ends one cell above the head. It starts a third of the
 * way from the speaker toward the bubble's centre, so it leans to the
 * speaker, and never closer than two cells to a corner.
 */
export function tailCells(box: Rect, speakerX: number, headY: number): Rect[] {
  const top = box.y + box.h - CELL; // overlap the bubble's last row so the join has no seam
  const tip = headY - CELL;
  const aim = Math.min(Math.max(speakerX, BUBBLE_SIDE + CELL), SAFE.right - CELL);
  const n = Math.max(3, Math.round((tip - top) / CELL));
  const centre = box.x + box.w / 2;
  const from = Math.min(Math.max(aim + (centre - aim) / 3, box.x + (2 + TAIL_BASE / 2) * CELL), box.x + box.w - (2 + TAIL_BASE / 2) * CELL);
  const cells: Rect[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1);
    const wc = Math.max(1, Math.round(TAIL_BASE * (1 - t) + 0.4));
    const cx = from + (aim - from) * t;
    cells.push({ x: snap(cx - (wc * CELL) / 2), y: top + i * CELL, w: wc * CELL, h: CELL });
  }
  return cells;
}

/** Splits a phrase around the stressed words, if they are in it. */
export function splitStress(text: string, stress: string | undefined): { text: string; stress: boolean }[] {
  if (!stress) return [{ text, stress: false }];
  const at = text.indexOf(stress);
  if (at < 0) return [{ text, stress: false }];
  return [
    { text: text.slice(0, at), stress: false },
    { text: stress, stress: true },
    { text: text.slice(at + stress.length), stress: false },
  ].filter((p) => p.text);
}
