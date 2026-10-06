import type { Metadata } from "next";

import {
  DISCORD_FRAME_COUNT,
  ShiftPixelDiscordFrame,
  ShiftPixelDiscordGuide,
} from "@/components/shift/poster/pixel/ShiftPixelDiscordGuide";
import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

/**
 * SHIFT[1] Discord guide for #อ่านก่อน: wide 1200x600 images, one per topic.
 * Export: screenshot #shift1-discord-1 … #shift1-discord-N, or open
 * ?frame=N to get a single frame at the page origin.
 */

export const metadata: Metadata = {
  title: `${SHIFT_COHORT.name} Discord Guide`,
  robots: { index: false, follow: false },
};

export default async function Shift1DiscordGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ frame?: string }>;
}) {
  const frame = Number((await searchParams).frame);
  const single = Number.isInteger(frame) && frame >= 1 && frame <= DISCORD_FRAME_COUNT;
  return (
    <div className={single ? "" : "min-h-screen overflow-auto bg-neutral-950 py-10"}>
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      {single ? <ShiftPixelDiscordFrame n={frame} /> : <ShiftPixelDiscordGuide />}
    </div>
  );
}
