import type { Metadata } from "next";

import {
  MISSION_FRAME_COUNT,
  ShiftPixelMissionFrame,
  ShiftPixelSecretMission,
} from "@/components/shift/poster/pixel/ShiftPixelSecretMission";
import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

/**
 * SHIFT[1] day 1 ice break game: how to play, rules, 8 secret mission cards
 * and the reveal, each 1200x600. Open ?frame=N for a single frame.
 */

export const metadata: Metadata = {
  title: `${SHIFT_COHORT.name} Secret Mission`,
  robots: { index: false, follow: false },
};

export default async function Shift1SecretMissionPage({
  searchParams,
}: {
  searchParams: Promise<{ frame?: string }>;
}) {
  const frame = Number((await searchParams).frame);
  const single = Number.isInteger(frame) && frame >= 1 && frame <= MISSION_FRAME_COUNT;
  return (
    <div className={single ? "" : "min-h-screen overflow-auto bg-neutral-950 py-10"}>
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      {single ? <ShiftPixelMissionFrame n={frame} /> : <ShiftPixelSecretMission />}
    </div>
  );
}
