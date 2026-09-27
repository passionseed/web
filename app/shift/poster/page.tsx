import type { Metadata } from "next";

import { ShiftPosterBanner } from "@/components/shift/poster/ShiftPosterBanner";
import { ShiftPosterCover } from "@/components/shift/poster/ShiftPosterCover";
import { ShiftPosterDetails } from "@/components/shift/poster/ShiftPosterDetails";
import { ChromeBevelFilter } from "@/components/shift/poster/riso";
import { POSTER_COHORT } from "@/lib/content/shift-cohort";

/**
 * Two-page SHIFT poster (IG carousel, 1080x1350 each) plus a 1200x630
 * listing banner (CampHub), riso print style.
 * Every fact comes from POSTER_COHORT, the round being promoted.
 * Export: screenshot #shift-poster-1, #shift-poster-2 and
 * #shift-poster-banner at 2x.
 */

export const metadata: Metadata = {
  title: `${POSTER_COHORT.name} Poster`,
  robots: { index: false, follow: false },
};

export default function ShiftPosterPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 py-10">
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      <ChromeBevelFilter />
      <div id="shift-posters" className="flex flex-col items-center gap-10">
        <ShiftPosterCover />
        <ShiftPosterDetails />
        <ShiftPosterBanner />
      </div>
    </div>
  );
}
