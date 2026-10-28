import { NextRequest, NextResponse } from "next/server";
import { getMentorBySessionToken, MENTOR_SESSION_COOKIE } from "@/lib/hackathon/mentor-db";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const mentor = await getMentorBySessionToken(token);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Mentor sign-up is public; only admin-approved mentors may see or act on student work.
  if (!mentor.is_approved) return NextResponse.json({ error: "Mentor not approved" }, { status: 403 });

  const body = await req.json();
  const { team_id } = body;
  if (!team_id) return NextResponse.json({ error: "team_id required" }, { status: 400 });

  const db = getClient();

  // Check if already assigned
  const { data: existing } = await db
    .from("mentor_team_assignments")
    .select("id")
    .eq("mentor_id", mentor.id)
    .eq("team_id", team_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: true, already_assigned: true });
  }

  const { error } = await db.from("mentor_team_assignments").insert({
    mentor_id: mentor.id,
    team_id,
  });

  if (error) {
    console.error("[mentor/teams/assign] insert error:", error.code);
    return NextResponse.json({ error: "Failed to assign team" }, { status: 500 });
  }

  return NextResponse.json({ success: true, already_assigned: false });
}
