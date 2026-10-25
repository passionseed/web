import type { Metadata } from "next";

import { SheetGallery, type SheetSearchParams, isRenderMode } from "@/components/shift/poster/SheetGallery";
import {
  HALLOWEEN_BANNER_H,
  HALLOWEEN_BANNER_W,
  SHIFT3_HALLOWEEN_BANNER_ID,
  ShiftPixelHalloweenBanner,
} from "@/components/shift/poster/pixel/halloween/ShiftPixelHalloweenBanner";
import { SHIFT3 } from "@/components/shift/poster/shift3/facts";
import {
  SHIFT3_BANNER_LI_ID,
  SHIFT3_BANNER_SQUARE_ID,
  SHIFT3_BANNER_X_ID,
  Shift3BannerLinkedIn,
  Shift3BannerSquare,
  Shift3BannerX,
} from "@/components/shift/poster/shift3/bannerSheets";

/**
 * SHIFT[3] listing banners: the Halloween pixel listing banner (1200x630,
 * SHIFT[1]'s pixel banner layout), then cosmos style X header (1500x500),
 * LinkedIn cover (1584x396) and LINE OA rich message (1040x1040). Facts come from
 * SHIFT_COHORT_3. Visitors see the exported images; ?render=1 shows the live
 * sheets.
 * Export: node scripts/render-poster.mjs --route /shift/poster/3/banner
 *         --ids shift3-halloween-banner,shift3-banner-x,shift3-banner-li,shift3-banner-square --out <dir>
 *         --publish public/shift/poster/3/sheets
 */

export const metadata: Metadata = {
  title: `${SHIFT3.name} banners`,
  description: `${SHIFT3.name} ${SHIFT3.dates} ทุกเย็น ${SHIFT3.time} น. บน Discord`,
  robots: { index: false, follow: false },
};

export default async function Shift3BannerPage({ searchParams }: { searchParams: SheetSearchParams }) {
  return (
    <SheetGallery
      dir="/shift/poster/3/sheets"
      render={await isRenderMode(searchParams)}
      sheets={[
        {
          id: SHIFT3_HALLOWEEN_BANNER_ID,
          width: HALLOWEEN_BANNER_W,
          height: HALLOWEEN_BANNER_H,
          alt: `${SHIFT3.name} listing banner, Halloween pixel`,
          live: <ShiftPixelHalloweenBanner />,
        },
        { id: SHIFT3_BANNER_X_ID, width: 1500, height: 500, alt: `${SHIFT3.name} X header`, live: <Shift3BannerX /> },
        {
          id: SHIFT3_BANNER_LI_ID,
          width: 1584,
          height: 396,
          alt: `${SHIFT3.name} LinkedIn cover`,
          live: <Shift3BannerLinkedIn />,
        },
        {
          id: SHIFT3_BANNER_SQUARE_ID,
          width: 1040,
          height: 1040,
          alt: `${SHIFT3.name} LINE square banner`,
          live: <Shift3BannerSquare />,
        },
      ]}
    />
  );
}
