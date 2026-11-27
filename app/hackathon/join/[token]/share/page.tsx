import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { ShareView } from "@/components/hackathon/elemental/share/ShareView";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { shareOpen } from "@/lib/hackathon/elemental/share";
import { hasPaid, type ShareLinkView } from "@/lib/hackathon/elemental/share-rules";
import { posterVersion } from "@/lib/hackathon/elemental/share-poster";
import { getShareContext, getStudentLink, linkView } from "@/lib/supabase/hackathon-share-links";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `แชร์รับที่นั่งฟรี ${ELEMENTAL.edition} Hackathon`,
  robots: { index: false, follow: false },
  // The URL holds the pay token: don't leak it to other sites.
  referrer: "no-referrer",
};

/** One sign-up's share page: pick a school, get a poster and link with their own code, watch the numbers. */
export default async function ElementalSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reg = await getShareContext(token);
  if (!reg) notFound();

  let state: "open" | "closed" | "cancelled" = reg.status === "cancelled" ? "cancelled" : shareOpen() ? "open" : "closed";
  let link: ShareLinkView | null = null;
  let version = "";
  if (state === "open") {
    try {
      const [own, v] = await Promise.all([getStudentLink(reg.id), posterVersion()]);
      link = own ? await linkView(ELEMENTAL.slug, own, reg) : null;
      version = v;
    } catch (error) {
      // No share tables yet, or the database is down: show "not open" rather than break.
      console.error("[elemental share] could not load the share state", error);
      state = "closed";
    }
  }

  return (
    <div className={trirong.variable}>
      <ShareView
        token={token}
        state={state}
        link={link}
        selfPaid={hasPaid(reg.status)}
        startQuery={reg.school ?? ""}
        posterVersion={version}
      />
    </div>
  );
}
