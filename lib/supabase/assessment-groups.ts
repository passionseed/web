import { createClient } from "@/utils/supabase/client";
import {
  AssessmentGroup,
  AssessmentGroupWithMembers,
  AssessmentGroupsResponse,
  CreateAssessmentGroupsRequest,
  UpdateAssessmentGroupsRequest,
  GroupFormationMethod,
  GroupSubmissionMode,
} from "@/types/map";

/**
 * Gets all assessment groups for a specific assessment
 */
export const getAssessmentGroups = async (
  assessmentId: string
): Promise<AssessmentGroupWithMembers[]> => {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc("get_assessment_groups", {
      p_assessment_id: assessmentId,
    });

    if (error) {
      // Handle permission errors and PostgreSQL function errors
      const isPermissionError = 
        error.message?.includes("Access denied") || 
        error.code === 'PGRST301' ||
        error.code === 'P0001' || // PostgreSQL custom exception
        Object.keys(error).length === 0 ||
        !error.message;
      
      if (isPermissionError) {
        console.warn("Assessment groups not accessible (likely not a classroom assessment) - returning empty array");
        return []; // Return empty array instead of throwing error for permission issues
      }
      
      // Only log error if we're going to throw it
      console.error("Failed to get assessment groups:", error);
      const errorMessage = error.message || error.code || JSON.stringify(error);
      throw new Error(`Failed to get assessment groups: ${errorMessage}`);
    }

    return data || [];
  } catch (error) {
    // For permission errors or PostgreSQL exceptions, return empty array instead of throwing
    if (
      (error instanceof Error && error.message?.includes("Access denied")) ||
      (error && typeof error === 'object' && (
        Object.keys(error).length === 0 ||
        (error as any).code === 'P0001' ||
        (error as any).code === 'PGRST301'
      )) ||
      !error
    ) {
      console.warn("Assessment groups not accessible (likely not a classroom assessment) - returning empty groups array");
      return [];
    }
    
    console.error("Error in getAssessmentGroups:", error);
    throw error;
  }
};

/**
 * Creates groups for an assessment using auto-shuffle
 */
export const createAssessmentGroupsShuffle = async (
  request: CreateAssessmentGroupsRequest
): Promise<AssessmentGroupsResponse> => {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("create_assessment_groups_shuffle", {
    p_assessment_id: request.assessment_id,
    p_target_group_size: request.target_group_size,
    p_allow_uneven_groups: request.allow_uneven_groups,
  });

  if (error) {
    console.error("Failed to create assessment groups:", error);
    throw new Error(`Failed to create assessment groups: ${error.message}`);
  }

  // Get detailed groups with members
  const groups = await getAssessmentGroups(request.assessment_id);
  
  return {
    groups,
    total_students: groups.reduce((sum, group) => sum + group.members.length, 0),
    total_groups: groups.length,
  };
};

/**
 * Manually creates/updates assessment groups
 */
export const updateAssessmentGroupsManual = async (
  request: UpdateAssessmentGroupsRequest
): Promise<AssessmentGroupsResponse> => {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("User must be authenticated");
  }

  try {
    console.log("🔄 Starting manual group update for assessment:", request.assessment_id);
    console.log("📋 Groups to create:", request.groups);
    
    // Delete existing groups for this assessment
    console.log("🗑️ Deleting existing groups...");
    const { error: deleteError } = await supabase
      .from("assessment_groups")
      .delete()
      .eq("assessment_id", request.assessment_id);

    if (deleteError) {
      console.error("❌ Failed to delete existing groups:", deleteError);
      throw new Error(`Failed to clear existing groups: ${deleteError.message}`);
    }
    console.log("✅ Existing groups deleted");

    // Create new groups
    console.log(`➕ Creating ${request.groups.length} new groups...`);
    for (let i = 0; i < request.groups.length; i++) {
      const groupData = request.groups[i];
      console.log(`Creating group ${i + 1}: ${groupData.group_name} with ${groupData.member_ids.length} members`);
      
      // Create the group
      const { data: newGroup, error: groupError } = await supabase
        .from("assessment_groups")
        .insert({
          assessment_id: request.assessment_id,
          group_name: groupData.group_name,
          group_number: i + 1,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) {
        console.error(`❌ Failed to create group ${groupData.group_name}:`, groupError);
        throw new Error(`Failed to create group ${groupData.group_name}: ${groupError.message}`);
      }
      console.log(`✅ Group created: ${newGroup.id}`);

      // Add members to the group
      if (groupData.member_ids.length > 0) {
        console.log(`👥 Adding ${groupData.member_ids.length} members to group ${groupData.group_name}...`);
        const memberInserts = groupData.member_ids.map(userId => ({
          group_id: newGroup.id,
          user_id: userId,
          assigned_by: user.id,
        }));

        const { error: membersError } = await supabase
          .from("assessment_group_members")
          .insert(memberInserts);

        if (membersError) {
          console.error(`❌ Failed to add members to group ${groupData.group_name}:`, membersError);
          throw new Error(`Failed to add members to group ${groupData.group_name}: ${membersError.message}`);
        }
        console.log(`✅ Members added to group ${groupData.group_name}`);
      } else {
        console.log(`ℹ️ No members to add to group ${groupData.group_name}`);
      }
    }

    // Get the created groups with members
    const groups = await getAssessmentGroups(request.assessment_id);
    
    return {
      groups,
      total_students: groups.reduce((sum, group) => sum + group.members.length, 0),
      total_groups: groups.length,
    };

  } catch (error) {
    console.error("Failed to update assessment groups manually:", error);
    throw error;
  }
};

/**
 * Deletes all groups for an assessment
 */
export const deleteAssessmentGroups = async (assessmentId: string): Promise<void> => {
  const supabase = createClient();

  const { error } = await supabase
    .from("assessment_groups")
    .delete()
    .eq("assessment_id", assessmentId);

  if (error) {
    console.error("Failed to delete assessment groups:", error);
    throw new Error(`Failed to delete assessment groups: ${error.message}`);
  }
};

/**
 * Gets the map context for an assessment (map ID, classroom ID, map type)
 */
export const getAssessmentMapContext = async (
  assessmentId: string
): Promise<{
  map_id: string;
  classroom_id: string | null;
  map_type: string;
  is_classroom_exclusive: boolean;
} | null> => {
  const supabase = createClient();

  try {
    console.log("🔍 Getting map context for assessment:", assessmentId);

    const { data: assessmentData, error: assessmentError } = await supabase
      .from("node_assessments")
      .select(`
        id,
        map_nodes!inner (
          learning_maps!inner (
            id,
            parent_classroom_id,
            map_type
          )
        )
      `)
      .eq("id", assessmentId)
      .single();

    if (assessmentError) {
      console.error("❌ Failed to get assessment data:", assessmentError);
      return null;
    }

    if (!assessmentData?.map_nodes?.learning_maps) {
      console.warn("⚠️ No learning map found for assessment");
      return null;
    }

    const learningMap = assessmentData.map_nodes.learning_maps;
    console.log("📍 Found learning map:", learningMap);

    return {
      map_id: learningMap.id,
      classroom_id: learningMap.parent_classroom_id,
      map_type: learningMap.map_type || 'public',
      is_classroom_exclusive: learningMap.map_type === 'classroom_exclusive' && !!learningMap.parent_classroom_id,
    };

  } catch (error) {
    console.error("❌ Error in getAssessmentMapContext:", error);
    return null;
  }
};

/**
 * Gets all students in a classroom for an assessment (for group formation)
 */
export const getClassroomStudentsForAssessment = async (
  assessmentId: string
): Promise<Array<{
  user_id: string;
  full_name: string | null;
  username: string | null;
  email: string;
}>> => {
  const supabase = createClient();

  try {
    console.log("🔍 Getting classroom for assessment:", assessmentId);

    // Step 1: Get the classroom_id from the assessment
    const { data: assessmentData, error: assessmentError } = await supabase
      .from("node_assessments")
      .select(`
        id,
        map_nodes!inner (
          learning_maps!inner (
            id,
            parent_classroom_id,
            map_type
          )
        )
      `)
      .eq("id", assessmentId)
      .single();

    if (assessmentError) {
      console.error("❌ Failed to get assessment data:", assessmentError);
      throw new Error(`Failed to get assessment data: ${assessmentError.message}`);
    }

    if (!assessmentData?.map_nodes?.learning_maps) {
      console.warn("⚠️ No learning map found for assessment");
      return [];
    }

    const learningMap = assessmentData.map_nodes.learning_maps;
    console.log("📍 Found learning map:", learningMap);

    // Check if this is a classroom-exclusive map
    if (learningMap.map_type !== 'classroom_exclusive' || !learningMap.parent_classroom_id) {
      console.warn("⚠️ Assessment is not in a classroom-exclusive map");
      return [];
    }

    const classroomId = learningMap.parent_classroom_id;
    console.log("🏫 Classroom ID:", classroomId);

    // Step 2: Get all students in the classroom (first get user IDs)
    const { data: membershipsData, error: membershipsError } = await supabase
      .from("classroom_memberships")
      .select("user_id")
      .eq("classroom_id", classroomId)
      .eq("role", "student");

    if (membershipsError) {
      console.error("❌ Failed to get classroom memberships:", membershipsError);
      throw new Error(`Failed to get classroom memberships: ${membershipsError.message}`);
    }

    if (!membershipsData || membershipsData.length === 0) {
      console.warn("⚠️ No students found in classroom");
      return [];
    }

    console.log(`📋 Found ${membershipsData.length} student memberships`);

    // Step 3: Get profile information for these students
    const userIds = membershipsData.map(m => m.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, username, email")
      .in("id", userIds);

    if (profilesError) {
      console.error("❌ Failed to get student profiles:", profilesError);
      throw new Error(`Failed to get student profiles: ${profilesError.message}`);
    }

    if (!profilesData || profilesData.length === 0) {
      console.warn("⚠️ No profiles found for students");
      return [];
    }

    console.log(`✅ Found ${profilesData.length} student profiles`);

    return profilesData.map((profile) => ({
      user_id: profile.id,
      full_name: profile.full_name,
      username: profile.username,
      email: profile.email,
    }));

  } catch (error) {
    console.error("❌ Error in getClassroomStudentsForAssessment:", error);
    
    // For permission errors or empty errors, return empty array instead of throwing
    if (
      (error instanceof Error && (
        error.message?.includes("Access denied") || 
        error.message?.includes("permission")
      )) ||
      (error && typeof error === 'object' && Object.keys(error).length === 0) ||
      !error
    ) {
      console.warn("Permission denied or empty error - returning empty students array");
      return [];
    }
    
    throw error;
  }
};

/**
 * Updates assessment group settings
 */
export const updateAssessmentGroupSettings = async (
  assessmentId: string,
  settings: {
    is_group_assessment: boolean;
    group_formation_method: GroupFormationMethod;
    group_submission_mode: GroupSubmissionMode;
    target_group_size: number;
    allow_uneven_groups: boolean;
    groups_config?: Record<string, any>;
  }
): Promise<void> => {
  const supabase = createClient();

  const { error } = await supabase
    .from("node_assessments")
    .update({
      is_group_assessment: settings.is_group_assessment,
      group_formation_method: settings.group_formation_method,
      group_submission_mode: settings.group_submission_mode,
      target_group_size: settings.target_group_size,
      allow_uneven_groups: settings.allow_uneven_groups,
      groups_config: settings.groups_config || {},
    })
    .eq("id", assessmentId);

  if (error) {
    console.error("Failed to update assessment group settings:", error);
    throw new Error(`Failed to update assessment group settings: ${error.message}`);
  }

  // If disabling group assessment, delete existing groups
  if (!settings.is_group_assessment) {
    await deleteAssessmentGroups(assessmentId);
  }
};

/**
 * Gets the group assignment for a specific user in an assessment
 */
export const getUserAssessmentGroup = async (
  assessmentId: string,
  userId: string
): Promise<AssessmentGroupWithMembers | null> => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("assessment_group_members")
    .select(`
      assessment_groups!inner (
        id,
        assessment_id,
        group_name,
        group_number,
        created_at,
        created_by
      )
    `)
    .eq("user_id", userId)
    .eq("assessment_groups.assessment_id", assessmentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No group found for user
      return null;
    }
    console.error("Failed to get user assessment group:", error);
    throw new Error(`Failed to get user assessment group: ${error.message}`);
  }

  if (!data?.assessment_groups) {
    return null;
  }

  // Get all members of this group
  const groups = await getAssessmentGroups(assessmentId);
  return groups.find(group => group.id === data.assessment_groups.id) || null;
};

/**
 * Submits an assessment for an entire group
 */
export const submitAssessmentForGroup = async (
  nodeId: string,
  submissionData: any,
  assessmentGroupId: string
): Promise<void> => {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("User must be authenticated");
  }

  // Submit with group flag - the database trigger will handle creating submissions for other group members
  const { error } = await supabase
    .from("node_submissions")
    .insert({
      node_id: nodeId,
      user_id: user.id,
      submission_data: submissionData.submission_data,
      submission_type: submissionData.submission_type,
      assessment_group_id: assessmentGroupId,
      submitted_for_group: true,
    });

  if (error) {
    console.error("Failed to submit assessment for group:", error);
    throw new Error(`Failed to submit assessment for group: ${error.message}`);
  }
};

/**
 * Checks if an assessment has group submissions
 */
export const hasGroupSubmissions = async (assessmentId: string): Promise<boolean> => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("node_submissions")
    .select("id")
    .eq("submitted_for_group", true)
    .in(
      "node_id",
      supabase
        .from("node_assessments")
        .select("node_id")
        .eq("id", assessmentId)
    )
    .limit(1);

  if (error) {
    console.error("Failed to check group submissions:", error);
    return false;
  }

  return data && data.length > 0;
};

/**
 * Gets submission status for all group members for a specific assessment
 */
export const getGroupMembersSubmissionStatus = async (
  assessmentId: string,
  groupId: string
): Promise<Array<{
  user_id: string;
  full_name: string | null;
  username: string | null;
  has_submitted: boolean;
  submitted_at: string | null;
}>> => {
  const supabase = createClient();

  try {
    // Get all group members first
    const { data: members, error: membersError } = await supabase
      .from("assessment_group_members")
      .select("user_id")
      .eq("group_id", groupId);

    if (membersError) {
      console.error("Failed to get group members:", membersError);
      throw new Error(`Failed to get group members: ${membersError.message}`);
    }

    if (!members || members.length === 0) {
      return [];
    }

    // Get profiles for these users
    const memberIds = members.map(m => m.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", memberIds);

    if (profilesError) {
      console.error("Failed to get profiles:", profilesError);
      throw new Error(`Failed to get profiles: ${profilesError.message}`);
    }

    // Get submission status for each member
    const { data: submissions, error: submissionsError } = await supabase
      .from("assessment_submissions")
      .select(`
        id,
        submitted_at,
        student_node_progress!inner (
          user_id
        )
      `)
      .eq("assessment_id", assessmentId)
      .in("student_node_progress.user_id", memberIds);

    if (submissionsError) {
      console.error("Failed to get submissions:", submissionsError);
      throw new Error(`Failed to get submissions: ${submissionsError.message}`);
    }

    // Combine member info with submission status
    return memberIds.map(userId => {
      const profile = profiles?.find(p => p.id === userId);
      const memberSubmission = submissions?.find(
        sub => (sub.student_node_progress as any)?.user_id === userId
      );

      return {
        user_id: userId,
        full_name: profile?.full_name || null,
        username: profile?.username || null,
        has_submitted: !!memberSubmission,
        submitted_at: memberSubmission?.submitted_at || null,
      };
    });

  } catch (error) {
    console.error("Error in getGroupMembersSubmissionStatus:", error);
    throw error;
  }
};