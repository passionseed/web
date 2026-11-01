import type { ShiftCohort } from "@/lib/content/shift-cohort";

import { HALLOWEEN_THEME } from "./halloween";
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

/** Seasonal rounds (SHIFT[3]: Halloween) wear their season; the rest their round's theme. */
export function themeForCohort(cohort: ShiftCohort): ShiftTheme {
  if (cohort.season === "halloween") return HALLOWEEN_THEME;
  return THEMES[cohort.round] ?? RISO_THEME;
}

export { isPixelKind } from "./types";
export type { ShiftArtKind, ShiftHeroProps, ShiftTheme } from "./types";
