import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant, updateParticipant } from "@/lib/hackathon/db";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    const participant = await getSessionParticipant(token);
    if (participant) return NextResponse.json({ participant });
  }

  // Fall back: allow Supabase admins through without a hackathon registration
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");

      if (roles && roles.length > 0) {
        return NextResponse.json({
          participant: {
            id: user.id,
            name: user.email ?? "Admin",
            email: user.email ?? "",
            phone: "",
            university: "PassionSeed",
            role: "Admin",
            track: "",
            grade_level: "",
            experience_level: 0,
            referral_source: "",
            bio: "",
            team_name: null,
            created_at: new Date().toISOString(),
            is_admin: true,
          },
        });
      }
    }
  } catch {
    // Supabase unavailable — fall through to 401
  }

  return NextResponse.json({ participant: null }, { status: 401 });
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const participant = await getSessionParticipant(token);
  if (!participant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, phone, university, track, grade_level, experience_level, bio } = body;

  if (!name?.trim() || !phone?.trim() || !university?.trim() || !track?.trim() || !grade_level?.trim() || !bio?.trim()) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (typeof experience_level !== "number" || experience_level < 1 || experience_level > 10) {
    return NextResponse.json({ error: "Invalid experience level" }, { status: 400 });
  }

  try {
    const updated = await updateParticipant(participant.id, {
      name: name.trim(),
      phone: phone.trim(),
      university: university.trim(),
      track,
      grade_level,
      experience_level,
      bio: bio.trim(),
    });
    return NextResponse.json({ participant: updated });
  } catch (err) {
    console.error("Update participant error:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
