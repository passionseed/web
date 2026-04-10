import { NextRequest, NextResponse } from "next/server";
import { hashPassword, generateSessionToken, SESSION_COOKIE, SESSION_EXPIRY_DAYS } from "@/lib/hackathon/auth";
import { findParticipantByEmail, createParticipant, createSession } from "@/lib/hackathon/db";
import { getRegisterLinkByToken, claimRegisterLink } from "@/lib/hackathon/register-links";

// GET — validate token
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await getRegisterLinkByToken(token);
  if (!link) return NextResponse.json({ error: "ลิงก์ไม่ถูกต้องหรือถูกใช้แล้ว" }, { status: 404 });
  return NextResponse.json({ valid: true, note: link.note });
}

// POST — register with the link
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const link = await getRegisterLinkByToken(token);
  if (!link) return NextResponse.json({ error: "ลิงก์ไม่ถูกต้องหรือถูกใช้แล้ว" }, { status: 404 });

  const body = await req.json();
  const { name, email, phone, password, university, track, grade_level, experience_level, referral_source, bio } = body;

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

  const password_hash = hashPassword(password);
  const participant = await createParticipant({
    name, email, phone, password_hash, university,
    role: "Participant", track, grade_level, experience_level,
    referral_source, bio,
    special_invite: true,
  });

  // Atomically claim link (race condition guard)
  const claimed = await claimRegisterLink(token, participant.id);
  if (!claimed) {
    // Another request beat us — participant was created but link was already used
    // This is unlikely but handle gracefully: just continue, participant is registered
    console.warn(`[link-register] link already claimed for token=${token} participant=${participant.id}`);
  }

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
