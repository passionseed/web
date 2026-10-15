import type { Metadata } from "next";

import { ShiftCrewCover } from "@/components/shift/poster/ShiftCrewCover";
import { ChromeBevelFilter } from "@/components/shift/poster/riso";
import { SHIFT_COHORT_2 } from "@/lib/content/shift-cohort";
import { shiftSocialMetadata } from "@/lib/shift/socialMetadata";

/**
 * SHIFT[2] poster (IG carousel, 1080x1350). Concept stage: cover only.
 * Export: screenshot #shift2-poster-1.
 */

const title = `${SHIFT_COHORT_2.name} Poster`;
const description = "ปกโพสต์ IG ของ SHIFT[2] ขนาด 1080 × 1350 สำหรับแคปไปลง";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  ...shiftSocialMetadata(SHIFT_COHORT_2, title, description, "/shift/poster/2"),
};

export default function Shift2PosterPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 py-10">
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      <ChromeBevelFilter />
      <div className="flex flex-col items-center gap-10">
        <ShiftCrewCover />
      </div>
    </div>
  );
}
