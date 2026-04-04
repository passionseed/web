import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant, getParticipantTeam } from "@/lib/hackathon/db";
import { isInviteEnabled, getExistingInvite, createInvite, deleteTeamInvites, teamAlreadyUsedInvite } from "@/lib/hackathon/invites";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const participant = await getSessionParticipant(token);
  if (!participant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enabled = await isInviteEnabled();
  if (!enabled) return NextResponse.json({ error: "ฟีเจอร์นี้ปิดอยู่" }, { status: 403 });

  const team = await getParticipantTeam(participant.id);
  if (!team) return NextResponse.json({ error: "คุณยังไม่มีทีม" }, { status: 400 });
  if (team.owner_id !== participant.id) return NextResponse.json({ error: "เฉพาะหัวหน้าทีมเท่านั้น" }, { status: 403 });
  if (team.members.length >= 5) return NextResponse.json({ error: "ทีมเต็มแล้ว (5 คน)" }, { status: 400 });

  const alreadyUsed = await teamAlreadyUsedInvite(team.id);
  if (alreadyUsed) return NextResponse.json({ error: "ทีมนี้ใช้ลิงก์เชิญไปแล้ว 1 ครั้ง" }, { status: 400 });

  // Delete any old unused invite and create a fresh one
  await deleteTeamInvites(team.id);
  const invite = await createInvite(team.id);

  return NextResponse.json({ token: invite.token });
}
