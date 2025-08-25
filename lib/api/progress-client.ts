/**
 * Server-side API client for student progress
 * This bypasses RLS issues by using server-side Supabase client
 */

import { createClient } from "@/utils/supabase/client";
import { TeamNodeProgress } from "../supabase/team-progress";

export interface StudentProgress {
  id: string;
  user_id: string;
  node_id: string;
  status: "not_started" | "in_progress" | "submitted" | "passed" | "failed";
  arrived_at?: string;
  started_at?: string;
  submitted_at?: string;
}

export interface MapProgressResponse {
  success: boolean;
  data: {
    map_id: string;
    user_id: string;
    progress_map: Record<string, StudentProgress>;
    all_progress: StudentProgress[];
  };
  error?: string;
}

export interface NodeProgressResponse {
  success: boolean;
  data: StudentProgress | null;
  error?: string;
}

export interface UpdateProgressResponse {
  success: boolean;
  data: StudentProgress;
  message: string;
  error?: string;
}

/**
 * Get all progress for a user's team in a specific map.
 * This function handles authorization for different user roles (student, TA, instructor)
 * by calling a secure PostgreSQL function in Supabase.
 */
export async function getMapProgress(
  mapId: string
): Promise<Record<string, TeamNodeProgress>> {
  try {
    console.log("🔍 [Progress Client] Fetching map progress for:", mapId);
    const supabase = createClient();

    // Call the PostgreSQL function you created
    const { data: allProgress, error } = await supabase.rpc(
      "get_team_map_progress",
      {
        map_id_param: mapId,
      }
    );

    if (error) {
      console.error(
        "❌ [Progress Client] Error fetching map progress via RPC:",
        error
      );
      return {};
    }

    if (!allProgress) {
      console.log(
        "✅ [Progress Client] No progress data returned for map:",
        mapId
      );
      return {};
    }

    // Create a map of node_id -> progress for easy lookup on the client
    const progressMap: Record<string, TeamNodeProgress> = {};
    allProgress.forEach((progress) => {
      progressMap[progress.node_id] = progress;
    });

    console.log("✅ [Progress Client] Map progress fetched:", {
      mapId,
      progressCount: allProgress.length,
    });

    return progressMap;
  } catch (error) {
    console.error(
      "❌ [Progress Client] Exception when fetching map progress:",
      error
    );
    return {};
  }
}
/**
 * Get progress for a specific node
 */
export async function getNodeProgress(
  mapId: string,
  nodeId: string
): Promise<StudentProgress | null> {
  try {
    console.log("📊 [Progress Client] Fetching node progress:", {
      mapId,
      nodeId,
    });

    const response = await fetch(
      `/api/maps/${mapId}/progress?node_id=${nodeId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("❌ [Progress Client] API response not ok:", {
        status: response.status,
        statusText: response.statusText,
        nodeId,
      });
      return null;
    }

    const result: NodeProgressResponse = await response.json();

    if (!result.success) {
      console.error("❌ [Progress Client] API returned error:", result.error);
      return null;
    }

    console.log("✅ [Progress Client] Node progress fetched:", {
      nodeId,
      status: result.data?.status || "not_started",
    });

    return result.data;
  } catch (error) {
    console.error("❌ [Progress Client] Error fetching node progress:", error);
    return null;
  }
}

/**
 * Update progress for a specific node
 */
export async function updateNodeProgress(
  mapId: string,
  nodeId: string,
  status: StudentProgress["status"],
  options: {
    arrived_at?: string;
    started_at?: string;
    submitted_at?: string;
  } = {}
): Promise<StudentProgress | null> {
  try {
    console.log("🔄 [Progress Client] Updating node progress:", {
      mapId,
      nodeId,
      status,
      options,
    });

    const response = await fetch(`/api/maps/${mapId}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        node_id: nodeId,
        status,
        ...options,
      }),
    });

    if (!response.ok) {
      console.error("❌ [Progress Client] API response not ok:", {
        status: response.status,
        statusText: response.statusText,
        nodeId,
        newStatus: status,
      });
      return null;
    }

    const result: UpdateProgressResponse = await response.json();

    if (!result.success) {
      console.error("❌ [Progress Client] API returned error:", result.error);
      return null;
    }

    console.log("✅ [Progress Client] Node progress updated:", {
      nodeId,
      oldStatus: "unknown",
      newStatus: result.data.status,
      message: result.message,
    });

    return result.data;
  } catch (error) {
    console.error("❌ [Progress Client] Error updating node progress:", error);
    return null;
  }
}

/**
 * Mark a node as started (in_progress)
 */
export async function startNodeProgress(
  mapId: string,
  nodeId: string
): Promise<StudentProgress | null> {
  return await updateNodeProgress(mapId, nodeId, "in_progress", {
    arrived_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
  });
}

/**
 * Mark a node as submitted
 */
export async function submitNodeProgress(
  mapId: string,
  nodeId: string
): Promise<StudentProgress | null> {
  return await updateNodeProgress(mapId, nodeId, "submitted", {
    submitted_at: new Date().toISOString(),
  });
}
