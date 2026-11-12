import type { Metadata } from "next";

import { SheetGallery, type SheetSearchParams, isRenderMode } from "@/components/shift/poster/SheetGallery";
import {
  SHIFT3_HALLOWEEN_POSTER_ID,
  ShiftPixelHalloweenCover,
} from "@/components/shift/poster/pixel/halloween/ShiftPixelHalloweenCover";
import {
  SHIFT3_LAUNCH_FEED_ID,
  SHIFT3_LAUNCH_STORY_ID,
  Shift3LaunchFeed,
  Shift3LaunchStory,
} from "@/components/shift/poster/shift3/Shift3Launch";
import { SHIFT3 } from "@/components/shift/poster/shift3/facts";

/**
 * SHIFT[3] launch posters: the Halloween pixel cover (1080x1350, SHIFT[1]'s
 * pixel layout), then the cosmos feed (1080x1350) and story (1080x1920).
 * Facts come from SHIFT_COHORT_3. Visitors see the exported images;
 * ?render=1 shows the live sheets.
 * Export: node scripts/render-poster.mjs --route /shift/poster/3/launch
 *         --ids shift3-halloween-1,shift3-launch-feed,shift3-launch-story --out <dir>
 *         --publish public/shift/poster/3/sheets
 */

export const metadata: Metadata = {
  title: `${SHIFT3.name} launch poster`,
  description: `${SHIFT3.name} ${SHIFT3.dates} ${SHIFT3.time} น. บน Discord`,
  robots: { index: false, follow: false },
};

export default async function Shift3LaunchPosterPage({ searchParams }: { searchParams: SheetSearchParams }) {
  return (
    <SheetGallery
      dir="/shift/poster/3/sheets"
      render={await isRenderMode(searchParams)}
      sheets={[
        {
          id: SHIFT3_HALLOWEEN_POSTER_ID,
          width: 1080,
          height: 1350,
          alt: `${SHIFT3.name} launch poster, Halloween pixel`,
          live: <ShiftPixelHalloweenCover />,
        },
        {
          id: SHIFT3_LAUNCH_FEED_ID,
          width: 1080,
          height: 1350,
          alt: `${SHIFT3.name} launch poster, feed`,
          live: <Shift3LaunchFeed />,
        },
        {
          id: SHIFT3_LAUNCH_STORY_ID,
          width: 1080,
          height: 1920,
          alt: `${SHIFT3.name} launch poster, story`,
          live: <Shift3LaunchStory />,
        },
      ]}
    />
  );
}
