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
    const debug = searchParams.get("debug") === "true";

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

    if (debug) {
      // Debug mode - return comprehensive group information
      console.log("🔍 DEBUG MODE ACTIVATED - Fetching comprehensive group data");
      
      // Get all maps for this classroom
      const [classroomMapsResult, exclusiveMapsResult] = await Promise.all([
        supabase.from("classroom_maps").select("map_id").eq("classroom_id", params.id),
        supabase.from("learning_maps").select("id").eq("map_type", "classroom_exclusive").eq("parent_classroom_id", params.id)
      ]);

      const allMapIds = [
        ...(classroomMapsResult.data?.map(cm => cm.map_id) || []),
        ...(exclusiveMapsResult.data?.map(em => em.id) || [])
      ];

      // Get all nodes and assessments
      const { data: allNodes } = await supabase
        .from("map_nodes")
        .select("id, title, map_id")
        .in("map_id", allMapIds);

      const nodeIds = allNodes?.map(n => n.id) || [];
      
      const { data: allAssessments } = await supabase
        .from("node_assessments")
        .select(`
          id, node_id, assessment_type, is_graded, points_possible,
          is_group_assessment, group_formation_method, group_submission_mode,
          target_group_size, allow_uneven_groups
        `)
        .in("node_id", nodeIds);

      const groupAssessmentIds = allAssessments?.filter(a => a.is_group_assessment).map(a => a.id) || [];
      
      // Get all assessment groups
      const { data: allGroups } = await supabase
        .from("assessment_groups")
        .select(`
          id, assessment_id, group_name, group_number,
          assessment_group_members (
            user_id,
            profiles (
              id, username, full_name, email
            )
          )
        `)
        .in("assessment_id", groupAssessmentIds);

      // Get all submissions
      const assessmentIds = allAssessments?.map(a => a.id) || [];
      const { data: submissions } = await supabase
        .from("assessment_submissions")
        .select(`
          id, submitted_at, text_answer, assessment_id, progress_id,
          submitted_for_group, assessment_group_id,
          assessment_groups(id, group_number, group_name)
        `)
        .in("assessment_id", assessmentIds);

      // Get progress data
      const submissionProgressIds = submissions?.map(s => s.progress_id) || [];
      const { data: progressData } = await supabase
        .from("student_node_progress")
        .select("id, user_id, node_id")
        .in("id", submissionProgressIds);

      // Get student profiles
      const progressUserIds = progressData?.map(p => p.user_id) || [];
      const { data: studentProfiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, email")
        .in("id", progressUserIds);

      // Get classroom members
      const { data: classroomMembers } = await supabase
        .from("classroom_memberships")
        .select("user_id")
        .eq("classroom_id", params.id)
        .eq("role", "student");

      const allClassroomUserIds = classroomMembers?.map(m => m.user_id) || [];
      const { data: allClassroomProfiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, email")
        .in("id", allClassroomUserIds);

      responseData = {
        debug_info: {
          classroom_id: params.id,
          total_maps: allMapIds.length,
          total_nodes: allNodes?.length || 0,
          total_assessments: allAssessments?.length || 0,
          group_assessments: groupAssessmentIds.length,
          total_groups: allGroups?.length || 0,
          total_submissions: submissions?.length || 0,
          total_progress_records: progressData?.length || 0,
          total_classroom_members: allClassroomUserIds.length,
          
          maps: allMapIds,
          assessments: allAssessments?.map(a => ({
            id: a.id,
            node_id: a.node_id,
            assessment_type: a.assessment_type,
            is_group_assessment: a.is_group_assessment,
            is_graded: a.is_graded
          })),
          
          groups: allGroups?.map(g => ({
            id: g.id,
            assessment_id: g.assessment_id,
            group_name: g.group_name,
            group_number: g.group_number,
            member_count: g.assessment_group_members?.length || 0,
            members: g.assessment_group_members?.map((m: any) => ({
              user_id: m.user_id,
              username: m.profiles?.username,
              full_name: m.profiles?.full_name,
              email: m.profiles?.email
            })) || []
          })) || [],
          
          submissions: submissions?.map(s => ({
            id: s.id,
            assessment_id: s.assessment_id,
            progress_id: s.progress_id,
            submitted_for_group: s.submitted_for_group,
            assessment_group_id: s.assessment_group_id,
            group_info: s.assessment_groups
          })) || [],
          
          progress_mapping: progressData?.map(p => {
            const profile = studentProfiles?.find(prof => prof.id === p.user_id);
            return {
              progress_id: p.id,
              user_id: p.user_id,
              node_id: p.node_id,
              username: profile?.username,
              full_name: profile?.full_name
            };
          }) || [],
          
          classroom_members: allClassroomProfiles?.map(p => ({
            user_id: p.id,
            username: p.username,
            full_name: p.full_name,
            email: p.email,
            has_submissions: progressUserIds.includes(p.id)
          })) || []
        }
      };
      
    } else if (assignmentId) {
      // Get grading summary for an assignment
      const summary = await getAssignmentGroupGradingSummary(assignmentId);
      responseData = { summary };
    } else if (mapId && groupId) {
      // Get map progress for a specific group
      const progress = await getGroupMapProgress(groupId, mapId);
      responseData = { progress };
    } else {
      return NextResponse.json(
        { error: "Either assignment_id, both map_id and group_id, or debug=true are required" },
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