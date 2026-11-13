import type { Metadata } from "next";

import { ShiftIslandGuidePoster } from "@/components/shift/poster/pixel/island/ShiftIslandGuidePoster";

/**
 * SHIFT Island guide poster for the test group in the SHIFT Discord,
 * 1080x1350: how to start and what to do each day. Not linked from anywhere.
 * Export: node scripts/render-poster.mjs --route /shift/poster/island-guide
 *         --ids shift-island-guide --out <dir>
 */

export const metadata: Metadata = {
  title: "SHIFT Island guide poster",
  robots: { index: false, follow: false },
};

export default function ShiftIslandGuidePosterPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 p-10">
      <style>{"nextjs-portal{display:none!important}"}</style>
      <ShiftIslandGuidePoster />
    </div>
  );
}
