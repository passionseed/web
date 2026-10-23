import type { Metadata } from "next";

import { SHIFT3_STORIES } from "@/components/shift/poster/shift3-stories/Shift3Stories";
import { SHIFT_COHORT_3 } from "@/lib/content/shift-cohort";

/**
 * SHIFT[3] Instagram Story series (8 sheets, 1080x1920). Each sheet leaves an
 * empty glass slot for a sticker placed by hand; the note under it says when
 * to post and which sticker to drop there. The notes are page-only and are
 * not part of the exported PNGs.
 * Export: node scripts/render-poster.mjs --route /shift/poster/3/stories --ids <ids> --out <dir>
 */

export const metadata: Metadata = {
  title: `${SHIFT_COHORT_3.name} Stories`,
  robots: { index: false, follow: false },
};

export default function Shift3StoriesPage() {
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 p-10">
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      <div className="flex flex-wrap items-start gap-10">
        {SHIFT3_STORIES.map(({ id, title, note, Sheet }, i) => (
          // Whole-pixel caption line heights keep every sheet on an integer y:
          // a fractional row offset made element screenshots 1080x1921.
          <figure key={id} className="flex w-[1080px] flex-col gap-4">
            <Sheet />
            <figcaption className="space-y-1 font-mono text-[15px] leading-[24px] text-neutral-400">
              <p className="text-neutral-200">
                {String(i + 1).padStart(2, "0")} · {title} · <span className="text-neutral-500">#{id}</span>
              </p>
              <p>Post: {note.postOn}</p>
              <p>
                Sticker ({note.sticker}), placed by hand on the empty glass slot: {note.setup}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
