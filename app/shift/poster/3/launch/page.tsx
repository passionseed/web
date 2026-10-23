import type { Metadata } from "next";

import { Shift3LaunchFeed, Shift3LaunchStory } from "@/components/shift/poster/shift3/Shift3Launch";
import { SHIFT3 } from "@/components/shift/poster/shift3/facts";

/**
 * SHIFT[3] launch poster: feed (1080x1350) and story (1080x1920), cosmos
 * style. Facts come from SHIFT_COHORT_3.
 * Export: node scripts/render-poster.mjs --route /shift/poster/3/launch
 *         --ids shift3-launch-feed,shift3-launch-story --out <dir>
 */

export const metadata: Metadata = {
  title: `${SHIFT3.name} launch poster`,
  description: `${SHIFT3.name} ${SHIFT3.dates} ${SHIFT3.time} น. บน Discord`,
  robots: { index: false, follow: false },
};

export default function Shift3LaunchPosterPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 p-10">
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      <div className="flex items-start gap-10">
        <Shift3LaunchFeed />
        <Shift3LaunchStory />
      </div>
    </div>
  );
}
