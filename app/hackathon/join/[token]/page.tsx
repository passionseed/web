import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { PayView, type ShareCardData } from "@/components/hackathon/elemental/PayView";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { elementalCommunityLinks } from "@/lib/hackathon/elemental/community-links";
import { parseElementalDiscordOutcome } from "@/lib/hackathon/elemental/discordLink";
import { elementalPayQr } from "@/lib/hackathon/elemental/pay-qr";
import { shareOpen } from "@/lib/hackathon/elemental/share";
import { getRegistrationByToken } from "@/lib/supabase/hackathon-event-registrations";
import { getLiveClaim, releaseExpiredHolds, seatsLeft } from "@/lib/supabase/hackathon-share-claims";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `ชำระค่าสมัคร ${ELEMENTAL.edition} Hackathon`,
  robots: { index: false, follow: false },
  // The URL holds the pay token: don't leak it to other sites.
  referrer: "no-referrer",
};

/** The pay page for one sign-up. The token in the URL is the only key. */
export default async function ElementalPayPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ discord?: string | string[] }>;
}) {
  const { token } = await params;
  const { discord } = await searchParams;
  const discordOutcome = parseElementalDiscordOutcome(Array.isArray(discord) ? discord[0] : discord);
  const reg = await getRegistrationByToken(token, ELEMENTAL.maxGroupSize);
  if (!reg) notFound();
  const pending = reg.status === "pending";
  const qrSrc = pending ? await elementalPayQr(reg.amountBaht) : null;
  // Only a paid page renders these.
  const links = reg.status === "paid" ? elementalCommunityLinks() : { line: null, discord: null };
  const share = pending && shareOpen() ? await shareCard(token, reg.id) : null;

  return (
    <div className={trirong.variable}>
      <PayView token={token} reg={reg} qrSrc={qrSrc} links={links} discordOutcome={discordOutcome} share={share} />
    </div>
  );
}

/** The share card's state. Never breaks the pay page: on any error there is no card. */
async function shareCard(token: string, registrationId: string): Promise<ShareCardData | null> {
  try {
    await releaseExpiredHolds(ELEMENTAL.slug);
    const [claim, left] = await Promise.all([getLiveClaim(registrationId), seatsLeft(ELEMENTAL.slug)]);
    const live = claim && (claim.status === "held" || claim.status === "sent") ? claim : null;
    return {
      href: `/hackathon/join/${token}/share`,
      seatsLeft: left,
      schoolName: live?.schoolName ?? null,
      status: live ? (live.status as "held" | "sent") : null,
    };
  } catch (error) {
    console.error("[elemental share] no share card", error);
    return null;
  }
}
