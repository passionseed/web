import { createClient } from "@/utils/supabase/client";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { ClassroomError } from "@/types/classroom";
import type {
  AssignmentGroup,
  AssignmentGroupMember,
  AssignmentGroupAssignment,
  AssignmentGroupWithMembers,
  AssignmentGroupWithAssignments,
  AssignmentGroupWithProgress,
  GroupMemberRole,
} from "@/types/classroom";

/**
 * Creates a new assignment group
 */
export const createAssignmentGroup = async (data: {
  classroom_id: string;
  name: string;
  description?: string;
  color?: string;
  max_members?: number;
}): Promise<AssignmentGroup> => {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Check if user has permission to create groups in this classroom
  const { data: membership, error: membershipError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", data.classroom_id)
    .eq("user_id", user.id)
    .in("role", ["instructor", "ta"])
    .single();

  if (membershipError || !membership) {
    throw new ClassroomError(
      "INSUFFICIENT_PERMISSIONS",
      "User must be an instructor or TA to create assignment groups"
    );
  }

  // Create the group
  const { data: group, error: createError } = await supabase
    .from("assignment_groups")
    .insert({
      classroom_id: data.classroom_id,
      name: data.name,
      description: data.description || null,
      color: data.color || "#3B82F6",
      max_members: data.max_members || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (createError) {
    throw new ClassroomError("CREATE_FAILED", createError.message);
  }

  console.log("✅ Assignment group created:", group.id);
  return group;
};

/**
 * Gets all groups for a classroom with member information
 */
export const getClassroomGroups = async (
  classroomId: string
): Promise<AssignmentGroupWithMembers[]> => {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Check if user has access to this classroom
  const { data: membership, error: membershipError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", classroomId)
    .eq("user_id", user.id);

  if (membershipError || !membership || membership.length === 0) {
    throw new ClassroomError(
      "INSUFFICIENT_PERMISSIONS",
      "User must be a member of this classroom"
    );
  }

  // First, get the groups
  const { data: groups, error: groupsError } = await supabase
    .from("assignment_groups")
    .select(`
      id,
      classroom_id,
      name,
      description,
      color,
      max_members,
      is_active,
      created_by,
      created_at,
      updated_at
    `)
    .eq("classroom_id", classroomId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (groupsError) {
    throw new ClassroomError("FETCH_FAILED", groupsError.message || "Failed to fetch assignment groups");
  }

  if (!groups || groups.length === 0) {
    return [];
  }

  // Get group IDs for the next query
  const groupIds = groups.map(group => group.id);

  // Try to get member counts only (avoiding the RLS recursion issue)
  const memberCounts: { [key: string]: number } = {};
  const allMembers: any[] = [];

  // First, try to get just counts to avoid the recursion issue
  for (const groupId of groupIds) {
    const { count, error: countError } = await supabase
      .from("assignment_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (countError) {
      console.warn(`Could not fetch count for group ${groupId}:`, countError.message);
      memberCounts[groupId] = 0;
    } else {
      memberCounts[groupId] = count || 0;
    }
  }

  // Try to fetch members for groups with non-zero counts
  // We'll do this one by one to isolate any problematic groups
  for (const groupId of groupIds) {
    if (memberCounts[groupId] > 0) {
      const { data: groupMembers, error: membersError } = await supabase
        .from("assignment_group_members")
        .select(`
          id,
          group_id,
          user_id,
          role,
          added_by,
          joined_at
        `)
        .eq("group_id", groupId);

      if (membersError) {
        console.warn(`Could not fetch members for group ${groupId}:`, membersError.message);
        // Continue with other groups instead of throwing
      } else if (groupMembers) {
        allMembers.push(...groupMembers);
      }
    }
  }

  // Get user profiles for the members we successfully fetched
  let userProfiles: any[] = [];
  if (allMembers.length > 0) {
    const userIds = [...new Set(allMembers.map(member => member.user_id))];
    
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, username, email")
      .in("id", userIds);
    
    if (profilesError) {
      console.warn("Could not fetch user profiles:", profilesError.message);
    } else {
      userProfiles = profiles || [];
    }
  }

  // Process groups to add member information
  const processedGroups = groups.map(group => {
    const groupMembers = allMembers.filter(member => member.group_id === group.id);
    
    // Add profile information to each member
    const membersWithProfiles = groupMembers.map(member => ({
      ...member,
      profiles: userProfiles.find(profile => profile.id === member.user_id) || null
    }));
    
    return {
      ...group,
      members: membersWithProfiles,
      member_count: memberCounts[group.id] || 0,
    };
  });

  return processedGroups;
};

/**
 * Adds a member to an assignment group
 */
export const addGroupMember = async (
  groupId: string,
  userId: string,
  role: GroupMemberRole = "member"
): Promise<AssignmentGroupMember> => {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Get group and check permissions
  const { data: group, error: groupError } = await supabase
    .from("assignment_groups")
    .select(`
      *,
      classrooms (
        id
      )
    `)
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    throw new ClassroomError("GROUP_NOT_FOUND", groupError?.message || "Assignment group not found");
  }

  // Check if user has permission (instructor/TA or the user is adding themselves)
  const isAddingSelf = userId === user.id;
  
  if (!isAddingSelf) {
    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", group.classroom_id)
      .eq("user_id", user.id)
      .in("role", ["instructor", "ta"])
      .single();

    if (membershipError || !membership) {
      throw new ClassroomError(
        "INSUFFICIENT_PERMISSIONS",
        "Only instructors and TAs can add other users to groups"
      );
    }
  }

  // Check if target user is a student in the classroom
  const { data: targetMembership, error: targetMembershipError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", group.classroom_id)
    .eq("user_id", userId)
    .single();

  if (targetMembershipError || !targetMembership) {
    throw new ClassroomError(
      "USER_NOT_IN_CLASSROOM",
      targetMembershipError?.message || "User must be a member of the classroom to join the group"
    );
  }

  // Check group capacity
  if (group.max_members) {
    try {
      const { count, error: countError } = await supabase
        .from("assignment_group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId);

      if (countError) {
        console.warn("Could not check group capacity:", countError.message);
        // Continue without capacity check if we can't access the count
      } else if (count && count >= group.max_members) {
        throw new ClassroomError(
          "GROUP_FULL",
          "Group has reached maximum capacity"
        );
      }
    } catch (error) {
      console.warn("Error checking group capacity:", error);
      // Continue without capacity check on error
    }
  }

  // Add the member
  try {
    const { data: member, error: addError } = await supabase
      .from("assignment_group_members")
      .insert({
        group_id: groupId,
        user_id: userId,
        role: role,
        added_by: isAddingSelf ? null : user.id,
      })
      .select()
      .single();

    if (addError) {
      if (addError.code === "23505") {
        throw new ClassroomError(
          "ALREADY_MEMBER",
          "User is already a member of this group"
        );
      }
      throw new ClassroomError("ADD_MEMBER_FAILED", addError.message || "Failed to add member to group");
    }

    console.log("✅ Member added to group:", member.id);
    return member;
  } catch (error) {
    if (error instanceof ClassroomError) {
      throw error;
    }
    throw new ClassroomError("ADD_MEMBER_FAILED", "Failed to add member to group due to RLS policy restrictions");
  }

};

/**
 * Removes a member from an assignment group
 */
export const removeGroupMember = async (
  groupId: string,
  userId: string
): Promise<void> => {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Get group and check permissions
  const { data: group, error: groupError } = await supabase
    .from("assignment_groups")
    .select("classroom_id")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    throw new ClassroomError("GROUP_NOT_FOUND", groupError?.message || "Assignment group not found");
  }

  // Check if user has permission (instructor/TA or the user is removing themselves)
  const isRemovingSelf = userId === user.id;
  
  if (!isRemovingSelf) {
    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", group.classroom_id)
      .eq("user_id", user.id)
      .in("role", ["instructor", "ta"])
      .single();

    if (membershipError || !membership) {
      throw new ClassroomError(
        "INSUFFICIENT_PERMISSIONS",
        "Only instructors and TAs can remove other users from groups"
      );
    }
  }

  // Remove the member
  const { error: removeError } = await supabase
    .from("assignment_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (removeError) {
    throw new ClassroomError("REMOVE_MEMBER_FAILED", removeError.message);
  }

  console.log("✅ Member removed from group");
};

/**
 * Assigns an assignment to a specific group
 */
export const assignAssignmentToGroup = async (
  assignmentId: string,
  groupId: string,
  dueDate?: string,
  instructions?: string
): Promise<AssignmentGroupAssignment> => {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Verify assignment and group belong to the same classroom and user has permission
  const { data: assignmentData, error: assignmentError } = await supabase
    .from("classroom_assignments")
    .select(`
      id,
      classroom_id,
      default_due_date
    `)
    .eq("id", assignmentId)
    .single();

  if (assignmentError || !assignmentData) {
    throw new ClassroomError("ASSIGNMENT_NOT_FOUND", "Assignment not found");
  }

  const { data: groupData, error: groupError } = await supabase
    .from("assignment_groups")
    .select("id, classroom_id")
    .eq("id", groupId)
    .single();

  if (groupError || !groupData) {
    throw new ClassroomError("GROUP_NOT_FOUND", "Assignment group not found");
  }

  if (assignmentData.classroom_id !== groupData.classroom_id) {
    throw new ClassroomError(
      "CLASSROOM_MISMATCH",
      "Assignment and group must belong to the same classroom"
    );
  }

  // Check if user has permission
  const { data: membership, error: membershipError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", assignmentData.classroom_id)
    .eq("user_id", user.id)
    .in("role", ["instructor", "ta"])
    .single();

  if (membershipError || !membership) {
    throw new ClassroomError(
      "INSUFFICIENT_PERMISSIONS",
      "User must be an instructor or TA to assign assignments to groups"
    );
  }

  // Create the group assignment
  const { data: groupAssignment, error: createError } = await supabase
    .from("assignment_group_assignments")
    .insert({
      assignment_id: assignmentId,
      group_id: groupId,
      due_date: dueDate || assignmentData.default_due_date,
      instructions: instructions || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (createError) {
    if (createError.code === "23505") {
      throw new ClassroomError(
        "ALREADY_ASSIGNED",
        "Assignment is already assigned to this group"
      );
    }
    throw new ClassroomError("ASSIGN_FAILED", createError.message);
  }

  console.log("✅ Assignment assigned to group:", groupAssignment.id);
  return groupAssignment;
};

/**
 * Gets all assignments for a specific group
 */
export const getGroupAssignments = async (
  groupId: string
): Promise<AssignmentGroupWithAssignments> => {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Get group with assignments
  const { data: group, error: groupError } = await supabase
    .from("assignment_groups")
    .select(`
      *,
      assignment_group_assignments (
        *,
        classroom_assignments (*)
      )
    `)
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    throw new ClassroomError("GROUP_NOT_FOUND", groupError?.message || "Assignment group not found");
  }

  // Check if user has access to this group
  const { data: membership, error: membershipError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", group.classroom_id)
    .eq("user_id", user.id);

  if (membershipError || !membership || membership.length === 0) {
    throw new ClassroomError(
      "INSUFFICIENT_PERMISSIONS",
      "User must be a member of this classroom"
    );
  }

  // Reshape data
  const processedGroup = {
    ...group,
    assignments: group.assignment_group_assignments || [],
  };

  return processedGroup;
}

/**
 * Gets group progress including member progress and assignment completion
 */
export const getGroupProgress = async (
  groupId: string
): Promise<AssignmentGroupWithProgress> => {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

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
    throw new ClassroomError("GROUP_NOT_FOUND", groupError?.message || "Assignment group not found");
  }

  // Check if user has access to this group
  const { data: membership, error: membershipError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", group.classroom_id)
    .eq("user_id", user.id);

  if (membershipError || !membership || membership.length === 0) {
    throw new ClassroomError(
      "INSUFFICIENT_PERMISSIONS",
      "User must be a member of this classroom"
    );
  }

  // Import group grading functions
  const { getGroupWithProgress } = await import("./group-grading");
  
  return getGroupWithProgress(groupId);
};

/**
 * Updates an assignment group
 */
export const updateAssignmentGroup = async (
  groupId: string,
  data: {
    name?: string;
    description?: string;
    color?: string;
    max_members?: number;
    is_active?: boolean;
  }
): Promise<AssignmentGroup> => {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Get group and check permissions
  const { data: group, error: groupError } = await supabase
    .from("assignment_groups")
    .select("classroom_id")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    throw new ClassroomError("GROUP_NOT_FOUND", groupError?.message || "Assignment group not found");
  }

  // Check if user has permission
  const { data: membership, error: membershipError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", group.classroom_id)
    .eq("user_id", user.id)
    .in("role", ["instructor", "ta"])
    .single();

  if (membershipError || !membership) {
    throw new ClassroomError(
      "INSUFFICIENT_PERMISSIONS",
      "User must be an instructor or TA to update assignment groups"
    );
  }

  // Update the group
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.max_members !== undefined) updateData.max_members = data.max_members;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  const { data: updatedGroup, error: updateError } = await supabase
    .from("assignment_groups")
    .update(updateData)
    .eq("id", groupId)
    .select()
    .single();

  if (updateError) {
    throw new ClassroomError("UPDATE_FAILED", updateError.message);
  }

  console.log("✅ Assignment group updated:", groupId);
  return updatedGroup;
};

/**
 * Deletes an assignment group (soft delete)
 */
export const deleteAssignmentGroup = async (groupId: string): Promise<void> => {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ClassroomError("AUTH_ERROR", "User must be authenticated");
  }

  // Get group and check permissions
  const { data: group, error: groupError } = await supabase
    .from("assignment_groups")
    .select("classroom_id, created_by")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    throw new ClassroomError("GROUP_NOT_FOUND", groupError?.message || "Assignment group not found");
  }

  // Check if user has permission (creator or instructor/TA)
  if (group.created_by !== user.id) {
    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", group.classroom_id)
      .eq("user_id", user.id)
      .in("role", ["instructor", "ta"])
      .single();

    if (membershipError || !membership) {
      throw new ClassroomError(
        "INSUFFICIENT_PERMISSIONS",
        "User must be the group creator or classroom instructor/TA to delete groups"
      );
    }
  }

  // Soft delete the group
  const { error: deleteError } = await supabase
    .from("assignment_groups")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", groupId);

  if (deleteError) {
    throw new ClassroomError("DELETE_FAILED", deleteError.message);
  }

  console.log("✅ Assignment group deleted (soft):", groupId);
};