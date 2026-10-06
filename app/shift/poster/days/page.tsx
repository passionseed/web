import type { Metadata } from "next";

import {
  DAYS,
  ShiftPixelDayDeck,
  ShiftPixelDayFrame,
  dayFrameCount,
} from "@/components/shift/poster/pixel/ShiftPixelDays";
import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

/**
 * SHIFT[1] days 4–7 resources, 1200x600 each.
 * ?day=N shows that day's deck; ?day=N&frame=M a single frame for export.
 */

export const metadata: Metadata = {
  title: `${SHIFT_COHORT.name} Days 4–7`,
  robots: { index: false, follow: false },
};

export default async function Shift1DaysPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; frame?: string }>;
}) {
  const params = await searchParams;
  const day = Number(params.day) || DAYS[0].day;
  const frame = Number(params.frame);
  const single = Number.isInteger(frame) && frame >= 1 && frame <= dayFrameCount(day);
  return (
    <div className={single ? "" : "min-h-screen overflow-auto bg-neutral-950 py-10"}>
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      {single ? <ShiftPixelDayFrame day={day} n={frame} /> : <ShiftPixelDayDeck day={day} />}
    </div>
  );
}
