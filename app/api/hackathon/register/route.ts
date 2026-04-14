import { NextRequest, NextResponse } from "next/server";
import { hashPassword, generateSessionToken, SESSION_COOKIE, SESSION_EXPIRY_DAYS } from "@/lib/hackathon/auth";
import { findParticipantByEmail, createParticipant, createSession } from "@/lib/hackathon/db";
import { createClient } from "@supabase/supabase-js";

async function handlePOST(req: NextRequest) {
  return NextResponse.json({ error: "Registration is closed — we are already full!" }, { status: 403 });
  try {
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

    const password_hash = hashPassword(password);
    const participant = await createParticipant({ name, email, phone, password_hash, university, role: "Participant", track, grade_level, experience_level, referral_source, bio, team_name });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    await supabase.from("funnel_events").insert({
      user_id: participant.id,
      event_name: "hackathon_signup",
      metadata: { 
        track, 
        university, 
        grade_level,
        source: referral_source 
      },
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
  } catch (err) {
    console.error("Hackathon register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handlePOST(req);
  } catch (err) {
    console.error("Critical error in register API:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
