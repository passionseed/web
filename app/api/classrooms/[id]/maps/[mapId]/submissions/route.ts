import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mapId: string }> }
) {
  const { id: classroomId, mapId } = await params;
  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get("assignment_id");

  const supabase = await createClient();
  console.log("Fetching submissions for:", {
    classroomId,
    mapId,
    assignmentId,
  });

  try {
    // Check if user is an instructor or TA for this classroom
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has permission to access this classroom
    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", classroomId)
      .eq("user_id", user.id)
      .in("role", ["instructor", "ta"])
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if this is a classroom map or team map
    let isTeamMap = false;
    let mapTitle = "";

    // First check if it's a classroom map
    const { data: classroomMap, error: classroomMapError } = await supabase
      .from("classroom_maps")
      .select("learning_maps(title)")
      .eq("id", mapId)
      .eq("classroom_id", classroomId)
      .single();

    if (classroomMap) {
      mapTitle = classroomMap.learning_maps?.[0]?.title || "Classroom Map";
    } else {
      // Check if it's a team map
      const { data: teamMap, error: teamMapError } = await supabase
        .from("classroom_team_maps")
        .select("learning_maps(title), classroom_teams(name)")
        .eq("id", mapId)
        .eq("classroom_teams.classroom_id", classroomId)
        .single();

      if (teamMap) {
        isTeamMap = true;
        mapTitle = `${teamMap.learning_maps?.[0]?.title || "Team Map"} (${teamMap.classroom_teams?.[0]?.name || "Team"})`;
      } else {
        return NextResponse.json({ error: "Map not found" }, { status: 404 });
      }
    }

    // Fetch submissions for this map
    let query = supabase
      .from("assessment_submissions")
      .select(
        `
        id,
        submitted_at,
        text_answer,
        file_urls,
        image_url,
        quiz_answers,
        student_node_progress (
          id,
          status,
          user_id,
          profiles (
            id,
            username,
            full_name,
            avatar_url
          )
        ),
        node_assessments (
          id,
          assessment_type,
          map_nodes (
            id,
            title,
            map_id
          )
        ),
        submission_grades (
          id,
          grade,
          rating,
          points_awarded,
          comments,
          graded_at,
          graded_by,
          profiles (
            id,
            username,
            full_name
          )
        ),
        progress_id
      `
      )
      .order("submitted_at", { ascending: false });

    // Filter by map
    if (isTeamMap) {
      // For team maps, we need to join through student_node_progress
      query = query.eq("student_node_progress.team_map_id", mapId);
    } else {
      query = query.eq("node_assessments.map_nodes.map_id", mapId);
    }

    // Filter by assignment if specified
    if (assignmentId) {
      query = query.eq("assignment_nodes.assignment_id", assignmentId);
    }

    const { data: submissions, error: submissionsError } = await query;

    if (submissionsError) {
      console.error("Error fetching submissions:", submissionsError);
      return NextResponse.json(
        { error: "Failed to fetch submissions" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      submissions,
      mapTitle,
      isTeamMap,
      userId: user.id,
    });
  } catch (error) {
    console.error("Error in classroom map submissions API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
