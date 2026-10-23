import type { Metadata } from "next";

import { SHIFT3 } from "@/components/shift/poster/shift3/facts";
import {
  Shift3BannerLinkedIn,
  Shift3BannerSquare,
  Shift3BannerX,
} from "@/components/shift/poster/shift3/bannerSheets";

/**
 * SHIFT[3] listing banners, cosmos style: X header (1500x500), LinkedIn cover
 * (1584x396) and LINE OA rich message (1040x1040). Facts come from
 * SHIFT_COHORT_3.
 * Export: node scripts/render-poster.mjs --route /shift/poster/3/banner
 *         --ids shift3-banner-x,shift3-banner-li,shift3-banner-square --out <dir>
 */

export const metadata: Metadata = {
  title: `${SHIFT3.name} banners`,
  description: `${SHIFT3.name} ${SHIFT3.dates} ทุกเย็น ${SHIFT3.time} น. บน Discord`,
  robots: { index: false, follow: false },
};

export default function Shift3BannerPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 p-10">
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      <div className="flex flex-col items-start gap-10">
        <Shift3BannerX />
        <Shift3BannerLinkedIn />
        <Shift3BannerSquare />
      </div>
    </div>
  );
}
