import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant, getParticipantTeam } from "@/lib/hackathon/db";
import { getExistingInvite, isInviteEnabled, isInvitedMember, teamAlreadyUsedInvite } from "@/lib/hackathon/invites";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const participant = await getSessionParticipant(token);
  if (!participant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await getParticipantTeam(participant.id);
  if (!team) return NextResponse.json({ invite: null, enabled: false, isInvited: false });

  const [enabled, invite, isInvited, alreadyUsed] = await Promise.all([
    isInviteEnabled(),
    getExistingInvite(team.id),
    isInvitedMember(participant.id),
    teamAlreadyUsedInvite(team.id),
  ]);

  return NextResponse.json({ invite: invite ? { token: invite.token } : null, enabled, isInvited, alreadyUsed });
}
