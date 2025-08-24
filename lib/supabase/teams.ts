import { createClient } from "@/utils/supabase/client";
import {
  ClassroomTeam,
  TeamWithMembers,
  TeamMembership,
  CreateTeamRequest,
  CreateTeamResponse,
  JoinTeamRequest,
  JoinTeamResponse,
  UpdateTeamRequest,
  InviteToTeamRequest,
  InviteToTeamResponse,
  TeamMembershipUpdateRequest,
  TeamStats,
  TeamError,
  TeamValidationError,
  TeamPermissionError,
  TEAM_CONSTANTS,
  TEAM_ROLE_PERMISSIONS,
  TeamRole,
  TeamMembershipWithProfile,
} from "@/types/teams";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a new team in a classroom
 */
export const createTeam = async (
  data: CreateTeamRequest
): Promise<CreateTeamResponse> => {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new TeamError("AUTH_ERROR", "User must be authenticated");
  }

  // Validate team name
  if (
    !data.name ||
    data.name.trim().length < TEAM_CONSTANTS.MIN_TEAM_NAME_LENGTH
  ) {
    throw new TeamValidationError(
      "name",
      "TOO_SHORT",
      "Team name must be at least 2 characters long"
    );
  }

  if (data.name.length > TEAM_CONSTANTS.MAX_TEAM_NAME_LENGTH) {
    throw new TeamValidationError(
      "name",
      "TOO_LONG",
      "Team name must be less than 100 characters"
    );
  }

  // Validate max_members
  if (
    data.max_members &&
    (data.max_members < TEAM_CONSTANTS.MIN_TEAM_SIZE ||
      data.max_members > TEAM_CONSTANTS.MAX_TEAM_SIZE)
  ) {
    throw new TeamValidationError(
      "max_members",
      "INVALID_SIZE",
      `Team size must be between ${TEAM_CONSTANTS.MIN_TEAM_SIZE} and ${TEAM_CONSTANTS.MAX_TEAM_SIZE}`
    );
  }

  // Check if user is already in a team in this classroom
  // Check if user is already in a team in this classroom
  const { data: existingMemberships, error: membershipCheckError } =
    await supabase
      .from("team_memberships")
      .select("id, team_id")
      .eq("user_id", user.id)
      .is("left_at", null);

  if (
    !membershipCheckError &&
    existingMemberships &&
    existingMemberships.length > 0
  ) {
    // Check if any of these memberships are for teams in the same classroom
    const teamIds = existingMemberships.map((m) => m.team_id);
    const { data: teamsInClassroom, error: teamsError } = await supabase
      .from("classroom_teams")
      .select("id")
      .in("id", teamIds)
      .eq("classroom_id", data.classroom_id)
      .eq("is_active", true);

    if (!teamsError && teamsInClassroom && teamsInClassroom.length > 0) {
      throw new TeamError(
        "ALREADY_IN_TEAM",
        "You are already a member of a team in this classroom"
      );
    }
  }

  // Verify user is in the classroom
  const { data: classroomMembership, error: classroomError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", data.classroom_id)
    .eq("user_id", user.id)
    .single();

  if (classroomError || !classroomMembership) {
    throw new TeamError(
      "NOT_IN_CLASSROOM",
      "You must be a member of this classroom to create a team"
    );
  }

  try {
    // Create the team
    const { data: team, error: teamError } = await supabase
      .from("classroom_teams")
      .insert({
        classroom_id: data.classroom_id,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        created_by: user.id,
        max_members: data.max_members || TEAM_CONSTANTS.DEFAULT_MAX_MEMBERS,
        team_metadata: data.team_metadata || null,
      })
      .select()
      .single();

    if (teamError) {
      throw new TeamError("CREATE_FAILED", teamError.message);
    }

    // Add creator as team leader
    const { data: membership, error: membershipError } = await supabase
      .from("team_memberships")
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: "leader",
        is_leader: true,
      })
      .select()
      .single();

    if (membershipError) {
      // Rollback team creation if membership fails
      await supabase.from("classroom_teams").delete().eq("id", team.id);
      throw new TeamError("MEMBERSHIP_FAILED", membershipError.message);
    }

    return {
      team,
      membership,
    };
  } catch (error) {
    if (error instanceof TeamError) throw error;
    throw new TeamError("CREATE_FAILED", "Failed to create team");
  }
};

/**
 * Gets all teams in a classroom with their members
 */
export const getClassroomTeams = async (
  classroomId: string,
  serverClient?: SupabaseClient<any, "public", any>
): Promise<TeamWithMembers[]> => {
  const supabase = serverClient || createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log("🔐 Auth check:", { user: user?.id, authError });

  if (authError || !user) {
    throw new TeamError("AUTH_ERROR", "User must be authenticated");
  }

  // Get teams and their members in a single query using the view
  const { data: teams, error: teamsError } = await supabase
    .from("classroom_teams")
    .select(
      `
      id,
      classroom_id,
      name,
      description,
      created_by,
      created_at,
      is_active,
      max_members,
      team_metadata,
      team_members_with_profiles(
        id,
        team_id,
        user_id,
        role,
        joined_at,
        left_at,
        is_leader,
        member_metadata,
        username,
        full_name,
        avatar_url
      )
    `
    )
    .eq("classroom_id", classroomId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (teamsError) {
    throw new TeamError("FETCH_FAILED", teamsError.message);
  }

  // Process each team with its members
  return teams.map((team: any) => {
    // Format memberships to match TeamMembershipWithProfile structure
    const teamMemberships: TeamMembershipWithProfile[] = (
      team.team_members_with_profiles || []
    )
      .filter((member: any) => member.left_at === null) // Only active members
      .map((member: any) => ({
        id: member.id,
        team_id: member.team_id,
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        left_at: member.left_at,
        is_leader: member.is_leader,
        member_metadata: member.member_metadata,
        profiles: {
          id: member.user_id,
          username: member.username,
          full_name: member.full_name,
          avatar_url: member.avatar_url,
        },
      }));

    const leader = teamMemberships.find(
      (m: TeamMembershipWithProfile) => m.is_leader
    );
    const currentUserMembership = teamMemberships.find(
      (m: TeamMembershipWithProfile) => m.user_id === user.id
    );

    return {
      ...team,
      team_memberships: teamMemberships,
      member_count: teamMemberships.length,
      leader,
      current_user_membership: currentUserMembership || null,
    };
  });
};

/**
 * Gets a specific team with full details
 */
export const getTeamById = async (teamId: string): Promise<TeamWithMembers> => {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new TeamError("AUTH_ERROR", "User must be authenticated");
  }

  // Get team and its members in a single query
  const { data: team, error: teamError } = await supabase
    .from("classroom_teams")
    .select(
      `
      id,
      classroom_id,
      name,
      description,
      created_by,
      created_at,
      is_active,
      max_members,
      team_metadata,
      team_members_with_profiles(
        id,
        team_id,
        user_id,
        role,
        joined_at,
        left_at,
        is_leader,
        member_metadata,
        username,
        full_name,
        avatar_url
      )
    `
    )
    .eq("id", teamId)
    .single();

  if (teamError || !team) {
    throw new TeamError("FETCH_FAILED", "Team not found");
  }

  // Format memberships to match TeamMembershipWithProfile structure
  const formattedMemberships: TeamMembershipWithProfile[] = (
    team.team_members_with_profiles || []
  )
    .filter((member: any) => member.left_at === null) // Only active members
    .map((member: any) => ({
      id: member.id,
      team_id: member.team_id,
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      left_at: member.left_at,
      is_leader: member.is_leader,
      member_metadata: member.member_metadata,
      profiles: {
        id: member.user_id,
        username: member.username,
        full_name: member.full_name,
        avatar_url: member.avatar_url,
      },
    }));

  const leader = formattedMemberships.find(
    (m: TeamMembershipWithProfile) => m.is_leader
  );
  const currentUserMembership = formattedMemberships.find(
    (m: TeamMembershipWithProfile) => m.user_id === user.id
  );

  return {
    ...team,
    team_memberships: formattedMemberships,
    member_count: formattedMemberships.length,
    leader,
    current_user_membership: currentUserMembership || null,
  };
};

/**
 * Updates a team (only leader and instructors can do this)
 */
export const updateTeam = async (
  teamId: string,
  updates: UpdateTeamRequest
): Promise<ClassroomTeam> => {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new TeamError("AUTH_ERROR", "User must be authenticated");
  }

  // Validate updates
  if (
    updates.name &&
    updates.name.trim().length < TEAM_CONSTANTS.MIN_TEAM_NAME_LENGTH
  ) {
    throw new TeamValidationError(
      "name",
      "TOO_SHORT",
      "Team name must be at least 2 characters long"
    );
  }

  if (
    updates.max_members &&
    (updates.max_members < TEAM_CONSTANTS.MIN_TEAM_SIZE ||
      updates.max_members > TEAM_CONSTANTS.MAX_TEAM_SIZE)
  ) {
    throw new TeamValidationError(
      "max_members",
      "INVALID_SIZE",
      `Team size must be between ${TEAM_CONSTANTS.MIN_TEAM_SIZE} and ${TEAM_CONSTANTS.MAX_TEAM_SIZE}`
    );
  }

  const { data, error } = await supabase
    .from("classroom_teams")
    .update({
      ...(updates.name && { name: updates.name.trim() }),
      ...(updates.description !== undefined && {
        description: updates.description?.trim() || null,
      }),
      ...(updates.max_members !== undefined && {
        max_members: updates.max_members,
      }),
      ...(updates.team_metadata !== undefined && {
        team_metadata: updates.team_metadata,
      }),
      ...(updates.is_active !== undefined && { is_active: updates.is_active }),
    })
    .eq("id", teamId)
    .select()
    .single();

  if (error) {
    throw new TeamError("UPDATE_FAILED", error.message);
  }

  return data;
};

/**
 * Joins a team (if there's space and user isn't already in a team)
 */
export const joinTeam = async (
  data: JoinTeamRequest
): Promise<JoinTeamResponse> => {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new TeamError("AUTH_ERROR", "User must be authenticated");
  }

  // Get team details
  const { data: team, error: teamError } = await supabase
    .from("classroom_teams")
    .select("*")
    .eq("id", data.team_id)
    .eq("is_active", true)
    .single();

  if (teamError || !team) {
    throw new TeamError("TEAM_NOT_FOUND", "Team not found or inactive");
  }

  // Check if user is already in a team in this classroom
  // First get all user's current team memberships
  const { data: userMemberships, error: membershipCheckError } = await supabase
    .from("team_memberships")
    .select("team_id")
    .eq("user_id", user.id)
    .is("left_at", null);

  if (!membershipCheckError && userMemberships && userMemberships.length > 0) {
    // Check if any of these memberships are for teams in the same classroom
    const userTeamIds = userMemberships.map((m: any) => m.team_id);
    const { data: teamsInSameClassroom, error: classroomTeamsError } =
      await supabase
        .from("classroom_teams")
        .select("id")
        .in("id", userTeamIds)
        .eq("classroom_id", team.classroom_id)
        .eq("is_active", true);

    if (
      !classroomTeamsError &&
      teamsInSameClassroom &&
      teamsInSameClassroom.length > 0
    ) {
      throw new TeamError(
        "ALREADY_IN_TEAM",
        "You are already a member of a team in this classroom"
      );
    }
  }

  // Check if team has space
  // Get current team members
  const { data: teamMembers, error: membersError } = await supabase
    .from("team_memberships")
    .select("id, left_at")
    .eq("team_id", data.team_id)
    .is("left_at", null);

  if (membersError) {
    throw new TeamError("FETCH_FAILED", "Failed to check team capacity");
  }

  const activeMemberships = teamMembers.filter((m: any) => !m.left_at);
  if (team.max_members && activeMemberships.length >= team.max_members) {
    throw new TeamError("TEAM_FULL", "This team is full");
  }

  // Check if user is in the classroom
  const { data: classroomMembership, error: classroomError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", team.classroom_id)
    .eq("user_id", user.id)
    .single();

  if (classroomError || !classroomMembership) {
    throw new TeamError(
      "NOT_IN_CLASSROOM",
      "You must be a member of this classroom to join teams"
    );
  }

  // Create membership
  const { data: membership, error: joinError } = await supabase
    .from("team_memberships")
    .insert({
      team_id: data.team_id,
      user_id: user.id,
      role: "member",
      is_leader: false,
    })
    .select()
    .single();

  if (joinError) {
    throw new TeamError("JOIN_FAILED", joinError.message);
  }

  // Get updated team details
  const updatedTeam = await getTeamById(data.team_id);

  return {
    membership,
    team: updatedTeam,
  };
};

/**
 * Leaves a team (leaders must transfer leadership first)
 */
export const leaveTeam = async (teamId: string): Promise<void> => {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new TeamError("AUTH_ERROR", "User must be authenticated");
  }

  // Get current membership
  const { data: membership, error: membershipError } = await supabase
    .from("team_memberships")
    .select("*")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .is("left_at", null)
    .single();

  if (membershipError || !membership) {
    throw new TeamError("NOT_MEMBER", "You are not a member of this team");
  }

  // Check if user is leader
  if (membership.is_leader) {
    // Get other members to see if leadership can be transferred
    const { data: otherMembers, error: otherMembersError } = await supabase
      .from("team_memberships")
      .select("*")
      .eq("team_id", teamId)
      .neq("user_id", user.id)
      .is("left_at", null);

    if (otherMembersError) {
      throw new TeamError("FETCH_FAILED", "Failed to check team members");
    }

    if (otherMembers && otherMembers.length > 0) {
      throw new TeamPermissionError(
        "LEAVE_TEAM",
        "Leaders must transfer leadership before leaving. Promote another member to leader first."
      );
    }
    // If no other members, allow leader to leave (this will effectively delete the team)
  }

  // Mark membership as left
  const { error: leaveError } = await supabase
    .from("team_memberships")
    .update({ left_at: new Date().toISOString() })
    .eq("id", membership.id);

  if (leaveError) {
    throw new TeamError("LEAVE_FAILED", leaveError.message);
  }
};

/**
 * Removes a member from a team (only leaders and instructors can do this)
 */
export const removeMemberFromTeam = async (
  teamId: string,
  userId: string
): Promise<void> => {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new TeamError("AUTH_ERROR", "User must be authenticated");
  }

  // Cannot remove yourself using this function
  if (user.id === userId) {
    throw new TeamError("INVALID_ACTION", "Use leaveTeam to remove yourself");
  }

  // Check permissions (handled by RLS policies, but we add explicit check for UX)
  const { data: currentUserMembership, error: permissionError } = await supabase
    .from("team_memberships")
    .select("is_leader")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .is("left_at", null)
    .single();

  if (permissionError || !currentUserMembership?.is_leader) {
    throw new TeamPermissionError(
      "REMOVE_MEMBER",
      "Only team leaders can remove members"
    );
  }

  // Get target membership
  const { data: targetMembership, error: targetError } = await supabase
    .from("team_memberships")
    .select("*")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .is("left_at", null)
    .single();

  if (targetError || !targetMembership) {
    throw new TeamError("NOT_MEMBER", "User is not a member of this team");
  }

  // Cannot remove another leader
  if (targetMembership.is_leader) {
    throw new TeamPermissionError(
      "REMOVE_MEMBER",
      "Cannot remove another leader. Demote them first."
    );
  }

  // Mark membership as left
  const { error: removeError } = await supabase
    .from("team_memberships")
    .update({ left_at: new Date().toISOString() })
    .eq("id", targetMembership.id);

  if (removeError) {
    throw new TeamError("REMOVE_FAILED", removeError.message);
  }
};

/**
 * Updates a team member's role (only leaders can do this)
 */
export const updateMemberRole = async (
  teamId: string,
  userId: string,
  updates: TeamMembershipUpdateRequest
): Promise<TeamMembership> => {
  console.log("🔄 updateMemberRole START:", { teamId, userId, updates });

  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log("🔐 Auth check:", { user: user?.id, authError });

  if (authError || !user) {
    console.error("❌ Auth failed:", authError);
    throw new TeamError("AUTH_ERROR", "User must be authenticated");
  }

  // Cannot update yourself
  if (user.id === userId) {
    console.error("❌ Cannot update self:", {
      currentUser: user.id,
      targetUser: userId,
    });
    throw new TeamError("INVALID_ACTION", "Cannot update your own role");
  }

  // Check permissions - only team leaders can update member roles
  const { data: currentUserMembership, error: permissionError } = await supabase
    .from("team_memberships")
    .select("is_leader")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .is("left_at", null)
    .single();

  console.log("👤 Current user membership check:", {
    currentUserMembership,
    permissionError,
    query: { team_id: teamId, user_id: user.id },
  });

  if (permissionError) {
    console.error("❌ Permission check error:", permissionError);
    throw new TeamPermissionError(
      "UPDATE_MEMBER_ROLE",
      "You are not a member of this team"
    );
  }

  if (!currentUserMembership.is_leader) {
    console.error("❌ Not a leader:", currentUserMembership);
    throw new TeamPermissionError(
      "UPDATE_MEMBER_ROLE",
      "Only team leaders can update member roles"
    );
  }

  // Check if target user is a member of the team
  const { data: targetMembership, error: targetError } = await supabase
    .from("team_memberships")
    .select("*")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .is("left_at", null)
    .single();

  console.log("🎯 Target membership check:", {
    targetMembership,
    targetError,
    query: { team_id: teamId, user_id: userId },
  });

  if (targetError) {
    console.error("❌ Target membership check error:", targetError);
    throw new TeamError("NOT_MEMBER", "Error checking target user membership");
  }

  if (!targetMembership) {
    console.error("❌ Target membership not found");
    throw new TeamError(
      "NOT_MEMBER",
      "Target user is not a member of this team"
    );
  }
  // If attempting to demote a leader, ensure this is not the last leader for the team
  if (targetMembership.is_leader && updates.is_leader === false) {
    console.log("🔄 Checking leader count before demotion...");
    // Count active leaders in this team
    const { count: leaderCount, error: leaderCountError } = await supabase
      .from("team_memberships")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("is_leader", true)
      .is("left_at", null);

    console.log("👑 Leader count check:", { leaderCount, leaderCountError });

    if (leaderCountError) {
      console.error("❌ Failed to count team leaders:", leaderCountError);
      throw new TeamError(
        "UPDATE_FAILED",
        "Failed to validate team leadership before demotion"
      );
    }

    if (leaderCount === 1) {
      console.error("❌ Cannot demote last leader:", { leaderCount });
      throw new TeamPermissionError(
        "DEMOTE_LAST_LEADER",
        "Cannot demote the last leader — transfer leadership first"
      );
    }
  }

  console.log("🔄 Preparing update payload:", {
    targetMembershipId: targetMembership.id,
    updates,
  });

  // Perform update by membership id to avoid ambiguity and RLS edge cases
  try {
    console.log("💾 Executing update...");
    const { data: updatedMembership, error: updateError } = await supabase
      .from("team_memberships")
      .update({
        ...(updates.role && { role: updates.role }),
        ...(updates.is_leader !== undefined && {
          is_leader: updates.is_leader,
        }),
        ...(updates.member_metadata !== undefined && {
          member_metadata: updates.member_metadata,
        }),
      })
      .eq("id", targetMembership.id)
      .select()
      .single();

    console.log("📝 Update result:", { updatedMembership, updateError });

    if (updateError) {
      console.error("❌ Update error:", updateError);
      throw new TeamError(
        "UPDATE_FAILED",
        updateError.message || "Failed to update member role"
      );
    }

    if (!updatedMembership) {
      console.error("❌ No updated membership returned");
      throw new TeamError(
        "UPDATE_FAILED",
        "Failed to update member role - member not found"
      );
    }

    console.log("✅ Update successful:", updatedMembership);
    return updatedMembership as TeamMembership;
  } catch (err: any) {
    if (err instanceof TeamError) {
      console.error("❌ TeamError caught:", err);
      throw err;
    }
    console.error("❌ Unexpected update error:", err);
    throw new TeamError(
      "UPDATE_FAILED",
      err?.message || "Failed to update member role"
    );
  }
};

/**
 * Gets students in a classroom who are not in any team
 * Uses the students_without_teams view for better performance and to avoid relationship issues
 */
export const getStudentsWithoutTeams = async (classroomId: string) => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("students_without_teams")
    .select("user_id, username, full_name, avatar_url")
    .eq("classroom_id", classroomId);

  if (error) {
    throw new TeamError("FETCH_FAILED", error.message);
  }

  return data.map((item: any) => ({
    user_id: item.user_id,
    username: item.username,
    full_name: item.full_name,
    avatar_url: item.avatar_url,
  }));
};

/**
 * Gets team statistics for a classroom
 */
export const getClassroomTeamStats = async (
  classroomId: string
): Promise<TeamStats> => {
  const supabase = createClient();

  // Get all active teams in the classroom
  const { data: teams, error: teamsError } = await supabase
    .from("classroom_teams")
    .select("id, max_members")
    .eq("classroom_id", classroomId)
    .eq("is_active", true);

  if (teamsError) {
    throw new TeamError(
      "FETCH_FAILED",
      "Failed to fetch teams: " + teamsError.message
    );
  }

  // Get all active team memberships for this classroom's teams
  const teamIds = teams.map((team) => team.id);

  let memberships: { team_id: string }[] = [];
  if (teamIds.length > 0) {
    const { data: teamMemberships, error: membershipsError } = await supabase
      .from("team_memberships")
      .select("team_id")
      .in("team_id", teamIds)
      .is("left_at", null);

    if (membershipsError) {
      throw new TeamError(
        "FETCH_FAILED",
        "Failed to fetch memberships: " + membershipsError.message
      );
    }
    memberships = teamMemberships || [];
  }

  // Get total student count
  const { count: totalStudents, error: studentsError } = await supabase
    .from("classroom_memberships")
    .select("id", { count: "exact" })
    .eq("classroom_id", classroomId)
    .eq("role", "student");

  if (studentsError) {
    throw new TeamError(
      "FETCH_FAILED",
      "Failed to fetch students: " + studentsError.message
    );
  }

  // Calculate statistics
  const totalTeams = teams.length;
  const activeTeams = totalTeams;

  // Group memberships by team
  const teamMembershipsCount = memberships.reduce(
    (acc: Record<string, number>, membership: { team_id: string }) => {
      acc[membership.team_id] = (acc[membership.team_id] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const teamSizes = Object.values(teamMembershipsCount);
  const averageTeamSize =
    teamSizes.length > 0
      ? teamSizes.reduce((sum, size) => sum + size, 0) / teamSizes.length
      : 0;

  const teamsAtCapacity = teams.filter(
    (team) =>
      team.max_members && teamMembershipsCount[team.id] >= team.max_members
  ).length;

  const studentsInTeams = memberships.length;
  const studentsWithoutTeams = (totalStudents || 0) - studentsInTeams;

  // Team size distribution
  const teamSizeDistribution = teamSizes.reduce(
    (acc: Record<number, number>, size: number) => {
      acc[size] = (acc[size] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );

  return {
    total_teams: totalTeams,
    active_teams: activeTeams,
    average_team_size: Math.round(averageTeamSize * 10) / 10,
    teams_at_capacity: teamsAtCapacity,
    students_in_teams: studentsInTeams,
    students_without_teams: studentsWithoutTeams,
    team_size_distribution: teamSizeDistribution,
  };
};

/**
 * Deletes a team (only leaders and instructors can do this)
 */
export const deleteTeam = async (teamId: string): Promise<void> => {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new TeamError("AUTH_ERROR", "User must be authenticated");
  }

  // Soft delete by marking as inactive
  const { error } = await supabase
    .from("classroom_teams")
    .update({
      is_active: false,
      // Keep the team record for audit purposes but mark all memberships as left
    })
    .eq("id", teamId);

  if (error) {
    throw new TeamError("DELETE_FAILED", error.message);
  }

  // Mark all memberships as left
  await supabase
    .from("team_memberships")
    .update({ left_at: new Date().toISOString() })
    .eq("team_id", teamId)
    .is("left_at", null);
};

/**
 * Transfer team leadership to another member
 */
export const transferTeamLeadership = async (
  teamId: string,
  newLeaderUserId: string
): Promise<void> => {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new TeamError("AUTH_ERROR", "User must be authenticated");
  }

  // Get current leader membership
  const { data: currentLeader, error: currentLeaderError } = await supabase
    .from("team_memberships")
    .select("*")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .eq("is_leader", true)
    .is("left_at", null)
    .single();

  if (currentLeaderError) {
    throw new TeamPermissionError(
      "TRANSFER_LEADERSHIP",
      "Only the current leader can transfer leadership"
    );
  }

  if (!currentLeader) {
    throw new TeamPermissionError(
      "TRANSFER_LEADERSHIP",
      "You are not the current leader of this team"
    );
  }

  // Get new leader membership
  const { data: newLeader, error: newLeaderError } = await supabase
    .from("team_memberships")
    .select("*")
    .eq("team_id", teamId)
    .eq("user_id", newLeaderUserId)
    .is("left_at", null)
    .single();

  if (newLeaderError) {
    throw new TeamError("NOT_MEMBER", "Error checking team membership");
  }

  if (!newLeader) {
    throw new TeamError(
      "NOT_MEMBER",
      "New leader must be a current member of the team"
    );
  }

  // Update roles: new leader becomes leader, current leader becomes member
  const { error: updateError } = await supabase
    .from("team_memberships")
    .update({
      is_leader: true,
      role: "leader",
    })
    .eq("id", newLeader.id);

  if (updateError) {
    throw new TeamError("TRANSFER_FAILED", updateError.message);
  }

  // The trigger will automatically demote the old leader
};

/**
 * Gets all team forked maps for a classroom
 * Instructors can see all team maps, while team members can only see their own team's maps
 */
export const getClassroomTeamMaps = async (classroomId: string) => {
  const supabase = createClient();
  console.log("🔍 getClassroomTeamMaps called with classroomId:", classroomId);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("❌ Auth error:", authError);
    throw new TeamError("AUTH_ERROR", "User must be authenticated");
  }

  console.log("✅ User authenticated:", user.id);

  // Check user's role in the classroom
  const { data: membership, error: membershipError } = await supabase
    .from("classroom_memberships")
    .select("role")
    .eq("classroom_id", classroomId)
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    console.error("❌ Membership error:", membershipError);
    throw new TeamError("NOT_IN_CLASSROOM", "User is not in this classroom");
  }

  console.log("✅ User membership:", membership);
  const isInstructor = membership.role === "instructor";
  console.log("👤 Is instructor:", isInstructor);

  // Get team maps based on user role
  let query = supabase
    .from("classroom_team_maps")
    .select(
      `
      id,
      team_id,
      map_id,
      original_map_id,
      created_by,
      created_at,
      metadata,
      classroom_teams!team_id (
        id,
        classroom_id,
        name,
        description
      ),
      learning_maps!map_id (
        id,
        title,
        description,
        creator_id,
        created_at,
        updated_at,
        map_nodes (
          id,
          difficulty,
          node_assessments (id)
        )
      ),
      original_maps:learning_maps!original_map_id (
        id,
        title,
        description
      )
    `
    )
    .eq("classroom_teams.classroom_id", classroomId);

  // If not an instructor, only show maps for teams the user is in
  if (!isInstructor) {
    console.log("🔍 Non-instructor: Getting user's teams in classroom");
    // Get user's team IDs in this classroom
    const { data: userTeams, error: userTeamsError } = await supabase
      .from("team_memberships")
      .select(
        `
        team_id,
        classroom_teams!team_id (
          classroom_id
        )
      `
      )
      .eq("user_id", user.id)
      .eq("classroom_teams.classroom_id", classroomId)
      .is("left_at", null);

    console.log("🔍 User teams query result:", { userTeams, userTeamsError });

    if (userTeamsError) {
      console.error("❌ User teams fetch error:", userTeamsError);
      throw new TeamError("FETCH_FAILED", userTeamsError.message);
    }

    const teamIds = userTeams?.map((ut) => ut.team_id) || [];
    console.log("📝 User team IDs:", teamIds);

    if (teamIds.length === 0) {
      console.log("ℹ️ User is not in any teams, returning empty array");
      return []; // User is not in any teams, so no team maps to show
    }

    query = query.in("team_id", teamIds);
    console.log("🔍 Filtered query to user's teams:", teamIds);
  } else {
    console.log("👨‍🏫 Instructor: Will see all team maps in classroom");
  }

  console.log("🔍 Executing team maps query...");
  const { data: teamMaps, error: teamMapsError } = await query.order(
    "created_at",
    { ascending: false }
  );

  console.log("📊 Team maps query result:", {
    teamMapsCount: teamMaps?.length || 0,
    teamMapsError,
    sampleData: teamMaps?.[0]
      ? {
          id: teamMaps[0].id,
          team_id: teamMaps[0].team_id,
          map_id: teamMaps[0].map_id,
          hasLearningMaps: !!teamMaps[0].learning_maps,
          hasClassroomTeams: !!teamMaps[0].classroom_teams,
        }
      : null,
  });

  if (teamMapsError) {
    console.error("❌ Team maps fetch error:", teamMapsError);
    throw new TeamError("FETCH_FAILED", teamMapsError.message);
  }

  // Check if there are any team maps at all for debugging
  console.log("🔍 Checking total team maps in database...");
  const { data: allTeamMaps, error: allTeamMapsError } = await supabase
    .from("classroom_team_maps")
    .select("id, team_id, map_id, classroom_teams!team_id(classroom_id)")
    .limit(10);

  console.log("📊 All team maps in database:", {
    count: allTeamMaps?.length || 0,
    data: allTeamMaps,
  });

  // Transform the data to include calculated statistics
  const transformedMaps = (teamMaps || []).map((teamMap: any) => {
    console.log("🔄 Transforming team map:", {
      id: teamMap.id,
      team_id: teamMap.team_id,
      map_id: teamMap.map_id,
      hasLearningMaps: !!teamMap.learning_maps,
      hasClassroomTeams: !!teamMap.classroom_teams,
      hasOriginalMaps: !!teamMap.original_maps,
    });

    const map = teamMap.learning_maps;
    const nodes = map?.map_nodes || [];
    const nodeCount = nodes.length;
    const avgDifficulty =
      nodeCount > 0
        ? Math.round(
            nodes.reduce(
              (sum: number, node: any) => sum + (node.difficulty || 1),
              0
            ) / nodeCount
          )
        : 1;
    const totalAssessments = nodes.reduce(
      (sum: number, node: any) => sum + (node.node_assessments?.length || 0),
      0
    );

    const transformed = {
      team_map_id: teamMap.id,
      map_id: teamMap.map_id,
      original_map_id: teamMap.original_map_id,
      team_id: teamMap.team_id,
      team_name: teamMap.classroom_teams?.name || "Unknown Team",
      team_description: teamMap.classroom_teams?.description,
      map_title: map?.title || "Unknown Map",
      map_description: map?.description,
      original_map_title: teamMap.original_maps?.title || "Unknown Original",
      created_by: teamMap.created_by,
      created_at: teamMap.created_at,
      forked_at: teamMap.created_at,
      node_count: nodeCount,
      avg_difficulty: avgDifficulty,
      total_assessments: totalAssessments,
      metadata: teamMap.metadata,
    };

    console.log("✅ Transformed map:", transformed);
    return transformed;
  });

  console.log("🎉 Returning transformed maps:", {
    count: transformedMaps.length,
  });
  return transformedMaps;
};
