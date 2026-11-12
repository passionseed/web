import type { Metadata } from "next";

import { SheetGallery, type SheetSearchParams, isRenderMode } from "@/components/shift/poster/SheetGallery";
import {
  SHIFT3_HALLOWEEN_SLIDES,
  SHIFT3_HALLOWEEN_SLIDE_IDS,
} from "@/components/shift/poster/pixel/halloween/ShiftHalloweenCarousel";
import { SHIFT3 } from "@/components/shift/poster/shift3/facts";

/**
 * SHIFT[3] Halloween Instagram carousel: 7 slides at 1080x1350, pixel
 * Halloween style, call to action "comment SHIFT" (no QR). Facts come from
 * SHIFT_COHORT_3. Visitors see the exported images; ?render=1 shows the live
 * sheets.
 * Export: node scripts/render-poster.mjs --route /shift/poster/3/halloween
 *         --ids shift3-hw-01,...,shift3-hw-07 --out <dir>
 *         --publish public/shift/poster/3/sheets
 */

export const metadata: Metadata = {
  title: `${SHIFT3.name} Halloween carousel`,
  description: `${SHIFT3.name} ${SHIFT3.dates} คอมเมนต์ ${SHIFT3.keyword} รับลิงก์สมัคร`,
  robots: { index: false, follow: false },
};

export default async function Shift3HalloweenCarouselPage({ searchParams }: { searchParams: SheetSearchParams }) {
  return (
    <SheetGallery
      dir="/shift/poster/3/sheets"
      render={await isRenderMode(searchParams)}
      sheets={SHIFT3_HALLOWEEN_SLIDES.map((live, i) => ({
        id: SHIFT3_HALLOWEEN_SLIDE_IDS[i],
        width: 1080,
        height: 1350,
        alt: `${SHIFT3.name} Halloween carousel, slide ${i + 1} of ${SHIFT3_HALLOWEEN_SLIDES.length}`,
        live,
      }))}
    />
  );
}
