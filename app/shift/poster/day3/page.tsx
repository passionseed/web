import type { Metadata } from "next";

import {
  DAY3_FRAME_COUNT,
  ShiftPixelDay3Frame,
  ShiftPixelDay3,
} from "@/components/shift/poster/pixel/ShiftPixelDay3";
import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

/**
 * SHIFT[1] day 3 resources: Build Fast, one frame per step,
 * each 1200x600. Open ?frame=N for a single frame.
 */

export const metadata: Metadata = {
  title: `${SHIFT_COHORT.name} Day 3`,
  robots: { index: false, follow: false },
};

export default async function Shift1Day3Page({
  searchParams,
}: {
  searchParams: Promise<{ frame?: string }>;
}) {
  const frame = Number((await searchParams).frame);
  const single = Number.isInteger(frame) && frame >= 1 && frame <= DAY3_FRAME_COUNT;
  return (
    <div className={single ? "" : "min-h-screen overflow-auto bg-neutral-950 py-10"}>
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      {single ? <ShiftPixelDay3Frame n={frame} /> : <ShiftPixelDay3 />}
    </div>
  );
}
