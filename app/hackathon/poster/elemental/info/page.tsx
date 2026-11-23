import type { Metadata } from "next";

import { SheetGallery, type SheetSearchParams, isRenderMode } from "@/components/shift/poster/SheetGallery";
import { ElementalInfoPoster, H, W } from "@/components/hackathon/poster/elemental/info/ElementalInfoPoster";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

/**
 * Elemental Hackathon, Instagram slide 2: every fact in one place.
 * Visitors see the exported image; ?render=1 shows the live sheet.
 * Export: node scripts/render-poster.mjs --route /hackathon/poster/elemental/info
 *         --ids elemental-info --out <dir> --publish public/hackathon/poster/elemental/info/sheets
 */

export const metadata: Metadata = {
  title: `${ELEMENTAL.edition} Hackathon: details`,
  description: `${ELEMENTAL.edition} Hackathon: dates, format, who can join, teams, price, prizes, the five elements and the schedule`,
  robots: { index: false, follow: false },
};

export default async function ElementalInfoPage({ searchParams }: { searchParams: SheetSearchParams }) {
  return (
    <SheetGallery
      dir="/hackathon/poster/elemental/info/sheets"
      render={await isRenderMode(searchParams)}
      sheets={[
        {
          id: "elemental-info",
          width: W,
          height: H,
          alt: `${ELEMENTAL.edition} Hackathon details: dates, online on Discord, who can join, teams, price, the three prizes, the five elements, the schedule and a QR code to sign up`,
          live: <ElementalInfoPoster />,
        },
      ]}
    />
  );
}
