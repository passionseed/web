import type { Metadata } from "next";

import { SheetGallery, type SheetSearchParams, isRenderMode } from "@/components/shift/poster/SheetGallery";
import { ElementalAskFeed, ElementalAskStory, FEED, STORY } from "@/components/hackathon/poster/elemental/ask/ElementalAskPoster";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

/**
 * Elemental Hackathon: ask us your questions (Linear HAC-81). A feed post
 * that asks for comments, and a Story frame with room for the question
 * sticker (plus a mock of it, for review only). ?render=1 shows the live
 * sheets.
 * Export: node scripts/render-poster.mjs --route /hackathon/poster/elemental/ask
 *         --ids elemental-ask-feed,elemental-ask-story,elemental-ask-story-mock --out <dir>
 */

export const metadata: Metadata = {
  title: `${ELEMENTAL.edition} Hackathon: ask us`,
  description: `${ELEMENTAL.edition} Hackathon: comment your questions, and we answer them in a follow-up post`,
  robots: { index: false, follow: false },
};

export default async function ElementalAskPage({ searchParams }: { searchParams: SheetSearchParams }) {
  return (
    <SheetGallery
      dir="/hackathon/poster/elemental/ask/sheets"
      render={await isRenderMode(searchParams)}
      sheets={[
        {
          id: "elemental-ask-feed",
          width: FEED.w,
          height: FEED.h,
          alt: `${ELEMENTAL.edition} Hackathon: got a question? Comment it. The poisoned river valley from the key poster, with the question mark made of violet pixels`,
          live: <ElementalAskFeed />,
        },
        {
          id: "elemental-ask-story",
          width: STORY.w,
          height: STORY.h,
          alt: `${ELEMENTAL.edition} Hackathon Story: got a question? Ask in the box`,
          live: <ElementalAskStory />,
        },
        {
          id: "elemental-ask-story-mock",
          width: STORY.w,
          height: STORY.h,
          alt: `${ELEMENTAL.edition} Hackathon Story with a stand-in question sticker, for review`,
          live: <ElementalAskStory id="elemental-ask-story-mock" mock />,
        },
      ]}
    />
  );
}
