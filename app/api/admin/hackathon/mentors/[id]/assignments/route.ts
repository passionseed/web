import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getHackathonClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");
  if (!roles || roles.length === 0) return null;
  return user;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { id: mentorId } = await params;
  const db = getHackathonClient();

  const { data, error } = await db
    .from("mentor_team_assignments")
    .select("id, team_id, assigned_at, hackathon_teams(id, name, lobby_code)")
    .eq("mentor_id", mentorId)
    .order("assigned_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: data ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { id: mentorId } = await params;
  const body = await req.json();
  const { team_id } = body as { team_id?: string };
  if (!team_id) return NextResponse.json({ error: "team_id required" }, { status: 400 });

  const db = getHackathonClient();

  const { data: existing } = await db
    .from("mentor_team_assignments")
    .select("id")
    .eq("mentor_id", mentorId)
    .eq("team_id", team_id)
    .maybeSingle();

  if (existing) return NextResponse.json({ success: true, already_assigned: true });

  const { error } = await db.from("mentor_team_assignments").insert({
    mentor_id: mentorId,
    team_id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, already_assigned: false });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { id: mentorId } = await params;
  const body = await req.json();
  const { team_id } = body as { team_id?: string };
  if (!team_id) return NextResponse.json({ error: "team_id required" }, { status: 400 });

  const db = getHackathonClient();

  const { error } = await db
    .from("mentor_team_assignments")
    .delete()
    .eq("mentor_id", mentorId)
    .eq("team_id", team_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
