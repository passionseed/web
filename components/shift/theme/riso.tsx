import { RisoHero, RisoPageTexture, RisoSunrise } from "@/components/shift/ShiftRiso";

import { RISO_PALETTE } from "./tokens";
import type { ShiftTheme } from "./types";

/** SHIFT[2]: riso dawn from orbit, the look of the current posters. */
export const RISO_THEME: ShiftTheme = {
  palette: RISO_PALETTE,
  Hero: RisoHero,
  Texture: RisoPageTexture,
  Bookend: RisoSunrise,
};
