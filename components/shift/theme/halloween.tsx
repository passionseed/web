import { PIXEL_FONT } from "@/components/shift/poster/pixel/PixelRects";
import { HalloweenDawn } from "@/components/shift/poster/pixel/halloween/HalloweenDawn";
import { HalloweenNight } from "@/components/shift/poster/pixel/halloween/HalloweenNight";
import { HX, latinDateRange } from "@/components/shift/poster/pixel/halloween/halloweenKit";
import { LATIN } from "@/components/shift/poster/shift3/parts";

import type { ShiftPalette } from "./tokens";
import type { ShiftHeroProps, ShiftTheme } from "./types";

/**
 * SHIFT[3]: the Halloween pixel poster as a page. SHIFT[1]'s pixel world at
 * night (same kit, same student, now in a witch hat), so the posters, the
 * register page and the round page read as one campaign. The page is the
 * poster's footer ink; pumpkin orange is the one loud colour. It ends at
 * dawn in PassionSeed's own colours (HalloweenDawn).
 *
 * Contrast on ink (#0d0919): cream 18:1, cream at 60% 6.8:1, pumpkin
 * 6.9:1, flame 14:1, lavender 9:1. Cream on the night sky 15.9:1.
 */

const PALETTE: ShiftPalette = {
  bg: HX.ink,
  text: HX.cream,
  accent1: HX.pumpkin,
  accent2: HX.lavender,
  accent3: HX.flame,
  accent4: HX.hat,
  hair: "rgba(248,245,236,0.12)",
  // Hard one-cell drop in witch-hat purple.
  headingShadow: `3px 3px 0 ${HX.hat}`,
  bar: "rgba(13,9,25,0.9)",
  button: {
    bg: HX.pumpkin,
    fg: HX.ink,
    shadow: `4px 4px 0 0 ${HX.hat}`,
    shadowHover: `6px 6px 0 0 ${HX.hat}`,
  },
};

function HalloweenHero({ cohort, headline, children }: ShiftHeroProps) {
  return (
    <header className="relative">
      <HalloweenNight floor={HX.ink}>
        <div className="mx-auto flex max-w-5xl flex-col items-center px-5 pt-24 text-center sm:px-8 sm:pt-28">
          {/* Latin font, not Tiny5: the pixel N and V read as H and Y. */}
          <p
            className="text-sm font-semibold tracking-[0.14em] sm:text-base"
            style={{ fontFamily: LATIN, color: HX.lavender }}
          >
            {latinDateRange(cohort.startDate, cohort.endDate)} · ONLINE · {cohort.seats} SEATS
          </p>
          <h1
            className="mt-3 text-[clamp(72px,15vw,168px)] leading-[0.9]"
            style={{ ...PIXEL_FONT, color: HX.cream, textShadow: `6px 6px 0 ${HX.hat}` }}
          >
            {cohort.name}
          </h1>
          <p
            className="mt-4 font-kodchasan text-[clamp(28px,4.4vw,48px)] font-bold leading-[1.3]"
            style={{ color: HX.cream }}
          >
            {headline}
          </p>
        </div>
      </HalloweenNight>
      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 pb-24 pt-10 text-center sm:px-8 sm:pt-14">
        {children}
      </div>
    </header>
  );
}

export const HALLOWEEN_THEME: ShiftTheme = {
  kind: "halloween",
  palette: PALETTE,
  Hero: HalloweenHero,
  Bookend: HalloweenDawn,
};
