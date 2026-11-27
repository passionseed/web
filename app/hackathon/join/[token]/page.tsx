import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { PayView, type ShareCardData } from "@/components/hackathon/elemental/PayView";
import { teamStyleFonts } from "@/components/hackathon/elemental/team-style/fonts";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { elementalCommunityLinks } from "@/lib/hackathon/elemental/community-links";
import { parseElementalDiscordOutcome } from "@/lib/hackathon/elemental/discordLink";
import { elementalPayQr } from "@/lib/hackathon/elemental/pay-qr";
import { shareCode, shareOpen } from "@/lib/hackathon/elemental/share";
import { hasPaid } from "@/lib/hackathon/elemental/share-rules";
import { getRegistrationByToken } from "@/lib/supabase/hackathon-event-registrations";
import { loadTeamStyleCard } from "@/lib/supabase/hackathon-team-style";
import { getStudentLink, linkView } from "@/lib/supabase/hackathon-share-links";

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
  // Paid or not, anyone signed up can share for a school's free seat.
  const share = reg.status !== "cancelled" && shareOpen() ? await shareCard(token, reg) : null;
  // The team's name style and board rank. Null on any error, so this page never breaks because of it.
  const teamStyle =
    reg.status !== "cancelled" && shareOpen()
      ? await loadTeamStyleCard(ELEMENTAL.slug, reg, `/hackathon/join/${token}/share`)
      : null;

  return (
    <div className={`${trirong.variable} ${teamStyleFonts}`}>
      <PayView token={token} reg={reg} qrSrc={qrSrc} links={links} discordOutcome={discordOutcome} share={share} teamStyle={teamStyle} />
    </div>
  );
}

/** The share card's state. Never breaks the pay page: on any error there is no card. */
async function shareCard(token: string, reg: { id: string; status: string }): Promise<ShareCardData | null> {
  try {
    const own = await getStudentLink(reg.id);
    return {
      href: `/hackathon/join/${token}/share`,
      pollUrl: `/api/hackathon/elemental/${token}/share`,
      code: shareCode(reg.id),
      selfPaid: hasPaid(reg.status),
      link: own ? await linkView(ELEMENTAL.slug, own, reg) : null,
    };
  } catch (error) {
    console.error("[elemental share] no share card", error);
    return null;
  }
}
