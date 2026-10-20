import type { Metadata } from "next";

import { ShiftThreeDateCover } from "@/components/shift/poster/ShiftThreeDateCover";
import { ChromeBevelFilter } from "@/components/shift/poster/riso";

/**
 * SHIFT[3] date poster (IG, 1080x1350): 9 to 14 Nov 2026.
 * Export: screenshot #shift3-poster-1.
 */

export const metadata: Metadata = {
  title: "SHIFT[3] Poster",
  description: "SHIFT[3] วันที่ 9 ถึง 14 พ.ย. 2569",
  robots: { index: false, follow: false },
};

export default function Shift3PosterPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 py-10">
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      <ChromeBevelFilter />
      <div className="flex flex-col items-center gap-10">
        <ShiftThreeDateCover />
      </div>
    </div>
  );
}
