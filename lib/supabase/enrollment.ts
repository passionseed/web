// --- User Map Enrollment Functions ---

import { LearningMap, UserMapEnrollment, MapNode } from "@/types/map";
import { createClient } from "@/utils/supabase/server";

/**
 * Enrolls a user in a learning map when they click "Start Adventure"
 */
export const enrollUserInMap = async (
  mapId: string
): Promise<UserMapEnrollment> => {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User must be authenticated to join a map");
  }

  // Use upsert to handle race conditions - insert if doesn't exist, otherwise return existing
  const { data, error } = await supabase
    .from("user_map_enrollments")
    .upsert(
      {
        user_id: user.id,
        map_id: mapId,
        progress_percentage: 0,
      },
      {
        onConflict: "user_id,map_id",
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error enrolling user in map:", error);
    throw new Error("Failed to join the learning map");
  }

  console.log("🎉 User enrolled in map:", mapId);
  return data;
};

/**
 * Checks if the current user is enrolled in a specific map
 */
export const isUserEnrolledInMap = async (mapId: string): Promise<boolean> => {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("user_map_enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("map_id", mapId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking enrollment:", error);
    return false;
  }

  return !!data;
};

/**
 * Gets user's enrollment details for a specific map
 */
export const getUserMapEnrollment = async (
  mapId: string
): Promise<UserMapEnrollment | null> => {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_map_enrollments")
    .select("*")
    .eq("user_id", user.id)
    .eq("map_id", mapId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching enrollment:", error);
    return null;
  }

  return data;
};
/**
 * Updates the user's map enrollment progress percentage
 */
export const updateMapEnrollmentProgress = async (
  mapId: string,
  progressPercentage: number,
  isCompleted: boolean = false
): Promise<void> => {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User must be authenticated");

  const updateData: Partial<UserMapEnrollment> = {
    progress_percentage: progressPercentage,
  };

  if (isCompleted && progressPercentage === 100) {
    updateData.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("user_map_enrollments")
    .update(updateData)
    .eq("user_id", user.id)
    .eq("map_id", mapId);

  if (error) {
    console.error("Error updating enrollment progress:", error);
    throw new Error("Failed to update progress");
  }

  console.log(
    `✅ Updated map ${mapId} progress to ${progressPercentage}%${isCompleted ? " (COMPLETED)" : ""}`
  );
};

/**
 * Gets enrolled maps with real-time calculated progress (optimized to avoid N+1 queries)
 */
export const getUserEnrolledMapsWithProgress = async (): Promise<
  (LearningMap & {
    enrollment: UserMapEnrollment;
    node_count: number;
    avg_difficulty: number;
    total_assessments: number;
    realTimeProgress: {
      progressPercentage: number;
      completedNodes: number;
      totalNodes: number;
      passedNodes: number;
      failedNodes: number;
      submittedNodes: number;
      inProgressNodes: number;
    };
  })[]
> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User must be authenticated to fetch enrolled maps");
  }

  // Get enrolled maps with their nodes in a single query
  const { data: enrollmentData, error: enrollmentError } = await supabase
    .from("user_map_enrollments")
    .select(
      `
      *,
      learning_maps (
        *,
        map_nodes (
          id,
          difficulty,
          node_assessments (id)
        )
      )
    `
    )
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false });

  if (enrollmentError) {
    console.error("Error fetching enrolled maps:", enrollmentError);
    throw new Error("Failed to fetch your enrolled maps");
  }

  if (!enrollmentData || enrollmentData.length === 0) {
    return [];
  }

  // Extract all node IDs from all enrolled maps
  const allNodeIds: string[] = [];
  enrollmentData
    .filter(
      (enrollment: any) =>
        enrollment && enrollment.learning_maps && enrollment.learning_maps.id
    )
    .forEach((enrollment: any) => {
      const nodes = enrollment.learning_maps?.map_nodes || [];
      nodes.forEach((node: any) => {
        if (node && node.id) {
          allNodeIds.push(node.id);
        }
      });
    });

  // Get all progress data for all nodes in a single query
  const { data: progressData, error: progressError } = await supabase
    .from("student_node_progress")
    .select("node_id, status")
    .eq("user_id", user.id)
    .in("node_id", allNodeIds);

  if (progressError) {
    console.error("Error fetching progress data:", progressError);
    throw new Error("Failed to fetch progress data");
  }

  // Create a lookup map for progress data
  const progressByNodeId: Record<string, string> = {};
  (progressData || []).forEach(
    (progress: { node_id: string; status: string }) => {
      progressByNodeId[progress.node_id] = progress.status;
    }
  );

  const mapsWithProgress = await Promise.all(
    enrollmentData
      .filter(
        (enrollment: any) =>
          enrollment &&
          enrollment.learning_maps &&
          enrollment.learning_maps.id &&
          enrollment.learning_maps.title
      )
      .map(async (enrollment: any) => {
        const map = enrollment.learning_maps;
        const nodes = map.map_nodes || [];

        // Calculate statistics
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
          (sum: number, node: any) =>
            sum + (node.node_assessments?.length || 0),
          0
        );

        // Calculate real-time progress using the lookup map
        let passedNodes = 0;
        let failedNodes = 0;
        let submittedNodes = 0;
        let inProgressNodes = 0;

        nodes.forEach((node: any) => {
          const status = progressByNodeId[node.id];
          switch (status) {
            case "passed":
              passedNodes++;
              break;
            case "failed":
              failedNodes++;
              break;
            case "submitted":
              submittedNodes++;
              break;
            case "in_progress":
              inProgressNodes++;
              break;
            // Node without progress data is implicitly "not_started"
          }
        });

        const progressPercentage =
          nodeCount > 0 ? Math.floor((passedNodes / nodeCount) * 100) : 0;
        const completedNodes = passedNodes + failedNodes;

        const realTimeProgress = {
          progressPercentage,
          completedNodes,
          totalNodes: nodeCount,
          passedNodes,
          failedNodes,
          submittedNodes,
          inProgressNodes,
        };

        // Update enrollment progress if it's significantly different
        if (
          Math.abs(
            realTimeProgress.progressPercentage - enrollment.progress_percentage
          ) >= 5
        ) {
          try {
            await updateMapEnrollmentProgress(
              map.id,
              realTimeProgress.progressPercentage,
              realTimeProgress.progressPercentage === 100
            );
            // Update the enrollment object to reflect the new progress
            enrollment.progress_percentage =
              realTimeProgress.progressPercentage;
          } catch (error) {
            console.error(
              `Failed to update progress for map ${map.id}:`,
              error
            );
          }
        }

        return {
          ...map,
          enrollment: {
            id: enrollment.id,
            user_id: enrollment.user_id,
            map_id: enrollment.map_id,
            enrolled_at: enrollment.enrolled_at,
            completed_at: enrollment.completed_at,
            progress_percentage: enrollment.progress_percentage,
          },
          node_count: nodeCount,
          avg_difficulty: avgDifficulty,
          total_assessments: totalAssessments,
          realTimeProgress,
        };
      })
  );

  return mapsWithProgress;
};

/**
 * Gets all maps the current user is enrolled in
 */
export const getUserEnrolledMaps = async (): Promise<
  (LearningMap & {
    enrollment: UserMapEnrollment;
    node_count: number;
    avg_difficulty: number;
    total_assessments: number;
  })[]
> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User must be authenticated to fetch enrolled maps");
  }

  const { data, error } = await supabase
    .from("user_map_enrollments")
    .select(
      `
      *,
      learning_maps (
        *,
        map_nodes (
          id,
          difficulty,
          node_assessments (id)
        )
      )
    `
    )
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false });

  if (error) {
    console.error("Error fetching enrolled maps:", error);
    throw new Error("Failed to fetch your enrolled maps");
  }

  return (data || [])
    .filter(
      (enrollment: any) =>
        enrollment &&
        enrollment.learning_maps &&
        enrollment.learning_maps.id &&
        enrollment.learning_maps.title
    )
    .map((enrollment: any) => {
      const map = enrollment.learning_maps;
      const nodes = map.map_nodes || [];
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

      return {
        ...map,
        enrollment: {
          id: enrollment.id,
          user_id: enrollment.user_id,
          map_id: enrollment.map_id,
          enrolled_at: enrollment.enrolled_at,
          completed_at: enrollment.completed_at,
          progress_percentage: enrollment.progress_percentage,
        },
        node_count: nodeCount,
        avg_difficulty: avgDifficulty,
        total_assessments: totalAssessments,
      };
    });
};

/**
 * Gets the next nodes to complete across all enrolled maps
 * Returns up to 5 upcoming nodes that are unlocked but not yet completed
 */
export const getNextNodesToComplete = async (): Promise<
  Array<{
    node: MapNode;
    map: Pick<LearningMap, "id" | "title" | "category">;
    status: string;
  }>
> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Get enrolled maps with nodes and paths
  const { data: enrollmentData, error: enrollmentError } = await supabase
    .from("user_map_enrollments")
    .select(
      `
      *,
      learning_maps!inner (
        id,
        title,
        category,
        map_nodes (
          id,
          title,
          difficulty,
          node_type,
          metadata,
          node_paths_source:node_paths!node_paths_source_node_id_fkey (
            destination_node_id
          )
        )
      )
    `
    )
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false });

  if (enrollmentError || !enrollmentData || enrollmentData.length === 0) {
    return [];
  }

  // Get all node IDs from all enrolled maps
  const allNodeIds: string[] = [];
  enrollmentData.forEach((enrollment: any) => {
    const nodes = enrollment.learning_maps?.map_nodes || [];
    nodes.forEach((node: any) => {
      if (node && node.id) {
        allNodeIds.push(node.id);
      }
    });
  });

  // Get progress for all nodes
  const { data: progressData } = await supabase
    .from("student_node_progress")
    .select("node_id, status")
    .eq("user_id", user.id)
    .in("node_id", allNodeIds);

  // Create progress lookup
  const progressByNodeId: Record<string, string> = {};
  (progressData || []).forEach((progress: { node_id: string; status: string }) => {
    progressByNodeId[progress.node_id] = progress.status;
  });

  // Helper function to check if node is unlocked
  const isNodeUnlocked = (node: any, nodes: any[]): boolean => {
    // Text nodes are not learning nodes
    if (node.node_type === "text" || node.node_type === "comment") {
      return false;
    }

    // Get prerequisites (nodes that have paths pointing to this node)
    const prerequisites = nodes.filter((n: any) =>
      n.node_paths_source?.some((path: any) => path.destination_node_id === node.id)
    );

    // If no prerequisites, it's a starting node (unlocked)
    if (prerequisites.length === 0) return true;

    // Check if all prerequisites are passed or submitted
    return prerequisites.every((prereq: any) => {
      const status = progressByNodeId[prereq.id];
      return status === "passed" || status === "submitted";
    });
  };

  // Collect next nodes from all maps
  const nextNodes: Array<{
    node: MapNode;
    map: Pick<LearningMap, "id" | "title" | "category">;
    status: string;
  }> = [];

  enrollmentData.forEach((enrollment: any) => {
    const map = enrollment.learning_maps;
    if (!map || !map.map_nodes) return;

    const nodes = map.map_nodes;

    // Find unlocked nodes that are not completed
    nodes.forEach((node: any) => {
      const status = progressByNodeId[node.id] || "not_started";
      const isCompleted = status === "passed" || status === "submitted";

      // Skip text/comment nodes and completed nodes
      if (node.node_type === "text" || node.node_type === "comment" || isCompleted) {
        return;
      }

      // Check if node is unlocked
      if (isNodeUnlocked(node, nodes)) {
        nextNodes.push({
          node: {
            id: node.id,
            map_id: map.id,
            title: node.title,
            instructions: node.instructions,
            difficulty: node.difficulty,
            sprite_url: node.sprite_url,
            metadata: node.metadata,
            node_type: node.node_type,
            created_at: node.created_at,
            updated_at: node.updated_at,
          },
          map: {
            id: map.id,
            title: map.title,
            category: map.category,
          },
          status,
        });
      }
    });
  });

  // Sort by status priority (in_progress first, then not_started)
  // and limit to 5 nodes
  nextNodes.sort((a, b) => {
    if (a.status === "in_progress" && b.status !== "in_progress") return -1;
    if (a.status !== "in_progress" && b.status === "in_progress") return 1;
    return 0;
  });

  return nextNodes.slice(0, 5);
};
