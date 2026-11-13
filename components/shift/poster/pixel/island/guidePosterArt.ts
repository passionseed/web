/**
 * Pixel art for the SHIFT Island guide poster. The scene uses the island's
 * own sprites (bot/assets/island) under the live island's dawn light
 * (lib/shift-island/live/lighting.ts), so the poster looks like the island a
 * student opens. Only the two button icons below are new, drawn in the
 * island's PALETTE keys.
 */

import { MOTION_SPRITES } from "@/bot/assets/island/motion-sprites";
import { PALETTE } from "@/bot/assets/island/sprites";
import { WEB_SPRITES } from "@/components/shift/island/sprites";
import { paletteRgb, tint } from "@/lib/shift-island/live/lighting";

import type { GuideIcon } from "./guidePosterCopy";

const hex2 = (v: number) => v.toString(16).padStart(2, "0");

/** The island's palette under dawn light; `lit` keys keep their own colour (fire, lamp light). */
export function dawnPalette(lit = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(PALETTE)) {
    const rgb = paletteRgb(key);
    if (!rgb || lit.includes(key)) {
      out[key] = PALETTE[key];
      continue;
    }
    const [r, g, b] = tint(rgb, "dawn");
    out[key] = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  }
  return out;
}

/** 🌊 on the rest phase: two rows of waves. */
const WAVE = [
  ".uu....uu...",
  "u..u..u..u..",
  "....uu....uu",
  "............",
  ".vv....vv...",
  "v..v..v..v..",
  "....vv....vv",
];

/** ✍️ on the close-round button: a pencil writing. */
const PENCIL = [
  "............oo..",
  "...........oppo.",
  "..........opppo.",
  ".........oaoaoo.",
  "........oyyao...",
  ".......oyyyo....",
  "......oyyyo.....",
  ".....oyyyo......",
  "....oyyyo.......",
  "...oeyyo........",
  "..okeeo.........",
  "..okko..........",
  ".ozoo...........",
  ".oo.............",
];

/** Passioncoin, beside the coins line. */
export const COIN = WEB_SPRITES.coin;

/** The sprite for each icon on the poster's buttons and phases. */
export const GUIDE_ICONS: Record<GuideIcon, string[]> = {
  seed: WEB_SPRITES.seed,
  star: WEB_SPRITES.star,
  flame: MOTION_SPRITES.campfire_flame_0,
  wave: WAVE,
  pencil: PENCIL,
};
