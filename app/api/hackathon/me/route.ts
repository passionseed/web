import { NextRequest, NextResponse } from "next/server";
import { getSessionParticipant, updateParticipant } from "@/lib/hackathon/db";
import { createClient } from "@/utils/supabase/server";
import { getCorsHeaders, extractHackathonToken } from "@/lib/hackathon/auth";

export async function GET(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  const token = extractHackathonToken(req);

  if (token) {
    const participant = await getSessionParticipant(token);
    if (participant) return NextResponse.json({ participant }, { headers: corsHeaders });
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
        }, { headers: corsHeaders });
      }
    }
  } catch {
    // Supabase unavailable — fall through to 401
  }

  return NextResponse.json({ participant: null }, { status: 401, headers: corsHeaders });
}

export async function PATCH(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  const token = extractHackathonToken(req);

  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

  const participant = await getSessionParticipant(token);
  if (!participant) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

  const body = await req.json();
  const { name, phone, university, track, grade_level, experience_level, bio } = body;

  if (!name?.trim() || !phone?.trim() || !university?.trim() || !track?.trim() || !grade_level?.trim() || !bio?.trim()) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400, headers: corsHeaders });
  }

  if (typeof experience_level !== "number" || experience_level < 1 || experience_level > 10) {
    return NextResponse.json({ error: "Invalid experience level" }, { status: 400, headers: corsHeaders });
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
    return NextResponse.json({ participant: updated }, { headers: corsHeaders });
  } catch (err) {
    console.error("Update participant error:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}
