import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { forkMapForTeam } from "@/lib/supabase/maps";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mapId: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: classroomId, mapId } = await params;
    const { team_id } = await request.json();

    if (!team_id) {
      return NextResponse.json(
        { error: "team_id is required" },
        { status: 400 }
      );
    }

    // Verify the user is a leader of the specified team within the classroom.
    // Query starts from 'team_memberships' and joins 'classroom_teams' to check classroom_id.
    const { data: membership, error: membershipError } = await supabase
      .from("team_memberships")
      .select(
        `
        is_leader,
        classroom_teams(id, classroom_id, name)
      `
      )
      .eq("team_id", team_id)
      .eq("user_id", user.id)
      .eq("is_leader", true)
      .is("left_at", null)
      .eq("classroom_teams.classroom_id", classroomId)
      .single();

    if (membershipError || !membership) {
      console.error("Permission check failed:", membershipError);
      return NextResponse.json(
        {
          error:
            "Forbidden: User is not a leader of this team in the specified classroom.",
        },
        { status: 403 }
      );
    }

    // Get team data using admin client since permissions are already verified
    const adminClient = createAdminClient();
    const { data: team, error: teamError } = await adminClient
      .from("classroom_teams")
      .select("id, classroom_id, name")
      .eq("id", team_id)
      .eq("classroom_id", classroomId)
      .single();

    if (teamError || !team) {
      console.error("Team lookup failed:", teamError);
      return NextResponse.json(
        {
          error: "Team not found in classroom",
        },
        { status: 404 }
      );
    }

    const teamData = {
      id: team_id,
      classroom_id: team.classroom_id,
      name: team.name,
    };

    // User is a verified team leader, proceed to fork the map.
    const result = await forkMapForTeam(mapId, team_id, user.id, adminClient, teamData);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("/fork-to-team error", error);
    return NextResponse.json(
      { error: error.message || String(error) },
      { status: 500 }
    );
  }
}
