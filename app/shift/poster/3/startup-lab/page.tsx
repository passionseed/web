import type { Metadata } from "next";

import { SheetGallery, type SheetSearchParams, isRenderMode } from "@/components/shift/poster/SheetGallery";
import {
  SHIFT3_LAB_IDS,
  SHIFT3_LAB_KEYS,
  SHIFT3_LAB_POSTERS,
} from "@/components/shift/poster/pixel/halloween/lab/ShiftStartupLabPosters";
import { SHIFT3 } from "@/components/shift/poster/shift3/facts";

/**
 * SHIFT[3] as a small startup lab: five Halloween pixel posters at
 * 1080x1350, one per point of view (founder, customer, Demo Day audience,
 * parent, the lab). Call to action "comment SHIFT". Visitors see the
 * exported images; ?render=1 shows the live sheets.
 * Export: node scripts/render-poster.mjs --route /shift/poster/3/startup-lab
 *         --ids shift3-lab-01,...,shift3-lab-05 --out <dir>
 *         --publish public/shift/poster/3/sheets
 */

export const metadata: Metadata = {
  title: `${SHIFT3.name} startup lab posters`,
  description: `${SHIFT3.name} แล็บสตาร์ทอัพเล็กๆ ${SHIFT3.days} คืน ${SHIFT3.dates} คอมเมนต์ ${SHIFT3.keyword} รับลิงก์สมัคร`,
  robots: { index: false, follow: false },
};

export default async function Shift3StartupLabPage({ searchParams }: { searchParams: SheetSearchParams }) {
  return (
    <SheetGallery
      dir="/shift/poster/3/sheets"
      render={await isRenderMode(searchParams)}
      sheets={SHIFT3_LAB_POSTERS.map((live, i) => ({
        id: SHIFT3_LAB_IDS[i],
        width: 1080,
        height: 1350,
        alt: `${SHIFT3.name} startup lab poster, ${SHIFT3_LAB_KEYS[i]} point of view`,
        live,
      }))}
    />
  );
}
