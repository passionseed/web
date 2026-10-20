import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BoardGate } from "@/components/shift/alumni-board/BoardGate";
import { BoardShell } from "@/components/shift/alumni-board/BoardShell";
import { boardAccessFor } from "@/components/shift/alumni-board/boardPage";
import { MeetingsCard } from "@/components/shift/alumni-board/Meetings";
import { NoTeam, TeamList, TeamMembersCard, TeamTestsCard } from "@/components/shift/alumni-board/TeamCards";
import { BOARD_PATH, canSeeTeam } from "@/lib/shift/alumniBoard";
import { currentRound } from "@/lib/supabase/shift-alumni-board/core";
import { getTeam, listTeams, teamMeetings, teamMembers } from "@/lib/supabase/shift-alumni-board/team";
import { teamTests } from "@/lib/supabase/shift-alumni-board/tests";

/**
 * /shift/alumni/board/team: the team's goals, work meetings, standups and
 * help on stuck. Students see only their own team; mentors pick any with ?id=.
 */

export const metadata: Metadata = {
  title: "ทีม | SHIFT Alumni",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AlumniBoardTeamPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const access = await boardAccessFor(`${BOARD_PATH}/team${id ? `?id=${encodeURIComponent(id)}` : ""}`);
  if (access.kind !== "ok") {
    return (
      <BoardShell>
        <BoardGate access={access} />
      </BoardShell>
    );
  }
  const { viewer } = access;
  const mentor = viewer.role === "mentor";
  const teamId = mentor && id && UUID.test(id) ? id : viewer.teamId;

  if (!teamId) {
    return <BoardShell mentor={mentor}>{mentor ? <TeamList teams={await listTeams()} /> : <NoTeam />}</BoardShell>;
  }
  const team = canSeeTeam(viewer, teamId) ? await getTeam(teamId) : null;
  if (!team) notFound();

  const round = await currentRound();
  const [members, meetings] = await Promise.all([teamMembers(team.id, round), teamMeetings(team.id, round)]);
  const tests = await teamTests(members.map((m) => m.user_id));

  return (
    <BoardShell mentor={mentor}>
      <TeamMembersCard team={team} members={members} tests={tests} />
      <MeetingsCard teamId={team.id} meetings={meetings} viewerId={viewer.userId} inTeam={viewer.teamId === team.id} />
      <TeamTestsCard tests={tests} />
    </BoardShell>
  );
}
