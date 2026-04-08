import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, generateSessionToken, SESSION_COOKIE, SESSION_EXPIRY_DAYS } from "@/lib/hackathon/auth";
import { findParticipantByEmail, createSession } from "@/lib/hackathon/db";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const participant = await findParticipantByEmail(email);
    console.log("[login] email lookup:", email.toLowerCase(), "found:", !!participant, "has_hash:", !!participant?.password_hash);
    if (!participant) {
      return NextResponse.json({ error: "Invalid email or password", debug: "participant_not_found" }, { status: 401 });
    }
    const passwordOk = verifyPassword(password, participant.password_hash);
    console.log("[login] verifyPassword result:", passwordOk);
    if (!passwordOk) {
      return NextResponse.json({ error: "Invalid email or password", debug: "password_mismatch" }, { status: 401 });
    }

    const token = generateSessionToken();
    await createSession(participant.id, token);

    const { password_hash: _, ...safe } = participant;

    const res = NextResponse.json({ participant: safe, token });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("Hackathon login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
