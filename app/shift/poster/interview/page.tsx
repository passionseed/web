import type { Metadata } from "next";

import {
  INTERVIEW_FRAME_COUNT,
  ShiftPixelInterviewFrame,
  ShiftPixelInterviewMission,
} from "@/components/shift/poster/pixel/ShiftPixelInterviewMission";
import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

/**
 * SHIFT[1] day 1 interview Mission: the Mission and the example AI prompt,
 * each 1200x600. Open ?frame=N for a single frame.
 */

export const metadata: Metadata = {
  title: `${SHIFT_COHORT.name} Interview Mission`,
  robots: { index: false, follow: false },
};

export default async function Shift1InterviewMissionPage({
  searchParams,
}: {
  searchParams: Promise<{ frame?: string }>;
}) {
  const frame = Number((await searchParams).frame);
  const single = Number.isInteger(frame) && frame >= 1 && frame <= INTERVIEW_FRAME_COUNT;
  return (
    <div className={single ? "" : "min-h-screen overflow-auto bg-neutral-950 py-10"}>
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      {single ? <ShiftPixelInterviewFrame n={frame} /> : <ShiftPixelInterviewMission />}
    </div>
  );
}
