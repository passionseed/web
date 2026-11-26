import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { ShareView, type ShareClaimView } from "@/components/hackathon/elemental/share/ShareView";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { shareOpen } from "@/lib/hackathon/elemental/share";
import { posterVersion } from "@/lib/hackathon/elemental/share-poster";
import { getLiveClaim, getShareContext, releaseExpiredHolds, seatsLeft } from "@/lib/supabase/hackathon-share-claims";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `แชร์รับที่นั่งฟรี ${ELEMENTAL.edition} Hackathon`,
  robots: { index: false, follow: false },
  // The URL holds the pay token: don't leak it to other sites.
  referrer: "no-referrer",
};

/** One sign-up's share page: pick a school, get a poster with their own QR code. */
export default async function ElementalSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reg = await getShareContext(token);
  if (!reg) notFound();

  let claim: ShareClaimView | null = null;
  let left = 0;
  let version = "";
  let state: "open" | "closed" | "paid" = shareOpen() ? (reg.status === "pending" ? "open" : "paid") : "closed";
  try {
    await releaseExpiredHolds(ELEMENTAL.slug);
    const [c, n, v] = await Promise.all([getLiveClaim(reg.id), seatsLeft(ELEMENTAL.slug), posterVersion()]);
    if (c && c.status !== "released") {
      claim = { code: c.code, schoolName: c.schoolName, province: c.province, status: c.status, heldUntil: c.heldUntil };
    }
    left = n;
    version = v;
  } catch (error) {
    // No claims table yet, or the database is down: show "not open" rather than break.
    console.error("[elemental share] could not load the share state", error);
    state = "closed";
  }

  return (
    <div className={trirong.variable}>
      <ShareView token={token} state={state} claim={claim} seatsLeft={left} startQuery={reg.school ?? ""} posterVersion={version} />
    </div>
  );
}
