import { createClient } from "@/utils/supabase/client";
import {
  startNodeProgress as startIndividualNodeProgress,
  getStudentProgress,
} from "./progresses";

export interface TeamNodeProgress {
  id: string;
  team_id: string;
  node_id: string;
  status:
    | "not_started"
    | "assigned"
    | "in_progress"
    | "submitted"
    | "passed"
    | "passed_late"
    | "passed_zero_grade"
    | "failed";
  submitted_by?: string;
  assigned_to?: string;
  help_requested: boolean;
  help_request_message?: string;
  help_requested_at?: string;
  scheduled_meeting_id?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberProgress {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_leader: boolean;
  node_status: string;
  submitted_at?: string;
}

export interface TeamProgressSummary {
  [nodeId: string]: TeamNodeProgress & {
    member_progress?: TeamMemberProgress[];
    best_submission?: any;
  };
}

/**
 * Start node progress for a team by starting individual progress for the requesting member
 */
export const startTeamNodeProgress = async (
  userId: string,
  nodeId: string,
  mapId: string,
  teamId: string
): Promise<void> => {
  console.log("🚀 [TeamProgress] Starting team node progress", {
    userId,
    nodeId,
    mapId,
    teamId,
  });

  // Start individual progress - this will trigger the database trigger to update team progress
  const individualProgress = await startIndividualNodeProgress(
    userId,
    nodeId,
    mapId
  );

  if (!individualProgress) {
    throw new Error("Failed to start individual progress for team member");
  }

  // The database trigger will automatically create/update the team progress record
  console.log(
    "✅ [TeamProgress] Team node progress started via individual progress"
  );
};

/**
 * Get team progress for a specific map
 */
export const getTeamProgress = async (
  mapId: string,
  teamId: string
): Promise<TeamProgressSummary> => {
  const supabase = createClient();

  console.log("📊 [TeamProgress] Loading team progress", { mapId, teamId });

  try {
    // First get all node IDs for this map
    const { data: mapNodes, error: mapNodesError } = await supabase
      .from("map_nodes")
      .select("id")
      .eq("map_id", mapId);

    if (mapNodesError) {
      console.error(
        "❌ [TeamProgress] Error loading map nodes:",
        mapNodesError
      );
      throw mapNodesError;
    }

    const nodeIds = mapNodes?.map((node) => node.id) || [];

    if (nodeIds.length === 0) {
      console.log("📊 [TeamProgress] No nodes found for this map");
      return {};
    }

    // Get team progress records for all nodes in this map
    // Note: use valid PostgREST relation select syntax. We alias the relation
    // to `submitted_by_profile` and request the related `profiles` fields.
    const { data: teamProgress, error: teamProgressError } = await supabase
      .from("team_node_progress")
      .select("*")
      .eq("team_id", teamId)
      .in("node_id", nodeIds);

    if (teamProgressError) {
      console.error(
        "❌ [TeamProgress] Error loading team progress:",
        teamProgressError
      );
      throw teamProgressError;
    }

    console.log(
      `✅ [TeamProgress] Loaded ${teamProgress?.length || 0} team progress records`
    );

    // Convert to summary format
    const progressSummary: TeamProgressSummary = {};

    if (teamProgress) {
      teamProgress.forEach((progress: any) => {
        progressSummary[progress.node_id] = {
          id: progress.id,
          team_id: progress.team_id,
          node_id: progress.node_id,
          status: progress.status,
          submitted_by: progress.submitted_by,
          // include aliased submitted_by_profile if available for UI use
          ...(progress.submitted_by_profile
            ? { submitted_by_profile: progress.submitted_by_profile }
            : {}),
          assigned_to: progress.assigned_to,
          help_requested: progress.help_requested || false,
          help_request_message: progress.help_request_message,
          help_requested_at: progress.help_requested_at,
          scheduled_meeting_id: progress.scheduled_meeting_id,
          completed_at: progress.completed_at,
          created_at: progress.created_at,
          updated_at: progress.updated_at,
        };
      });
    }

    return progressSummary;
  } catch (error) {
    console.error("❌ [TeamProgress] Error in getTeamProgress:", error);
    throw error;
  }
};

/**
 * Get detailed team progress for instructors (includes member progress)
 */
export const getTeamProgressForInstructor = async (
  mapId: string,
  teamId: string
): Promise<TeamProgressSummary> => {
  const supabase = createClient();

  console.log("🎓 [TeamProgress] Loading team progress for instructor", {
    mapId,
    teamId,
  });

  try {
    // Get basic team progress
    const baseProgress = await getTeamProgress(mapId, teamId);

    // Get individual member progress for each node
    const nodeIds = Object.keys(baseProgress);

    if (nodeIds.length === 0) {
      return baseProgress;
    }

    // First get team member user IDs
    const { data: teamMemberships, error: teamMembershipsError } =
      await supabase
        .from("team_memberships")
        .select("user_id")
        .eq("team_id", teamId)
        .is("left_at", null);

    if (teamMembershipsError) {
      console.warn(
        "⚠️ [TeamProgress] Could not load team memberships:",
        teamMembershipsError
      );
    }

    const userIds = teamMemberships?.map((tm) => tm.user_id) || [];

    if (userIds.length === 0) {
      console.warn("⚠️ [TeamProgress] No team members found");
      return baseProgress;
    }

    // Get all team member progress for these nodes
    const { data: memberProgress, error: memberProgressError } = await supabase
      .from("student_node_progress")
      .select(
        `
        node_id,
        status,
        submitted_at,
        user_id,
        profiles!inner(username, full_name, avatar_url),
        team_memberships!inner(is_leader)
      `
      )
      .in("node_id", nodeIds)
      .in("user_id", userIds);

    if (memberProgressError) {
      console.warn(
        "⚠️ [TeamProgress] Could not load member progress:",
        memberProgressError
      );
    } else if (memberProgress) {
      // Group member progress by node
      const memberProgressByNode: Record<string, TeamMemberProgress[]> = {};

      memberProgress.forEach((mp: any) => {
        if (!memberProgressByNode[mp.node_id]) {
          memberProgressByNode[mp.node_id] = [];
        }

        memberProgressByNode[mp.node_id].push({
          user_id: mp.user_id,
          username: mp.profiles.username,
          full_name: mp.profiles.full_name,
          avatar_url: mp.profiles.avatar_url,
          is_leader: mp.team_memberships.is_leader || false,
          node_status: mp.status,
          submitted_at: mp.submitted_at,
        });
      });

      // Add member progress to base progress
      Object.keys(baseProgress).forEach((nodeId) => {
        baseProgress[nodeId].member_progress =
          memberProgressByNode[nodeId] || [];
      });
    }

    console.log(
      `✅ [TeamProgress] Loaded instructor team progress for ${nodeIds.length} nodes`
    );
    return baseProgress;
  } catch (error) {
    console.error(
      "❌ [TeamProgress] Error in getTeamProgressForInstructor:",
      error
    );
    throw error;
  }
};

/**
 * Assign a team member to a node (team leaders only)
 */
export const assignTeamMemberToNode = async (
  teamId: string,
  nodeId: string,
  userId: string
): Promise<void> => {
  const supabase = createClient();

  console.log("👥 [TeamProgress] Assigning team member to node", {
    teamId,
    nodeId,
    userId,
  });

  try {
    const { error } = await supabase.from("team_node_progress").upsert(
      {
        team_id: teamId,
        node_id: nodeId,
        assigned_to: userId,
        status: "assigned",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "team_id,node_id" }
    );

    if (error) {
      console.error("❌ [TeamProgress] Error assigning team member:", error);
      throw error;
    }

    console.log("✅ [TeamProgress] Team member assigned successfully");
  } catch (error) {
    console.error("❌ [TeamProgress] Error in assignTeamMemberToNode:", error);
    throw error;
  }
};

/**
 * Request help for a team node
 */
export const requestHelpForTeamNode = async (
  teamId: string,
  nodeId: string,
  message: string
): Promise<void> => {
  const supabase = createClient();

  console.log("🆘 [TeamProgress] Requesting help for team node", {
    teamId,
    nodeId,
  });

  try {
    const { error } = await supabase.from("team_node_progress").upsert(
      {
        team_id: teamId,
        node_id: nodeId,
        help_requested: true,
        help_request_message: message,
        help_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "team_id,node_id" }
    );

    if (error) {
      console.error("❌ [TeamProgress] Error requesting help:", error);
      throw error;
    }

    console.log("✅ [TeamProgress] Help request submitted successfully");
  } catch (error) {
    console.error("❌ [TeamProgress] Error in requestHelpForTeamNode:", error);
    throw error;
  }
};

/**
 * Update team node status (instructors only)
 */
export const updateTeamNodeStatus = async (
  teamId: string,
  nodeId: string,
  status: TeamNodeProgress["status"],
  submittedBy?: string
): Promise<void> => {
  const supabase = createClient();

  console.log("📝 [TeamProgress] Updating team node status", {
    teamId,
    nodeId,
    status,
  });

  try {
    const updateData: any = {
      team_id: teamId,
      node_id: nodeId,
      status: status,
      updated_at: new Date().toISOString(),
    };

    if (submittedBy) {
      updateData.submitted_by = submittedBy;
    }

    if (
      status === "passed" ||
      status === "passed_late" ||
      status === "passed_zero_grade" ||
      status === "failed"
    ) {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("team_node_progress")
      .upsert(updateData, { onConflict: "team_id,node_id" });

    if (error) {
      console.error(
        "❌ [TeamProgress] Error updating team node status:",
        error
      );
      throw error;
    }

    console.log("✅ [TeamProgress] Team node status updated successfully");
  } catch (error) {
    console.error("❌ [TeamProgress] Error in updateTeamNodeStatus:", error);
    throw error;
  }
};

/**
 * Clear help request for a team node
 */
export const clearHelpRequest = async (
  teamId: string,
  nodeId: string
): Promise<void> => {
  const supabase = createClient();

  console.log("🚫 [TeamProgress] Clearing help request", { teamId, nodeId });

  try {
    const { error } = await supabase
      .from("team_node_progress")
      .update({
        help_requested: false,
        help_request_message: null,
        help_requested_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("team_id", teamId)
      .eq("node_id", nodeId);

    if (error) {
      console.error("❌ [TeamProgress] Error clearing help request:", error);
      throw error;
    }

    console.log("✅ [TeamProgress] Help request cleared successfully");
  } catch (error) {
    console.error("❌ [TeamProgress] Error in clearHelpRequest:", error);
    throw error;
  }
};

/**
 * Get team members for a team
 * Returns stable shape with nested profiles to match TeamNodeViewPanel expectations.
 */
export interface TeamMemberWithProfile {
  user_id: string;
  is_leader: boolean;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const getTeamMembers = async (
  teamId: string
): Promise<TeamMemberWithProfile[]> => {
  const supabase = createClient();

  if (!teamId) {
    console.warn(
      "👥 [TeamProgress] getTeamMembers called without teamId; returning empty array"
    );
    return [];
  }

  console.log("👥 [TeamProgress] Loading team members", { teamId });

  try {
    // Step 1: active memberships
    const { data: memberships, error: membersError } = await supabase
      .from("team_memberships")
      .select("user_id, is_leader")
      .eq("team_id", teamId)
      .is("left_at", null);

    if (membersError) {
      console.error("❌ [TeamProgress] Error loading team memberships:", {
        message: membersError.message,
        code: membersError.code,
        details: membersError.details,
        hint: (membersError as any)?.hint,
      });
      throw new Error(
        `Failed to load team memberships for team ${teamId}: ${membersError.message} (code=${membersError.code})`
      );
    }

    if (!memberships || memberships.length === 0) {
      console.log("👥 [TeamProgress] No active team memberships");
      return [];
    }

    const userIds = memberships.map((m) => m.user_id).filter(Boolean);
    if (userIds.length === 0) {
      return [];
    }

    // Step 2: profiles for members
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", userIds);

    if (profilesError) {
      console.error("❌ [TeamProgress] Error loading member profiles:", {
        message: profilesError.message,
        code: profilesError.code,
        details: profilesError.details,
        hint: (profilesError as any)?.hint,
      });
      throw new Error(
        `Failed to load profiles for team ${teamId}: ${profilesError.message} (code=${profilesError.code})`
      );
    }

    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p: any) => profileMap.set(p.id, p));

    // Compose stable shape
    const teamMembers: TeamMemberWithProfile[] = memberships.map((m: any) => {
      const prof = profileMap.get(m.user_id);
      return {
        user_id: m.user_id,
        is_leader: !!m.is_leader,
        profiles: {
          username: prof?.username ?? null,
          full_name: prof?.full_name ?? null,
          avatar_url: prof?.avatar_url ?? null,
        },
      };
    });

    console.log(`✅ [TeamProgress] Loaded ${teamMembers.length} team members`);
    return teamMembers;
  } catch (err: any) {
    console.error("❌ [TeamProgress] Error in getTeamMembers:", {
      message: err?.message || String(err),
      code: err?.code,
      details: err?.details,
      stack: err?.stack,
    });
    throw err instanceof Error ? err : new Error(String(err));
  }
};
