import type { Metadata } from "next";

import { ShiftHighPoster } from "@/components/shift/poster/ShiftHighPoster";

/**
 * SHIFT High offer for SHIFT[2] alumni, 1080x1350, on the SHIFT globe.
 * Export: screenshot #shift-high once the planet has drawn.
 */

export const metadata: Metadata = {
  title: "SHIFT High poster",
  robots: { index: false, follow: false },
};

export default function ShiftHighPosterPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 p-10">
      <style>{"nextjs-portal{display:none!important}"}</style>
      <ShiftHighPoster />
    </div>
  );
}
