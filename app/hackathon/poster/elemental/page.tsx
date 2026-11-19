import type { Metadata } from "next";

import { SheetGallery, type SheetSearchParams, isRenderMode } from "@/components/shift/poster/SheetGallery";
import { ElementalKeyPoster, H, W } from "@/components/hackathon/poster/elemental/ElementalKeyPoster";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

/**
 * The Next Decade: Elemental key visual. Visitors see the exported image;
 * ?render=1 shows the live sheet.
 * Export: node scripts/render-poster.mjs --route /hackathon/poster/elemental
 *         --ids elemental-key --out <dir>
 *         --publish public/hackathon/poster/elemental/sheets
 */

export const metadata: Metadata = {
  title: `${ELEMENTAL.series}: ${ELEMENTAL.edition} poster`,
  description: `${ELEMENTAL.series}: ${ELEMENTAL.edition} hackathon key visual`,
  robots: { index: false, follow: false },
};

export default async function ElementalPosterPage({ searchParams }: { searchParams: SheetSearchParams }) {
  return (
    <SheetGallery
      dir="/hackathon/poster/elemental/sheets"
      render={await isRenderMode(searchParams)}
      sheets={[
        {
          id: "elemental-key",
          width: W,
          height: H,
          alt: `${ELEMENTAL.series}: ${ELEMENTAL.edition}, a fire on open ground breaking into pixels, with the five elements marked`,
          live: <ElementalKeyPoster />,
        },
        {
          id: "elemental-key-blue",
          width: W,
          height: H,
          alt: `${ELEMENTAL.series}: ${ELEMENTAL.edition}, the same scene under a blue sky`,
          live: <ElementalKeyPoster id="elemental-key-blue" sky="blue" />,
        },
      ]}
    />
  );
}
