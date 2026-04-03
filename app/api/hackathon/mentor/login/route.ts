import { NextRequest, NextResponse } from "next/server";
import {
  verifyMentorPassword,
  generateMentorSessionToken,
  findMentorByEmail,
  createMentorSession,
  MENTOR_SESSION_COOKIE,
} from "@/lib/hackathon/mentor-db";

const SESSION_EXPIRY_DAYS = 7;

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const mentor = await findMentorByEmail(email);
    if (!mentor || !verifyMentorPassword(password, mentor.password_hash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = generateMentorSessionToken();
    await createMentorSession(mentor.id, token);

    const { password_hash: _, ...safe } = mentor;
    const res = NextResponse.json({ mentor: safe });
    res.cookies.set(MENTOR_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("Mentor login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
