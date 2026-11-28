import type { Metadata } from "next";

import { SheetGallery, type SheetSearchParams, isRenderMode } from "@/components/shift/poster/SheetGallery";
import { ElementalNewsPoster, H, W } from "@/components/hackathon/poster/elemental/news/ElementalNewsPoster";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

/**
 * Elemental Hackathon, Instagram announcement: longer dates, the hand-in day,
 * and the Demo Day at CSII. Visitors see the exported image; ?render=1 shows
 * the live sheet.
 * Export: node scripts/render-poster.mjs --route /hackathon/poster/elemental/news
 *         --ids elemental-news --out <dir> --publish public/hackathon/poster/elemental/news/sheets
 */

export const metadata: Metadata = {
  title: `${ELEMENTAL.edition} Hackathon: news`,
  description: `${ELEMENTAL.edition} Hackathon: longer dates and a Demo Day at CSII, Chulalongkorn University`,
  robots: { index: false, follow: false },
};

export default async function ElementalNewsPage({ searchParams }: { searchParams: SheetSearchParams }) {
  return (
    <SheetGallery
      dir="/hackathon/poster/elemental/news/sheets"
      render={await isRenderMode(searchParams)}
      sheets={[
        {
          id: "elemental-news",
          width: W,
          height: H,
          alt: `${ELEMENTAL.edition} Hackathon news: now 5 to 10 December, videos due 10 December, and a Demo Day at CSII, Chulalongkorn University, with a QR code to sign up`,
          live: <ElementalNewsPoster />,
        },
      ]}
    />
  );
}
