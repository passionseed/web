import type { Metadata } from "next";

import { ShiftThreeDateCover } from "@/components/shift/poster/ShiftThreeDateCover";
import { SHIFT3 } from "@/components/shift/poster/shift3/facts";

/**
 * SHIFT[3] save-the-date poster (IG feed, 1080x1350), cosmos style. Facts come
 * from SHIFT_COHORT_3.
 * Export: node scripts/render-poster.mjs --route /shift/poster/3
 *         --ids shift3-poster-1 --out <dir>
 */

export const metadata: Metadata = {
  title: `${SHIFT3.name} save the date`,
  description: `${SHIFT3.name} วันที่ ${SHIFT3.datesWithYear}`,
  robots: { index: false, follow: false },
};

export default function Shift3PosterPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 py-10">
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      <div className="flex flex-col items-center gap-10">
        <ShiftThreeDateCover />
      </div>
    </div>
  );
}
