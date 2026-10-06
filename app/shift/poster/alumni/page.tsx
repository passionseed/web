import type { Metadata } from "next";

import { ShiftAlumniPoster } from "@/components/shift/poster/grid/slideAlumni";
import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

/**
 * SHIFT[1] alumni comeback poster (1080x1440) for the LINE broadcast.
 * Export: screenshot #shift1-alumni.
 */

export const metadata: Metadata = {
  title: `${SHIFT_COHORT.name} Alumni Poster`,
  robots: { index: false, follow: false },
};

export default function ShiftAlumniPosterPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 p-10">
      <style>{"nextjs-portal{display:none!important}"}</style>
      <ShiftAlumniPoster />
    </div>
  );
}
