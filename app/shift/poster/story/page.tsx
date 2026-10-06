import type { Metadata } from "next";

import { ShiftStoryReel } from "@/components/shift/poster/testimonial/ShiftStoryReel";
import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

/**
 * SHIFT[1] MOFU story Reel (1080x1920): why PassionSeed exists, cut to the
 * founder's voiceover. Plays live; click to replay. Export: `?render=1`
 * pauses it for scripts/render-shift-testimonial.mjs story.
 */

export const metadata: Metadata = {
  title: `${SHIFT_COHORT.name} Story Reel`,
  robots: { index: false, follow: false },
};

export default async function ShiftStoryPage({ searchParams }: { searchParams: Promise<{ render?: string }> }) {
  const { render } = await searchParams;
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 p-10">
      <style>{"nextjs-portal{display:none!important}"}</style>
      <ShiftStoryReel render={render === "1"} />
    </div>
  );
}
