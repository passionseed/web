import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getHackathonServiceClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");
  if (!roles || roles.length === 0) return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const client = getHackathonServiceClient();

  // Fetch all bookings + student info in parallel
  const [{ data: bookings }, { data: participants }] = await Promise.all([
    client
      .from("mentor_bookings")
      .select("id, mentor_id, student_id, slot_datetime, duration_minutes, status, notes, discord_room, cancellation_reason, created_at")
      .order("slot_datetime", { ascending: false }),
    client
      .from("hackathon_participants")
      .select("id, name, email, team_name"),
  ]);

  if (!bookings) return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });

  // Look up team names via hackathon_team_members
  const studentIds = [...new Set((bookings ?? []).map((b) => b.student_id).filter(Boolean) as string[])];

  const { data: memberships } = studentIds.length > 0
    ? await client
        .from("hackathon_team_members")
        .select("participant_id, hackathon_teams(name)")
        .in("participant_id", studentIds)
    : { data: [] };

  const participantMap = new Map(
    (participants ?? []).map((p: { id: string; name: string; email: string }) => [p.id, p])
  );

  const teamMap = new Map(
    (memberships ?? []).map((m: { participant_id: string; hackathon_teams: { name: string } | null }) => [
      m.participant_id,
      m.hackathon_teams?.name ?? null,
    ])
  );

  const enriched = (bookings ?? []).map((b) => {
    const p = b.student_id ? participantMap.get(b.student_id) : null;
    return {
      ...b,
      student_name: p?.name ?? null,
      student_email: p?.email ?? null,
      group_name: b.student_id ? (teamMap.get(b.student_id) ?? null) : null,
    };
  });

  return NextResponse.json({ bookings: enriched });
}
