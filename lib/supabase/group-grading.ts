import { createClient } from "@/utils/supabase/client";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { ClassroomError } from "@/types/classroom";
import type {
  GroupGradingSummary,
  GroupMapProgress,
  AssignmentGroupWithProgress,
} from "@/types/classroom";

/**
 * Gets grading summary for all groups in a classroom assignment
 */
export const getAssignmentGroupGradingSummary = async (
  assignmentId: string
): Promise<GroupGradingSummary[]> => {
  const supabase = createClient();

  // Get assignment details
  const { data: assignment, error: assignmentError } = await supabase
    .from("classroom_assignments")
    .select("id, title, classroom_id, default_due_date")
    .eq("id", assignmentId)
    .single();

  if (assignmentError || !assignment) {
    throw new ClassroomError(
      "ASSIGNMENT_NOT_FOUND",
      assignmentError?.message || "Assignment not found"
    );
  }

  // Get all groups for this classroom
  const { data: groups, error: groupsError } = await supabase
    .from("assignment_groups")
    .select(`
      id,
      name,
      assignment_group_assignments!inner (
        due_date
      )
    `)
    .eq("classroom_id", assignment.classroom_id)
    .eq("is_active", true);

  if (groupsError) {
    throw new ClassroomError("FETCH_GROUPS_FAILED", groupsError.message);
  }

  const gradingSummaries: GroupGradingSummary[] = [];

  for (const group of groups || []) {
    // Get group members
    const { data: members, error: membersError } = await supabase
      .from("assignment_group_members")
      .select(`
        user_id,
        profiles (
          username,
          full_name
        )
      `)
      .eq("group_id", group.id);

    if (membersError) {
      console.warn(`Failed to get members for group ${group.id}:`, membersError.message);
      continue;
    }

    // Get assignment enrollments for group members
    const memberIds = members?.map(m => m.user_id) || [];
    let enrollments: any[] = [];
    
    if (memberIds.length > 0) {
      const { data: memberEnrollments, error: enrollmentsError } = await supabase
        .from("assignment_enrollments")
        .select(`
          user_id,
          status,
          completion_percentage,
          completed_at,
          notes
        `)
        .eq("assignment_id", assignmentId)
        .in("user_id", memberIds);

      if (!enrollmentsError) {
        enrollments = memberEnrollments || [];
      }
    }

    // Calculate grading statistics
    const gradedSubmissions = enrollments.filter(e => e.status === "completed" && e.completion_percentage !== null).length;
    const totalSubmissions = enrollments.filter(e => e.status === "submitted" || e.status === "completed").length;
    
    const scores = enrollments
      .filter(e => e.completion_percentage !== null)
      .map(e => e.completion_percentage as number);
    
    const averageScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
      : null;

    const memberDetails = members?.map(member => {
      const enrollment = enrollments.find(e => e.user_id === member.user_id);
      return {
        user_id: member.user_id,
        username: (member.profiles as any)?.username || "Unknown",
        full_name: (member.profiles as any)?.full_name,
        submission_status: enrollment?.status || "not_started",
        score: enrollment?.completion_percentage || null,
        last_activity: enrollment?.completed_at || null
      };
    }) || [];

    gradingSummaries.push({
      group_id: group.id,
      group_name: group.name,
      assignment_id: assignmentId,
      assignment_title: assignment.title,
      average_score: averageScore,
      submission_count: totalSubmissions,
      total_members: members?.length || 0,
      grading_status: 
        gradedSubmissions === memberDetails.length ? "completed" :
        gradedSubmissions > 0 ? "in_progress" : "not_started",
      graded_submissions: gradedSubmissions,
      due_date: group.assignment_group_assignments?.[0]?.due_date || assignment.default_due_date,
      members: memberDetails
    });
  }

  return gradingSummaries;
};

/**
 * Gets map progress for a specific group
 */
export const getGroupMapProgress = async (
  groupId: string,
  mapId: string
): Promise<GroupMapProgress> => {
  const supabase = createClient();

  // Get group info
  const { data: group, error: groupError } = await supabase
    .from("assignment_groups")
    .select("id, name")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    throw new ClassroomError("GROUP_NOT_FOUND", groupError?.message || "Group not found");
  }

  // Get group members
  const { data: members, error: membersError } = await supabase
    .from("assignment_group_members")
    .select(`
      user_id,
      profiles (
        username,
        full_name
      )
    `)
    .eq("group_id", groupId);

  if (membersError) {
    throw new ClassroomError("FETCH_MEMBERS_FAILED", membersError.message);
  }

  const memberIds = members?.map(m => m.user_id) || [];

  // Get total nodes in map
  const { count: totalNodes, error: nodesError } = await supabase
    .from("map_nodes")
    .select("*", { count: "exact", head: true })
    .eq("map_id", mapId);

  if (nodesError) {
    throw new ClassroomError("FETCH_NODES_FAILED", nodesError.message);
  }

  // Get progress for each member
  const memberProgress: any[] = [];
  let totalCompletedNodes = 0;
  const recentCompletions: any[] = [];

  for (const member of members || []) {
    const { data: progress, error: progressError } = await supabase
      .from("student_node_progress")
      .select(`
        node_id,
        status,
        completed_at,
        map_nodes (
          title
        )
      `)
      .eq("user_id", member.user_id)
      .eq("map_nodes.map_id", mapId)
      .in("status", ["completed", "passed"]);

    if (!progressError && progress) {
      const completedNodes = progress.length;
      const completionPercentage = totalNodes ? (completedNodes / totalNodes) * 100 : 0;
      
      memberProgress.push({
        user_id: member.user_id,
        username: (member.profiles as any)?.username || "Unknown",
        completed_nodes: completedNodes,
        completion_percentage: completionPercentage,
        last_activity: progress.length > 0 
          ? progress.reduce((latest, p) => 
              p.completed_at > latest ? p.completed_at : latest, "")
          : null
      });

      totalCompletedNodes += completedNodes;

      // Add recent completions
      progress.forEach(p => {
        if (p.completed_at) {
          recentCompletions.push({
            node_id: p.node_id,
            node_title: (p.map_nodes as any)?.title || "Unknown Node",
            completed_by: member.user_id,
            completed_at: p.completed_at,
            username: (member.profiles as any)?.username || "Unknown"
          });
        }
      });
    }
  }

  // Sort recent completions by date
  recentCompletions.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

  return {
    group_id: groupId,
    map_id: mapId,
    total_nodes: totalNodes || 0,
    completed_nodes: totalCompletedNodes,
    average_completion: totalNodes ? (totalCompletedNodes / (memberProgress.length * totalNodes)) * 100 : 0,
    member_progress: memberProgress,
    recent_completions: recentCompletions.slice(0, 10) // Last 10 completions
  };
};

/**
 * Gets all map submissions for a specific group
 */
export const getGroupMapSubmissions = async (
  groupId: string,
  mapId: string
): Promise<any[]> => {
  const supabase = createClient();

  if (!mapId || mapId === "") {
    // If no mapId provided, return empty for now until we fix the issue
    console.log("No mapId provided, returning empty array for now");
    return [];
  }

  const { data, error } = await supabase.rpc("get_group_map_submissions", {
    p_group_id: groupId,
    p_map_id: mapId
  });

  if (error) {
    console.error("Error fetching group map submissions:", error);
    throw new Error("Could not fetch group submissions");
  }

  return data || [];
};

/**
 * Gets all submissions for a specific group and map using the database function
 */
export const getGroupAllSubmissions = async (
  groupId: string,
  mapId: string
): Promise<any[]> => {
  const supabase = createClient();

  try {
    console.log("🔍 RADICAL DEBUG - Fetching submissions for group:", groupId, "map:", mapId);
    
    if (!mapId || mapId.trim() === '') {
      console.error("❌ EMPTY MAP ID - Component passed empty/undefined mapId!");
      return [];
    }
    
    // STEP 1: Get group members
    const { data: members, error: membersError } = await supabase
      .from("assignment_group_members")
      .select("*")
      .eq("group_id", groupId);

    console.log("📋 GROUP MEMBERS:", { members, membersError, count: members?.length });

    if (membersError || !members?.length) {
      console.log("❌ STOP: No group members found");
      return [];
    }

    const memberIds = members.map(m => m.user_id);
    console.log("👥 MEMBER IDS:", memberIds);

    // STEP 2: Get ALL submissions from ANY group member (ignore map for now)
    const { data: allSubmissions, error: allSubmissionsError } = await supabase
      .from("assessment_submissions")
      .select("*")
      .in("user_id", memberIds);

    console.log("📝 ALL SUBMISSIONS FROM GROUP MEMBERS:", { 
      allSubmissions, 
      allSubmissionsError, 
      count: allSubmissions?.length 
    });

    // STEP 3: Get ALL progress records from group members
    const { data: allProgress, error: allProgressError } = await supabase
      .from("student_node_progress")
      .select("*")
      .in("user_id", memberIds);

    console.log("📊 ALL PROGRESS RECORDS:", { 
      allProgress, 
      allProgressError, 
      count: allProgress?.length 
    });

    // STEP 4: Get map nodes for this specific map
    const { data: mapNodes, error: mapNodesError } = await supabase
      .from("map_nodes")
      .select("*")
      .eq("map_id", mapId);

    console.log("🗺️ MAP NODES:", { mapNodes, mapNodesError, count: mapNodes?.length });

    // STEP 5: Show what we have and try to connect them
    console.log("🔗 TRYING TO CONNECT DATA:");
    console.log("- Group members:", memberIds);
    console.log("- Total submissions:", allSubmissions?.length || 0);
    console.log("- Total progress records:", allProgress?.length || 0);
    console.log("- Map nodes:", mapNodes?.length || 0);

    // Just return ALL submissions for now to see if anything shows up
    if (allSubmissions?.length) {
      console.log("✅ RETURNING ALL SUBMISSIONS TO SEE WHAT HAPPENS");
      return allSubmissions.map(sub => ({
        submission_id: sub.id,
        user_id: sub.user_id,
        username: "DEBUG USER",
        full_name: "DEBUG NAME", 
        node_id: "DEBUG NODE",
        node_title: "DEBUG TITLE",
        assessment_type: sub.assessment_type,
        submitted_at: sub.submitted_at,
        text_answer: sub.text_answer,
        file_urls: [],
        quiz_answers: null,
        grade: null,
        points_awarded: null,
        comments: null,
        graded_at: null
      }));
    }

    console.log("❌ NO SUBMISSIONS FOUND AT ALL");
    return [];

  } catch (error) {
    console.error("💥 RADICAL ERROR:", error);
    return [];
  }
};

/**
 * Bulk grades all ungraded submissions for a group on a specific map
 */
export const bulkGradeGroupSubmissions = async (
  groupId: string,
  mapId: string,
  graderId: string,
  grade: "pass" | "fail",
  pointsAwarded?: number,
  comments?: string
): Promise<number> => {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("bulk_grade_group_submissions", {
    p_group_id: groupId,
    p_map_id: mapId,
    p_grader_id: graderId,
    p_default_grade: grade,
    p_default_points: pointsAwarded || null,
    p_default_comments: comments || null
  });

  if (error) {
    console.error("Error bulk grading submissions:", error);
    throw new Error("Could not bulk grade submissions");
  }

  return data;
};

/**
 * Gets detailed progress for a specific group
 */
export const getGroupWithProgress = async (
  groupId: string
): Promise<AssignmentGroupWithProgress> => {
  const supabase = createClient();

  // Get group basic info
  const { data: group, error: groupError } = await supabase
    .from("assignment_groups")
    .select(`
      id,
      classroom_id,
      name,
      description,
      color,
      max_members,
      created_by,
      created_at,
      updated_at,
      is_active
    `)
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    throw new ClassroomError("GROUP_NOT_FOUND", groupError?.message || "Group not found");
  }

  // Get group members with profiles
  const { data: members, error: membersError } = await supabase
    .from("assignment_group_members")
    .select(`
      id,
      group_id,
      user_id,
      role,
      joined_at,
      added_by,
      profiles (
        id,
        username,
        full_name,
        email
      )
    `)
    .eq("group_id", groupId);

  if (membersError) {
    throw new ClassroomError("FETCH_MEMBERS_FAILED", membersError.message);
  }

  // Get group assignments
  const { data: assignments, error: assignmentsError } = await supabase
    .from("assignment_group_assignments")
    .select(`
      id,
      assignment_id,
      due_date,
      instructions,
      classroom_assignments (
        id,
        title,
        description
      )
    `)
    .eq("group_id", groupId);

  if (assignmentsError) {
    throw new ClassroomError("FETCH_ASSIGNMENTS_FAILED", assignmentsError.message);
  }

  // Get progress for each member
  const membersWithProgress = await Promise.all(
    members?.map(async (member: any) => {
      let progress;
      
      if (assignments && assignments.length > 0) {
        // Get enrollment progress for each assignment
        const assignmentIds = assignments.map(a => a.assignment_id);
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from("assignment_enrollments")
          .select(`
            assignment_id,
            status,
            completion_percentage,
            completed_at
          `)
          .eq("user_id", member.user_id)
          .in("assignment_id", assignmentIds);

        if (!enrollmentsError && enrollments) {
          const completedAssignments = enrollments.filter(e => e.status === "completed").length;
          const totalCompletion = enrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0);
          const averageCompletion = enrollments.length > 0 ? totalCompletion / enrollments.length : 0;

          progress = {
            completion_percentage: averageCompletion,
            status: enrollments.some(e => e.status === "completed") ? "completed" : 
                    enrollments.some(e => e.status === "submitted") ? "submitted" : 
                    enrollments.some(e => e.status === "in_progress") ? "in_progress" : "assigned",
            completed_nodes: completedAssignments,
            total_nodes: assignments.length,
            last_activity: enrollments.length > 0 
              ? enrollments.reduce((latest, e) => 
                  e.completed_at > latest ? e.completed_at : latest, "" as string)
              : undefined
          };
        }
      }

      return {
        ...member,
        profiles: member.profiles[0] || member.profiles, // Handle both array and object cases
        progress
      };
    }) || []
  ) as any;

  // Calculate overall progress
  const allProgress = membersWithProgress
    .filter((m: any) => m.progress)
    .map((m: any) => m.progress!);
  
  const totalCompletion = allProgress.reduce((sum: any, p: any) => sum + p.completion_percentage, 0);
  const averageCompletion = allProgress.length > 0 ? totalCompletion / allProgress.length : 0;
  const submittedAssignments = allProgress.filter((p: any) => p.status === "submitted" || p.status === "completed").length;

  return {
    ...group,
    members: membersWithProgress,
    overall_progress: {
      completion_percentage: averageCompletion,
      average_score: averageCompletion,
      submitted_assignments: submittedAssignments,
      total_assignments: assignments?.length || 0,
      active_members: membersWithProgress.filter((m: any) => m.progress && m.progress.completion_percentage > 0).length
    }
  };
};

/**
 * Grades an individual submission
 */
export const gradeSubmission = async (
  submissionId: string,
  grade: "pass" | "fail",
  comments: string,
  _fileAttachment: any = null,
  graderId: string,
  progressId: string,
  pointsAwarded?: number
): Promise<void> => {
  const supabase = createClient();

  const { error } = await supabase.rpc("grade_individual_submission", {
    p_submission_id: submissionId,
    p_grade: grade,
    p_comments: comments,
    p_grader_id: graderId,
    p_progress_id: progressId,
    p_points_awarded: pointsAwarded || null
  });

  if (error) {
    console.error("Error grading individual submission:", error);
    throw new Error("Could not grade submission");
  }
};

/**
 * Gets progress for a specific group (alias for getGroupWithProgress for API compatibility)
 */
export const getGroupProgress = async (
  groupId: string
): Promise<AssignmentGroupWithProgress> => {
  return getGroupWithProgress(groupId);
};