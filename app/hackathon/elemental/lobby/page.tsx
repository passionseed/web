import type { Metadata } from "next";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { LobbyView } from "@/components/hackathon/elemental/lobby/LobbyView";
import { teamStyleFonts } from "@/components/hackathon/elemental/team-style/fonts";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { elementalRegistrationOpen } from "@/lib/hackathon/elemental/registration";
import { lobbyPayload } from "@/lib/supabase/hackathon-leaderboard";

// Live names on every request, never at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `ห้องรอ ${ELEMENTAL.edition} Hackathon`,
  description: `ทีมที่สมัคร ${ELEMENTAL.edition} Hackathon แล้ว รอเปิดงานด้วยกัน`,
  // Board names of students: fine to share, not for search results.
  robots: { index: false, follow: true },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * The waiting room: a countdown to the opening and every team's custom name.
 * "Coming soon" until sharing opens; it stays up through the opening and
 * Demo Day, then the names stay as a wall. ?tv=1 is the projector view for
 * the opening stream.
 */
export default async function ElementalLobbyPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const tv = (Array.isArray(params.tv) ? params.tv[0] : params.tv) === "1";
  const initial = await lobbyPayload(ELEMENTAL.slug);
  const poll = initial.state === "waiting" || initial.state === "started" || initial.state === "unavailable";
  return (
    <div className={`${trirong.variable} ${teamStyleFonts}`}>
      <LobbyView initial={initial} poll={poll} tv={tv} signUpOpen={elementalRegistrationOpen()} />
    </div>
  );
}
