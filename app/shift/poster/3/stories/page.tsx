import type { Metadata } from "next";

import { SheetGallery, type SheetSearchParams, isRenderMode } from "@/components/shift/poster/SheetGallery";
import { SHIFT3_STORIES } from "@/components/shift/poster/shift3-stories/Shift3Stories";
import { SHIFT_COHORT_3 } from "@/lib/content/shift-cohort";

/**
 * SHIFT[3] Instagram Story series (8 sheets, 1080x1920). Each sheet leaves an
 * empty glass slot for a sticker placed by hand; the note under it says when
 * to post and which sticker to drop there. The notes are page-only and are
 * not part of the exported PNGs. Visitors see the exported images; ?render=1
 * shows the live sheets.
 * Export: node scripts/render-poster.mjs --route /shift/poster/3/stories --ids <ids> --out <dir>
 *         --publish public/shift/poster/3/sheets
 */

export const metadata: Metadata = {
  title: `${SHIFT_COHORT_3.name} Stories`,
  robots: { index: false, follow: false },
};

export default async function Shift3StoriesPage({ searchParams }: { searchParams: SheetSearchParams }) {
  return (
    <SheetGallery
      dir="/shift/poster/3/sheets"
      render={await isRenderMode(searchParams)}
      sheets={SHIFT3_STORIES.map(({ id, title, note, Sheet }, i) => ({
        id,
        width: 1080,
        height: 1920,
        alt: `${SHIFT_COHORT_3.name} Story: ${title}`,
        live: <Sheet />,
        caption: (
          <>
            <p className="text-neutral-200">
              {String(i + 1).padStart(2, "0")} · {title}
            </p>
            <p>Post: {note.postOn}</p>
            <p>
              Sticker ({note.sticker}), placed by hand on the empty glass slot: {note.setup}
            </p>
          </>
        ),
      }))}
    />
  );
}
