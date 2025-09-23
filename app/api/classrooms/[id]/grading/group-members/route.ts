import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: classroomId } = await params;
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    
    if (!groupId) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
    }
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Check if user can manage this classroom
    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", classroomId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership || !["instructor", "ta"].includes(membership.role)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Get group members separately to avoid relationship issues
    const { data: groupMembers, error: groupMembersError } = await supabase
      .from("assessment_group_members")
      .select("user_id")
      .eq("group_id", groupId);

    if (groupMembersError) {
      console.error("Error fetching group members:", groupMembersError);
      return NextResponse.json({ 
        error: "Failed to fetch group members", 
        details: groupMembersError.message 
      }, { status: 500 });
    }

    if (!groupMembers || groupMembers.length === 0) {
      return NextResponse.json({ members: [] });
    }

    // Get user profiles for the group members
    const userIds = groupMembers.map(member => member.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, full_name, email")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return NextResponse.json({ 
        error: "Failed to fetch user profiles", 
        details: profilesError.message 
      }, { status: 500 });
    }

    // Combine the data
    const members = groupMembers.map(member => {
      const profile = (profiles || []).find(p => p.id === member.user_id);
      return {
        user_id: member.user_id,
        username: profile?.username || `user_${member.user_id.slice(-8)}`,
        full_name: profile?.full_name,
        email: profile?.email || "",
        display_name: profile?.full_name || profile?.username || `user_${member.user_id.slice(-8)}`
      };
    });

    return NextResponse.json({ members });

  } catch (error) {
    console.error("Error in group members route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}