import type { Metadata } from "next";

import {
  DAY2_FRAME_COUNT,
  ShiftPixelDay2Frame,
  ShiftPixelDay2,
} from "@/components/shift/poster/pixel/ShiftPixelDay2";
import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

/**
 * SHIFT[1] day 2 resources: build the first prototype, one frame per step,
 * each 1200x600. Open ?frame=N for a single frame.
 */

export const metadata: Metadata = {
  title: `${SHIFT_COHORT.name} Day 2`,
  robots: { index: false, follow: false },
};

export default async function Shift1Day2Page({
  searchParams,
}: {
  searchParams: Promise<{ frame?: string }>;
}) {
  const frame = Number((await searchParams).frame);
  const single = Number.isInteger(frame) && frame >= 1 && frame <= DAY2_FRAME_COUNT;
  return (
    <div className={single ? "" : "min-h-screen overflow-auto bg-neutral-950 py-10"}>
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      {single ? <ShiftPixelDay2Frame n={frame} /> : <ShiftPixelDay2 />}
    </div>
  );
}
