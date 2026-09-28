import type { Metadata } from "next";

import { GRID_SLIDES } from "@/components/shift/poster/grid/gridSlides";
import {
  ShiftGridCover,
  ShiftGridPanorama,
  TILE_LETTERS,
} from "@/components/shift/poster/grid/ShiftGridPanorama";
import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

/**
 * SHIFT[1] IG grid: three 4-slide carousels (1080x1440 each) whose covers
 * join into one panorama on the profile grid.
 * Export: screenshot #shift1-grid-{a,b,c}-{1..4}; #shift1-grid-panorama is
 * the grid preview only. Post C first, then B, then A.
 */

export const metadata: Metadata = {
  title: `${SHIFT_COHORT.name} IG Grid`,
  robots: { index: false, follow: false },
};

export default function ShiftGridPosterPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 p-10">
      <style>{"nextjs-portal{display:none!important}"}</style>
      <div className="flex flex-col gap-16">
        <ShiftGridPanorama id="shift1-grid-panorama" />
        {TILE_LETTERS.map((letter) => (
          <div key={letter} className="flex gap-6">
            <ShiftGridCover letter={letter} />
            {GRID_SLIDES[letter].map((Slide) => (
              <Slide key={Slide.name} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
