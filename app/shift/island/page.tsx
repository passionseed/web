import type { Metadata } from "next";

import { IslandInvite } from "@/components/shift/island/IslandInvite";
import { festivalLine } from "@/lib/content/shift-island-invite";
import { SHIFT_ISLAND } from "@/lib/content/shift-island";
import { loadIslandViewer } from "@/lib/supabase/shift-island-viewer";

/**
 * /shift/island: the SHIFT High Island festival invite, a message in a
 * bottle for SHIFT alumni. Unlisted: the link goes out in each round's group.
 */

const TITLE = "SHIFT High Island | เทศกาลเปิดเกาะ";

export const metadata: Metadata = {
  title: TITLE,
  robots: { index: false, follow: false },
  openGraph: {
    title: TITLE,
    type: "website",
    images: [
      {
        url: SHIFT_ISLAND.sample.src,
        width: SHIFT_ISLAND.sample.width,
        height: SHIFT_ISLAND.sample.height,
        alt: SHIFT_ISLAND.sample.alt,
      },
    ],
  },
};

/** Reads the visitor's session cookie, so it renders per request. */
export const dynamic = "force-dynamic";

export default async function ShiftIslandPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ viewer }, { at }] = await Promise.all([loadIslandViewer(), searchParams]);
  // `?at=seal` comes back from sign-in: open on the letter, at the seal.
  // Any other value is ignored.
  const initialScene = at === "seal" ? "letter" : undefined;
  // Computed here so the first client render never reads the clock.
  return <IslandInvite viewer={viewer} festival={festivalLine()} initialScene={initialScene} />;
}
