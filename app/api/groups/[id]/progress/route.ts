import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getGroupProgress } from "@/lib/supabase/group-grading";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user has access to this group
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get group to check classroom membership
    const { data: group, error: groupError } = await supabase
      .from("assignment_groups")
      .select("classroom_id")
      .eq("id", params.id)
      .single();

    if (groupError || !group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", group.classroom_id)
      .eq("user_id", user.id)
      .single();

    // Check for membership or global admin role
    let hasAccess = false;
    if (!membershipError && membership) {
      hasAccess = true;
    } else {
      // Check for global admin role
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      hasAccess = userRoles?.some((r: any) => r.role === "admin") || false;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get group progress
    const progress = await getGroupProgress(params.id);

    return NextResponse.json({ progress });

  } catch (error: any) {
    console.error("Error in group progress API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}