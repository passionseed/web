import type { Metadata } from "next";

import { SheetGallery, type SheetSearchParams, isRenderMode } from "@/components/shift/poster/SheetGallery";
import { A4_H, A4_W, ElementalA4Poster } from "@/components/hackathon/poster/elemental/a4/ElementalA4Poster";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

/**
 * Elemental Hackathon A4 poster. Visitors see the exported image;
 * ?render=1 shows the live sheet.
 * Art: node scripts/render-elemental-a4.mjs
 * Export: node scripts/render-poster.mjs --route /hackathon/poster/elemental/a4
 *         --ids elemental-a4 --out <dir> --publish public/hackathon/poster/elemental/a4/sheets
 */

export const metadata: Metadata = {
  title: `${ELEMENTAL.edition} Hackathon A4 poster`,
  description: `${ELEMENTAL.edition} Hackathon: fire, water, air and earth in pixels`,
  robots: { index: false, follow: false },
};

export default async function ElementalA4Page({ searchParams }: { searchParams: SheetSearchParams }) {
  return (
    <SheetGallery
      dir="/hackathon/poster/elemental/a4/sheets"
      render={await isRenderMode(searchParams)}
      sheets={[
        {
          id: "elemental-a4",
          width: A4_W,
          height: A4_H,
          alt: `${ELEMENTAL.edition} Hackathon poster: a circle of air, fire, water and earth in pixels`,
          live: <ElementalA4Poster />,
        },
      ]}
    />
  );
}
