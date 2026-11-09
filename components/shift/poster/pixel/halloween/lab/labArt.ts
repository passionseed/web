import { STUDENT, mix } from "../../pixelKit";
import { HAT, HX, LIT_STUDENT_PALETTE } from "../halloweenKit";

/**
 * Sprite grids for the SHIFT[3] "small startup lab" posters, drawn big with
 * PixelIcon. Same palette as halloweenKit, so they sit with the cover.
 */

/** Lay `top` over `base` with `top`'s first row on `base` row `at` (negative grows upward). */
function overlay(base: string[], top: string[], at: number): string[] {
  const shift = Math.max(0, -at);
  const rows = Math.max(base.length + shift, top.length + at + shift);
  const width = Math.max(...base.map((r) => r.length), ...top.map((r) => r.length));
  const out = Array.from({ length: rows }, () => Array<string>(width).fill("."));
  base.forEach((row, y) => [...row].forEach((c, x) => c !== "." && (out[y + shift][x] = c)));
  top.forEach((row, y) => [...row].forEach((c, x) => c !== "." && (out[y + at + shift][x] = c)));
  return out.map((r) => r.join(""));
}

/** The SHIFT[1] student in the witch hat, as one grid: the poster hero. */
export const WITCH = overlay(STUDENT, HAT, -4);
export const WITCH_PALETTE = { ...LIT_STUDENT_PALETTE, K: HX.hat };

/** Detective's fedora: research. */
export const FEDORA = [
  "...DDDDDD...",
  "..DDDCCDDD..",
  "..DDDDDDDD..",
  "..BBBBBBBB..",
  ".DDDDDDDDDD.",
  "DDDDDDDDDDDD",
];
export const FEDORA_PALETTE = { D: HX.stoneLight, C: HX.stone, B: HX.ink };

/** Hard hat: build. */
export const HARD_HAT = [
  "....YYYY....",
  "...YYWWYY...",
  "..YYYWWYYY..",
  "..YYYWWYYY..",
  "..YYYYYYYY..",
  "SSSSSSSSSSSS",
];
export const HARD_HAT_PALETTE = { Y: HX.flame, W: HX.cream, S: mix(HX.flame, HX.pumpkinDark, 0.55) };

/** Baseball cap in profile, bill to the right: growth. */
export const CAP = [
  "....SS.......",
  "..CCCCC......",
  ".CCCCCCC.....",
  "CCCWWCCCC....",
  "CCCCCCCCC....",
  "SSSSSSSSSSSSS",
];
export const CAP_PALETTE = { C: HX.screen, W: HX.cream, S: mix(HX.screen, HX.ink, 0.45) };

/** Cauldron with a glowing brew, the same cool light as the laptop screen. */
export const CAULDRON = [
  "..BBBWBBBBBBBBWBBB..",
  ".RRRRRRRRRRRRRRRRRR.",
  "RRRRRRRRRRRRRRRRRRRR",
  ".KKKKKKKKKKKKKKKKKK.",
  "KKHKKKKKKKKKKKKKKKKK",
  "KHKKKKKKKKKKKKKKKKKK",
  "KHKKKKKKKKKKKKKKKKKK",
  "KKHKKKKKKKKKKKKKKKKK",
  ".KKKKKKKKKKKKKKKKKK.",
  "..KKKKKKKKKKKKKKKK..",
  "...KK..........KK...",
];
export const CAULDRON_PALETTE = { B: HX.screen, W: HX.cream, R: HX.stoneLight, K: "#1e1636", H: HX.stone };

export const COIN = [".YYY.", "YYDYY", "YYDYY", "YYDYY", ".YYY."];
export const COIN_PALETTE = { Y: HX.flame, D: mix(HX.flame, HX.pumpkinDark, 0.5) };

/** Back of a head and shoulders, for the Demo Day crowd. */
export const HEAD = [
  "...KKKK...",
  "..KKKKKK..",
  "..KKKKKK..",
  "..KKKKKK..",
  "...KKKK...",
  ".KKKKKKKK.",
  "KKKKKKKKKK",
  "KKKKKKKKKK",
];
