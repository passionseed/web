import type { Metadata } from "next";

import { ShiftPosterCover } from "@/components/shift/poster/ShiftPosterCover";
import { ShiftPosterDetails } from "@/components/shift/poster/ShiftPosterDetails";
import { ChromeBevelFilter } from "@/components/shift/poster/riso";
import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

/**
 * Two-page SHIFT poster (IG carousel, 1080x1350 each), riso print style.
 * Every fact comes from SHIFT_COHORT so the posters cannot drift from /shift.
 * Export: screenshot #shift-poster-1 and #shift-poster-2 at 2x.
 */

export const metadata: Metadata = {
  title: `${SHIFT_COHORT.name} Poster`,
  robots: { index: false, follow: false },
};

export default function ShiftPosterPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 py-10">
      <ChromeBevelFilter />
      <div id="shift-posters" className="flex flex-col items-center gap-10">
        <ShiftPosterCover />
        <ShiftPosterDetails />
      </div>
    </div>
  );
}
