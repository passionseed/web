import type { Metadata } from "next";

import { ShiftPixelBanner } from "@/components/shift/poster/pixel/ShiftPixelBanner";
import { ShiftPixelDetails } from "@/components/shift/poster/pixel/ShiftPixelDetails";
import { ShiftPixelPoster } from "@/components/shift/poster/pixel/ShiftPixelPoster";
import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

/**
 * SHIFT[1] pixel posters: IG carousel (1080x1350 each) plus a listing banner
 * (1200x630).
 * Export: screenshot #shift1-pixel-1, #shift1-pixel-2 and #shift1-pixel-banner.
 */

export const metadata: Metadata = {
  title: `${SHIFT_COHORT.name} Pixel Poster`,
  robots: { index: false, follow: false },
};

export default function Shift1PixelPosterPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 py-10">
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      <div className="flex flex-col items-center gap-10">
        <ShiftPixelPoster />
        <ShiftPixelDetails />
        <ShiftPixelBanner />
      </div>
    </div>
  );
}
