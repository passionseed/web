import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { teamId } = await params;
    const serviceClient = getServiceClient();

    const { data: team, error } = await serviceClient
      .from("hackathon_teams")
      .select(`
        id,
        name,
        lobby_code,
        created_at,
        hackathon_team_members(
          joined_at,
          participant_id,
          hackathon_participants(
            id,
            name,
            email,
            university,
            grade_level,
            track
          )
        )
      `)
      .eq("id", teamId)
      .single();

    if (error || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const members = (team.hackathon_team_members as any[]).map((m) => ({
      joined_at: m.joined_at,
      ...m.hackathon_participants,
    }));

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        join_code: team.lobby_code,
        created_at: team.created_at,
        members,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/admin/hackathon/teams/[teamId] — reset mentor booking quota for a specific team
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");
  if (!roles || roles.length === 0) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { teamId } = await params;
  const serviceClient = getServiceClient();

  const { data: bookings, error: fetchError } = await serviceClient
    .from("mentor_bookings")
    .select("id")
    .eq("team_id", teamId);

  if (fetchError) return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ reset: 0, message: "No bookings to reset" });
  }

  const ids = bookings.map((b) => b.id);
  const { error: deleteError } = await serviceClient
    .from("mentor_bookings")
    .delete()
    .in("id", ids);

  if (deleteError) return NextResponse.json({ error: "Failed to reset quota" }, { status: 500 });

  return NextResponse.json({ reset: ids.length });
}
