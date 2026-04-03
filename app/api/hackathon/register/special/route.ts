import { NextRequest, NextResponse } from "next/server";
import { hashPassword, generateSessionToken, SESSION_COOKIE, SESSION_EXPIRY_DAYS } from "@/lib/hackathon/auth";
import { findParticipantByEmail, createParticipant, createSession, getHackathonAdminClient } from "@/lib/hackathon/db";

const SPECIAL_CAP = 25;

async function getSpecialCount() {
  const { count } = await getHackathonAdminClient()
    .from("hackathon_participants")
    .select("id", { count: "exact", head: true })
    .eq("special_invite", true);
  return count ?? 0;
}

async function handlePOST(req: NextRequest) {
  const count = await getSpecialCount();
  if (count >= SPECIAL_CAP) {
    return NextResponse.json({ error: "Registration is closed — all special spots are taken!" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, phone, password, university, track, grade_level, experience_level, referral_source, bio, team_name } = body;

  if (!name || !email || !phone || !password || !university || !track || !grade_level || !experience_level || !referral_source || !bio) {
    return NextResponse.json({ error: "All required fields must be filled" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const existing = await findParticipantByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "This email is already registered for the hackathon" }, { status: 409 });
  }

  // Re-check count right before insert to guard against race conditions
  const countNow = await getSpecialCount();
  if (countNow >= SPECIAL_CAP) {
    return NextResponse.json({ error: "Registration is closed — all special spots are taken!" }, { status: 403 });
  }

  const password_hash = hashPassword(password);
  const participant = await createParticipant({
    name, email, phone, password_hash, university,
    role: "Participant", track, grade_level, experience_level,
    referral_source, bio, team_name,
    special_invite: true,
  });

  const token = generateSessionToken();
  await createSession(participant.id, token);

  const res = NextResponse.json({ participant });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
    path: "/",
  });

  return res;
}

export async function POST(req: NextRequest) {
  try {
    return await handlePOST(req);
  } catch (err) {
    console.error("Special register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
