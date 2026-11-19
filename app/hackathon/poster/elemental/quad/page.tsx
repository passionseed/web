import type { Metadata } from "next";

import { SheetGallery, type SheetSearchParams, isRenderMode } from "@/components/shift/poster/SheetGallery";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { ElementalQuadSheet, ElementalQuadTile, QUAD_KEYS, SHEET, TILE } from "@/components/hackathon/poster/elemental/quad/ElementalQuad";

/**
 * Elemental quad: four element tiles that make one circle, plus the four
 * together on one sheet. Visitors see the exported images; ?render=1 shows
 * the live sheets.
 * Art: node scripts/render-elemental-quad.mjs
 * Export: node scripts/render-poster.mjs --route /hackathon/poster/elemental/quad
 *         --ids elemental-quad,elemental-tile-air,elemental-tile-fire,elemental-tile-water,elemental-tile-earth
 *         --out <dir> --publish public/hackathon/poster/elemental/quad/sheets
 */

export const metadata: Metadata = {
  title: `${ELEMENTAL.edition} Hackathon quad`,
  description: `${ELEMENTAL.edition} Hackathon: four elements, one circle`,
  robots: { index: false, follow: false },
};

export default async function ElementalQuadPage({ searchParams }: { searchParams: SheetSearchParams }) {
  return (
    <SheetGallery
      dir="/hackathon/poster/elemental/quad/sheets"
      render={await isRenderMode(searchParams)}
      sheets={[
        { id: "elemental-quad", width: SHEET, height: SHEET, alt: `${ELEMENTAL.edition} Hackathon, four elements in one circle`, live: <ElementalQuadSheet /> },
        ...QUAD_KEYS.map((k) => ({
          id: `elemental-tile-${k}`,
          width: TILE,
          height: TILE,
          alt: `${ELEMENTAL.edition} Hackathon, ${k} tile`,
          live: <ElementalQuadTile k={k} id={`elemental-tile-${k}`} />,
        })),
      ]}
    />
  );
}
