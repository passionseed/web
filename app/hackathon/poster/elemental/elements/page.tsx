import type { Metadata } from "next";

import { SheetGallery, type SheetSearchParams, isRenderMode } from "@/components/shift/poster/SheetGallery";
import { ELEMENT_KEYS, ElementalElementPoster, H, W } from "@/components/hackathon/poster/elemental/elements/ElementalElementPoster";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

/**
 * Elemental Hackathon: one poster per element. Visitors see the exported
 * images; ?render=1 shows the live sheets.
 * Plates: node scripts/render-elemental-element.mjs --element <key>
 * Export: node scripts/render-poster.mjs --route /hackathon/poster/elemental/elements
 *         --ids elemental-water,elemental-earth,elemental-air,elemental-fire,elemental-aether
 *         --out <dir> --publish public/hackathon/poster/elemental/elements/sheets
 */

export const metadata: Metadata = {
  title: `${ELEMENTAL.edition} Hackathon: the five elements`,
  description: `${ELEMENTAL.edition} Hackathon: one poster for each element, water, earth, air, fire and Aether`,
  robots: { index: false, follow: false },
};

export default async function ElementalElementsPage({ searchParams }: { searchParams: SheetSearchParams }) {
  return (
    <SheetGallery
      dir="/hackathon/poster/elemental/elements/sheets"
      render={await isRenderMode(searchParams)}
      sheets={ELEMENT_KEYS.map((key) => ({
        id: `elemental-${key}`,
        width: W,
        height: H,
        alt: `${ELEMENTAL.edition} Hackathon, ${key}: a calm, healthy place corrupted by its pollution in pixels`,
        live: <ElementalElementPoster element={key} />,
      }))}
    />
  );
}
