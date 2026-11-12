import type { Metadata } from "next";

import { SheetGallery, type SheetSearchParams, isRenderMode } from "@/components/shift/poster/SheetGallery";
import { SHIFT3_DATE_POSTER_ID, ShiftThreeDateCover } from "@/components/shift/poster/ShiftThreeDateCover";
import { SHIFT3 } from "@/components/shift/poster/shift3/facts";

/**
 * SHIFT[3] save-the-date poster (IG feed, 1080x1350), cosmos style. Facts come
 * from SHIFT_COHORT_3. Visitors see the exported image; ?render=1 shows the
 * live sheet.
 * Export: node scripts/render-poster.mjs --route /shift/poster/3
 *         --ids shift3-poster-1 --out <dir> --publish public/shift/poster/3/sheets
 */

export const metadata: Metadata = {
  title: `${SHIFT3.name} save the date`,
  description: `${SHIFT3.name} วันที่ ${SHIFT3.datesWithYear}`,
  robots: { index: false, follow: false },
};

export default async function Shift3PosterPage({ searchParams }: { searchParams: SheetSearchParams }) {
  return (
    <SheetGallery
      dir="/shift/poster/3/sheets"
      render={await isRenderMode(searchParams)}
      sheets={[
        {
          id: SHIFT3_DATE_POSTER_ID,
          width: 1080,
          height: 1350,
          alt: `${SHIFT3.name} save the date, ${SHIFT3.datesWithYear}`,
          live: <ShiftThreeDateCover />,
        },
      ]}
    />
  );
}
