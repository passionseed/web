import { NextRequest, NextResponse } from "next/server";
import {
  hashMentorPassword,
  generateMentorSessionToken,
  createMentorProfile,
  createMentorSession,
  findMentorByEmail,
  MENTOR_SESSION_COOKIE,
} from "@/lib/hackathon/mentor-db";

const SESSION_EXPIRY_DAYS = 7;

export async function POST(req: NextRequest) {
  try {
    const { full_name, email, password, profession, institution, bio, session_type } =
      await req.json();

    if (!full_name || !email || !password) {
      return NextResponse.json(
        { error: "full_name, email, and password are required" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await findMentorByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const password_hash = hashMentorPassword(password);
    const mentor = await createMentorProfile({
      full_name,
      email,
      password_hash,
      profession,
      institution,
      bio,
      session_type,
    });

    const token = generateMentorSessionToken();
    await createMentorSession(mentor.id, token);

    const res = NextResponse.json({ mentor });
    res.cookies.set(MENTOR_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("Mentor register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
