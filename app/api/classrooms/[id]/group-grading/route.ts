import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAssignmentGroupGradingSummary, getGroupMapProgress } from "@/lib/supabase/group-grading";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignment_id");
    const mapId = searchParams.get("map_id");
    const groupId = searchParams.get("group_id");

    if (!params.id) {
      return NextResponse.json(
        { error: "Classroom ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user has access to this classroom
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", params.id)
      .eq("user_id", user.id)
      .single();

    // Check for global admin role if no classroom membership
    let hasPermission = false;
    if (!membershipError && membership && ["instructor", "ta"].includes(membership.role)) {
      hasPermission = true;
    } else {
      // Check for global admin role
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      hasPermission = userRoles?.some((r: any) => r.role === "admin") || false;
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    let responseData;

    if (assignmentId) {
      // Get grading summary for an assignment
      const summary = await getAssignmentGroupGradingSummary(assignmentId);
      responseData = { summary };
    } else if (mapId && groupId) {
      // Get map progress for a specific group
      const progress = await getGroupMapProgress(groupId, mapId);
      responseData = { progress };
    } else {
      return NextResponse.json(
        { error: "Either assignment_id or both map_id and group_id are required" },
        { status: 400 }
      );
    }

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error("Error in group grading API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}