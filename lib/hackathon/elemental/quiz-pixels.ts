import type { ElementKey } from "@/components/hackathon/elemental/media";
import { EL } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENT_ICON_COLOR, ELEMENT_ICON_ROWS } from "@/components/hackathon/poster/elemental/element-icons";

import { ICON_EFFECTS, QUIZ_CRESTS, type IconEffect, type PixelArt } from "./quiz-pixel-art";
import { QUIZ_SCENES, type QuizScene } from "./quiz-scene-art";

export { ICON_EFFECTS, QUIZ_CRESTS, QUIZ_SCENES, type IconEffect, type PixelArt, type QuizScene };

/**
 * The Elemental quiz's pixel art. Each result keeps the brand's flat 9x9 icon
 * from Instagram slide 2, unchanged; what moves is its effect, eight frames
 * drawn by hand round it (fire throws embers, water drips, earth crumbles,
 * air gusts, aether flickers). Above each result hangs its 30x8 crest. The
 * grids are the source; the web page (components/hackathon/elemental/quiz/PixelArt.tsx)
 * and the share cards (lib/og/elemental-quiz.ts) both draw from them, always
 * at a whole number of screen pixels per art pixel.
 *
 * The rules, and how the set was drawn: docs/hackathon/elemental-quiz-pixel-art.md.
 * Check and preview: scripts/elemental-quiz-pixels.py.
 */

export const PIXEL_PALETTE: Readonly<Record<string, string>> = {
  e: EL.ember,
  f: EL.flame,
  l: EL.flameLight,
  c: EL.flameCore,
  w: EL.flameWhite,
  // The deep teal of the water card's old pixel band.
  T: "#1f6f6b",
  C: EL.toxicCyan,
  G: EL.toxicGreen,
  b: EL.burnt,
  r: EL.toxicRust,
  y: EL.toxicYellow,
  d: EL.smokeDark,
  s: EL.smoke,
  a: EL.ash,
  g: EL.aetherGrey,
  v: EL.aetherViolet,
  L: EL.aetherLilac,
  k: EL.cream,
};

export const CREST_COLS = 30;
export const CREST_ROWS = 8;

/** The effect's stage: 15x15 cells with the icon's 9x9 box at columns and rows 3..11. One cell is one icon pixel. */
export const ICON_SIZE = 9;
export const FX_STAGE = 15;
export const FX_OFFSET = 3;
export const FX_FRAMES = 8;

/** A question's scene: 38x14, above the question. A second frame, if any, alternates with the still every 600 ms. */
export const SCENE_COLS = 38;
export const SCENE_ROWS = 14;
export const SCENE_FRAME_MS = 600;

/** A run of same-coloured pixels on one row: [x, y, length, colour]. Drawing runs, not single cells, leaves no hairline seams. */
export type PixelRun = readonly [x: number, y: number, length: number, color: string];

export function pixelRuns(art: PixelArt): PixelRun[] {
  const runs: PixelRun[] = [];
  art.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (ch !== ".") runs.push([x, y, end - x, PIXEL_PALETTE[ch]]);
      x = end;
    }
  });
  return runs;
}

/** One pixel as drawn, in stage cells: [x, y, colour, strength 0..1]. */
export type FxPixel = readonly [x: number, y: number, color: string, alpha: number];

/** Aether's pixels at uneven strengths, as on slide 2 (element-icons.tsx AetherPixels). */
const AETHER_ALPHA = [1, 0.55, 0.8, 0.4];

/**
 * The icon's own pixels on the stage, in the brand's look: one flat colour,
 * except Aether, which is lilac on every third pixel and half there.
 */
export function iconPixels(key: ElementKey): FxPixel[] {
  const out: FxPixel[] = [];
  ELEMENT_ICON_ROWS[key].forEach((row, y) =>
    Array.from(row).forEach((ch, x) => {
      if (ch !== "#") return;
      const i = out.length;
      const color = key === "aether" ? (i % 3 === 0 ? EL.aetherLilac : EL.aetherViolet) : ELEMENT_ICON_COLOR[key];
      out.push([x + FX_OFFSET, y + FX_OFFSET, color, key === "aether" ? AETHER_ALPHA[i % 4] : 1]);
    }),
  );
  return out;
}

/**
 * What frame `n` of an icon's effect shows: the icon, with the frame's
 * pixels drawn round it, recolouring an icon pixel where the frame says so
 * and hiding one where it has "-". Frame 0 is the still.
 */
export function fxFrame(key: ElementKey, n: number): FxPixel[] {
  const cells = new Map<string, FxPixel>(iconPixels(key).map((p) => [`${p[0]},${p[1]}`, p]));
  ICON_EFFECTS[key].frames[n].forEach((row, y) =>
    Array.from(row).forEach((ch, x) => {
      if (ch === ".") return;
      if (ch === "-") cells.delete(`${x},${y}`);
      else cells.set(`${x},${y}`, [x, y, PIXEL_PALETTE[ch], 1]);
    }),
  );
  return [...cells.values()].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

/** A run of same-coloured, same-strength pixels on one row of the stage: [x, y, length, colour, strength]. */
export type FxRun = readonly [x: number, y: number, length: number, color: string, alpha: number];

export function fxRuns(pixels: readonly FxPixel[]): FxRun[] {
  const runs: [number, number, number, string, number][] = [];
  for (const [x, y, color, alpha] of pixels) {
    const last = runs.at(-1);
    if (last && last[1] === y && last[0] + last[2] === x && last[3] === color && last[4] === alpha) last[2]++;
    else runs.push([x, y, 1, color, alpha]);
  }
  return runs;
}

/**
 * The icon's pixels in the order the reveal builds them: fire rises from its
 * base, water fills from its tip down, earth is laid from the ground up, air
 * blows in from the left, and aether's faintest pixels come first.
 */
export function revealCells(key: ElementKey): FxPixel[] {
  const mid = FX_OFFSET + (ICON_SIZE - 1) / 2;
  const fromMid = (p: FxPixel) => Math.abs(p[0] - mid);
  const order: Record<ElementKey, (a: FxPixel, b: FxPixel) => number> = {
    fire: (a, b) => b[1] - a[1] || fromMid(a) - fromMid(b),
    water: (a, b) => a[1] - b[1] || fromMid(a) - fromMid(b),
    earth: (a, b) => b[1] - a[1] || a[0] - b[0],
    air: (a, b) => a[0] - b[0] || a[1] - b[1],
    aether: (a, b) => a[3] - b[3] || a[1] - b[1] || a[0] - b[0],
  };
  return iconPixels(key).sort(order[key]);
}
