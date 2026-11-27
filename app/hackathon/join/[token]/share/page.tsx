import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { ShareView } from "@/components/hackathon/elemental/share/ShareView";
import { teamStyleFonts } from "@/components/hackathon/elemental/team-style/fonts";
import { TeamLine } from "@/components/hackathon/elemental/team-style/TeamLine";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { shareCode, sharePhase } from "@/lib/hackathon/elemental/share";
import type { ShareLinkView } from "@/lib/hackathon/elemental/share-rules";
import { posterVersion } from "@/lib/hackathon/elemental/share-poster";
import { getShareContext, getStudentLink, linkView } from "@/lib/supabase/hackathon-share-links";
import { loadTeamStyleCard } from "@/lib/supabase/hackathon-team-style";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `แชร์โปสเตอร์ ${ELEMENTAL.edition} Hackathon`,
  robots: { index: false, follow: false },
  // The URL holds the pay token: don't leak it to other sites.
  referrer: "no-referrer",
};

/** One sign-up's share page: pick a school, get a poster and link with their own code, watch the numbers. */
export default async function ElementalSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reg = await getShareContext(token);
  if (!reg) notFound();

  const phase = sharePhase();
  let state: "open" | "after-close" | "closed" | "cancelled" = reg.status === "cancelled" ? "cancelled" : phase === "off" ? "closed" : phase;
  let link: ShareLinkView | null = null;
  let version = "";
  let teamRow: React.ReactNode = null;
  if (state === "open" || state === "after-close") {
    try {
      const [own, v] = await Promise.all([getStudentLink(reg.id), posterVersion()]);
      link = own ? await linkView(ELEMENTAL.slug, own) : null;
      version = v;
      // The team's line on the board: sharing earns its name styles. Null before the board launches or on any error.
      if (link) {
        const style = await loadTeamStyleCard(ELEMENTAL.slug, { id: reg.id, team: reg.teamId ? { id: reg.teamId } : null }, `/hackathon/join/${token}/share`);
        if (style) teamRow = <TeamLine token={token} data={style} />;
      }
    } catch (error) {
      // No share tables yet, or the database is down: show "not open" rather than break.
      console.error("[elemental share] could not load the share state", error);
      state = "closed";
    }
  }

  return (
    <div className={`${trirong.variable} ${teamStyleFonts}`}>
      <ShareView
        token={token}
        state={state}
        link={link}
        code={shareCode(reg.id)}
        startQuery={reg.school ?? ""}
        posterVersion={version}
        teamRow={teamRow}
      />
    </div>
  );
}
