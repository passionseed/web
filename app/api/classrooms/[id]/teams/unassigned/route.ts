import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getStudentsWithoutTeams } from "@/lib/supabase/teams";
import { TeamError } from "@/types/teams";

// GET /api/classrooms/[id]/teams/unassigned - Get students not in any team
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

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const students = await getStudentsWithoutTeams(params.id);
    return NextResponse.json({ students });
  } catch (error) {
    console.error("Error fetching unassigned students:", error);

    if (error instanceof TeamError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch unassigned students" },
      { status: 500 }
    );
  }
}
