import { HOLO_THEME } from "./holo";
import { PIXEL_THEME } from "./pixel";
import { RISO_THEME } from "./riso";
import type { ShiftTheme } from "./types";

/**
 * Round number to page theme. A round without its own theme uses riso, the
 * house style, so a new round works before anyone designs for it.
 */
const THEMES: Record<number, ShiftTheme> = {
  0: HOLO_THEME,
  1: PIXEL_THEME,
  2: RISO_THEME,
};

export function themeForRound(round: number): ShiftTheme {
  return THEMES[round] ?? RISO_THEME;
}

export type { ShiftArtKind, ShiftHeroProps, ShiftTheme } from "./types";
