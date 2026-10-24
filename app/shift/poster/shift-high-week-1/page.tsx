import type { Metadata } from "next";

import { ShiftHighWeekPoster } from "@/components/shift/poster/ShiftHighWeekPoster";

/**
 * SHIFT High week 1 run of show for students, 1080x1350.
 * Export: screenshot #shift-high-week-1.
 */

export const metadata: Metadata = {
  title: "SHIFT High week 1 poster",
  robots: { index: false, follow: false },
};

export default function ShiftHighWeekPosterPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 p-10">
      <style>{"nextjs-portal{display:none!important}"}</style>
      <ShiftHighWeekPoster />
    </div>
  );
}
