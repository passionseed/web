import type { Metadata } from "next";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { LeaderboardView } from "@/components/hackathon/elemental/leaderboard/LeaderboardView";
import { teamStyleFonts } from "@/components/hackathon/elemental/team-style/fonts";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { shareOpen } from "@/lib/hackathon/elemental/share";
import { leaderboardPayload } from "@/lib/supabase/hackathon-leaderboard";

// Live numbers on every request, never at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `กระดานทีม ${ELEMENTAL.edition} Hackathon`,
  description: `ทีมที่ชวนเพื่อนมาสมัคร ${ELEMENTAL.edition} Hackathon ได้มากที่สุด`,
  // Team and school names of students: fine to share, not for search results.
  robots: { index: false, follow: true },
};

/** The live public team board. "Coming soon" until sharing opens (shareOpen()). */
export default async function ElementalLeaderboardPage() {
  const open = shareOpen();
  const initial = await leaderboardPayload(ELEMENTAL.slug, open);
  return (
    <div className={`${trirong.variable} ${teamStyleFonts}`}>
      <LeaderboardView initial={initial} poll={open} />
    </div>
  );
}
