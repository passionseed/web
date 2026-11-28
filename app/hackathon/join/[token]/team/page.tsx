import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { teamStyleFonts } from "@/components/hackathon/elemental/team-style/fonts";
import { TeamEditor, TeamEditorUnavailable } from "@/components/hackathon/elemental/team-style/TeamEditor";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { getRegistrationByToken } from "@/lib/supabase/hackathon-event-registrations";
import { loadTeamStyleCard } from "@/lib/supabase/hackathon-team-style";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `custom ชื่อทีม ${ELEMENTAL.edition} Hackathon`,
  robots: { index: false, follow: false },
  // The URL holds the pay token: don't leak it to other sites.
  referrer: "no-referrer",
};

/**
 * The team editor for one sign-up: the team's board name and name style,
 * full screen on the dark ground. The token in the URL is the only key, as on
 * the pay page. Saving goes through POST /api/hackathon/elemental/<token>/team-style,
 * which checks the name, the lists and what the team has unlocked.
 */
export default async function TeamEditorPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reg = await getRegistrationByToken(token, ELEMENTAL.maxGroupSize);
  if (!reg || reg.status === "cancelled") notFound();
  const payHref = `/hackathon/join/${token}`;
  // Null before the board launches, or on any error: then there is nothing to edit yet.
  const data = await loadTeamStyleCard(ELEMENTAL.slug, reg, `/hackathon/join/${token}/share`);

  return (
    <div className={`${trirong.variable} ${teamStyleFonts}`}>
      {data ? (
        <TeamEditor token={token} data={data} payHref={payHref} boardHref={`/hackathon/elemental/leaderboard#${data.key}`} />
      ) : (
        <TeamEditorUnavailable payHref={payHref} />
      )}
    </div>
  );
}
