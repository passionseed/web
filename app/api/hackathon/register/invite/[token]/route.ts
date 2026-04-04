import { NextRequest, NextResponse } from "next/server";
import { hashPassword, generateSessionToken, SESSION_COOKIE, SESSION_EXPIRY_DAYS } from "@/lib/hackathon/auth";
import { findParticipantByEmail, createParticipant, createSession, getHackathonAdminClient } from "@/lib/hackathon/db";
import { getInviteByToken, claimInvite, isInviteEnabled } from "@/lib/hackathon/invites";

// GET — validate token and return team info
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const enabled = await isInviteEnabled();
  if (!enabled) return NextResponse.json({ error: "ฟีเจอร์นี้ปิดอยู่" }, { status: 403 });

  const invite = await getInviteByToken(token);
  if (!invite) return NextResponse.json({ error: "ลิงก์ไม่ถูกต้องหรือถูกใช้แล้ว" }, { status: 404 });

  return NextResponse.json({ team: invite.team });
}

// POST — register and auto-join the team
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  console.log(`[invite-register] POST token=${token}`);

  const enabled = await isInviteEnabled();
  console.log(`[invite-register] isInviteEnabled=${enabled}`);
  if (!enabled) return NextResponse.json({ error: "ฟีเจอร์นี้ปิดอยู่" }, { status: 403 });

  const invite = await getInviteByToken(token);
  console.log(`[invite-register] getInviteByToken result=${JSON.stringify(invite)}`);
  if (!invite) return NextResponse.json({ error: "ลิงก์ไม่ถูกต้องหรือถูกใช้แล้ว" }, { status: 404 });

  if (invite.team.member_count >= 5) {
    console.log(`[invite-register] team full member_count=${invite.team.member_count}`);
    return NextResponse.json({ error: "ทีมเต็มแล้ว (5 คน)" }, { status: 400 });
  }

  const body = await req.json();
  const { name, email, phone, password, university, track, grade_level, experience_level, referral_source, bio } = body;

  if (!name || !email || !phone || !password || !university || !track || !grade_level || !experience_level || !referral_source || !bio) {
    console.log(`[invite-register] missing fields`);
    return NextResponse.json({ error: "All required fields must be filled" }, { status: 400 });
  }
  if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

  const existing = await findParticipantByEmail(email);
  if (existing) {
    console.log(`[invite-register] email already registered: ${email}`);
    return NextResponse.json({ error: "This email is already registered for the hackathon" }, { status: 409 });
  }

  // Atomically claim the invite before creating the account
  const claimed = await claimInvite(token);
  console.log(`[invite-register] claimInvite result=${claimed}`);
  if (!claimed) return NextResponse.json({ error: "ลิงก์ไม่ถูกต้องหรือถูกใช้แล้ว" }, { status: 404 });

  const password_hash = hashPassword(password);
  const participant = await createParticipant({ name, email, phone, password_hash, university, role: "Participant", track, grade_level, experience_level, referral_source, bio });

  // Record who used the invite now that we have the real participant id
  const client = getHackathonAdminClient();
  await client.from("hackathon_team_invites").update({ used_by: participant.id }).eq("token", token);

  // Add to team
  await client.from("hackathon_team_members").insert({ team_id: invite.team_id, participant_id: participant.id });

  const sessionToken = generateSessionToken();
  await createSession(participant.id, sessionToken);

  const res = NextResponse.json({ participant });
  res.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
    path: "/",
  });

  return res;
}
