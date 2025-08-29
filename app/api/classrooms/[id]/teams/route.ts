import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  getClassroomTeams,
  createTeam,
  getClassroomTeamStats,
} from "@/lib/supabase/teams";
import { TeamError, TeamValidationError } from "@/types/teams";

// GET /api/classrooms/[id]/teams - Get all teams in a classroom
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log(user, "sdfduser");
    console.log(authError, "sdfderror");

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("include_stats") === "true";

    console.log(includeStats, "includeStatxs");

    const teams = await getClassroomTeams(params.id);

    const response: any = { teams };
    console.log("Teams fetched: sdf", teams.length);
    if (includeStats) {
      const stats = await getClassroomTeamStats(params.id);
      response.stats = stats;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching classroom teams:", error);

    if (error instanceof TeamError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

// POST /api/classrooms/[id]/teams - Create a new team
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, max_members, team_metadata } = body;

    const result = await createTeam({
      classroom_id: params.id,
      name,
      description,
      max_members,
      team_metadata,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating team:", error);

    if (error instanceof TeamValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          field: error.field,
        },
        { status: 400 }
      );
    }

    if (error instanceof TeamError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}
