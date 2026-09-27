import type { Metadata } from "next";

import { ShiftZeroBanner } from "@/components/shift/poster/zero/ShiftZeroBanner";
import { SHIFT_COHORT_0 } from "@/lib/content/shift-cohort";

/**
 * SHIFT[0] listing banner (1200x630) for the /shift gallery.
 * Export: screenshot #shift0-banner.
 */

export const metadata: Metadata = {
  title: `${SHIFT_COHORT_0.name} Banner`,
  robots: { index: false, follow: false },
};

export default function Shift0PosterPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 py-10">
      <style>{"nextjs-portal{display:none!important}"}</style>
      <div className="flex flex-col items-center gap-10">
        <ShiftZeroBanner />
      </div>
    </div>
  );
}
