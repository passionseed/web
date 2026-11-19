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
  title: `${ELEMENTAL.edition} Hackathon poster`,
  description: `${ELEMENTAL.edition} Hackathon by ${ELEMENTAL.series} and PassionSeed: a calm river valley poisoned by pixel fire, smog, toxic water and an e-waste dump`,
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
          alt: `${ELEMENTAL.edition} Hackathon poster: a calm river valley under a grey sky, poisoned by pixels. A fire bursts out of the far bank, smog pours over the ridge, the river turns toxic green and an e-waste dump sits on the bank`,
          live: <ElementalKeyPoster />,
        },
        {
          id: "elemental-key-blue",
          width: W,
          height: H,
          alt: `${ELEMENTAL.edition} Hackathon poster, the same scene under a blue sky`,
          live: <ElementalKeyPoster id="elemental-key-blue" sky="blue" />,
        },
      ]}
    />
  );
}
