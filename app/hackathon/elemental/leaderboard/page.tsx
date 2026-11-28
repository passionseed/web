import type { Metadata } from "next";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { LeaderboardView } from "@/components/hackathon/elemental/leaderboard/LeaderboardView";
import { teamStyleFonts } from "@/components/hackathon/elemental/team-style/fonts";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { boardPhase } from "@/lib/hackathon/elemental/team-style-phase";
import { leaderboardPayload } from "@/lib/supabase/hackathon-leaderboard";

// Live numbers on every request, never at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `กระดานทีม ${ELEMENTAL.edition} Hackathon`,
  description: `ทีมที่ชวนเพื่อนมาสมัคร ${ELEMENTAL.edition} Hackathon ได้มากที่สุด`,
  // Board and school names of students: fine to share, not for search results.
  robots: { index: false, follow: true },
};

/** The public team board: "coming soon" until sharing opens, live while it's open, final (frozen) after close. */
export default async function ElementalLeaderboardPage() {
  const phase = boardPhase();
  const initial = await leaderboardPayload(ELEMENTAL.slug, phase);
  return (
    <div className={`${trirong.variable} ${teamStyleFonts}`}>
      <LeaderboardView initial={initial} poll={phase === "live"} />
    </div>
  );
}
