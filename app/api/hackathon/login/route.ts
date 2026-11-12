import { checkHackathonAuthRateLimit } from "@/lib/hackathon/auth-rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, generateSessionToken, SESSION_COOKIE, SESSION_EXPIRY_DAYS, getCorsHeaders } from "@/lib/hackathon/auth";
import { findParticipantByEmail, createSession } from "@/lib/hackathon/db";

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req, "POST, OPTIONS");

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (typeof email !== "string") return NextResponse.json({ error: "Invalid email" }, { status: 400, headers: corsHeaders });
    if (!await checkHackathonAuthRateLimit(req, email, "login")) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: corsHeaders });
    }

    const participant = await findParticipantByEmail(email);
    // Uniform failure response — do not reveal whether the email exists
    // (avoids user enumeration via the previous `debug` field), and do not
    // log the looked-up email or password verification result.
    if (!participant) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401, headers: corsHeaders }
      );
    }
    const passwordOk = verifyPassword(password, participant.password_hash);
    if (!passwordOk) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = generateSessionToken();
    await createSession(participant.id, token);

    const { password_hash: _, ...safe } = participant;

    const res = NextResponse.json({ participant: safe, token }, { headers: corsHeaders });
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
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req, "POST, OPTIONS"),
  });
}
