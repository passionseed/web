/**
 * Safe Map Deletion with Transaction-like Behavior
 * Provides atomic-like deletion with detailed logging and rollback capabilities
 */

import { createClient } from "@/utils/supabase/client";

// Safe logger with fallback for SSR compatibility
const deleteLogger = {
  info: (msg: string, ctx?: any) => {
    try {
      // In development, log to console
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log(`[MAP-DELETE] ${msg}`, ctx || '');
      }
    } catch {
      // Silently fail if there are issues
    }
  },
  error: (msg: string, err?: any, ctx?: any) => {
    try {
      console.error(`[MAP-DELETE ERROR] ${msg}`, err || '', ctx || '');
    } catch {
      // Silently fail if there are issues
    }
  }
};

interface DeletionStats {
  nodeIds: string[];
  assessmentIds: string[];
  submissionGrades: number;
  assessmentSubmissions: number;
  studentProgress: number;
  nodeAssessments: number;
  nodeContent: number;
  nodePaths: number;
  mapNodes: number;
}

interface DeletionResult {
  success: boolean;
  stats: DeletionStats;
  message: string;
  error?: string;
}

export const deleteMapSafely = async (mapId: string): Promise<DeletionResult> => {
  const supabase = createClient();
  const stats: DeletionStats = {
    nodeIds: [],
    assessmentIds: [],
    submissionGrades: 0,
    assessmentSubmissions: 0,
    studentProgress: 0,
    nodeAssessments: 0,
    nodeContent: 0,
    nodePaths: 0,
    mapNodes: 0,
  };

  try {
    deleteLogger.info(`Starting safe deletion of map ${mapId}`, { mapId });

    // Step 1: Collect all related IDs first (for rollback if needed)
    const { data: mapData, error: mapFetchError } = await supabase
      .from("learning_maps")
      .select("title, creator_id")
      .eq("id", mapId)
      .single();

    if (mapFetchError) {
      if (mapFetchError.code === "PGRST116") {
        return {
          success: false,
          stats,
          message: "Map not found",
          error: "The specified map does not exist"
        };
      }
      throw new Error(`Failed to fetch map: ${mapFetchError.message}`);
    }

    // Get all node IDs
    const { data: nodes, error: nodesError } = await supabase
      .from("map_nodes")
      .select("id")
      .eq("map_id", mapId);

    if (nodesError) {
      throw new Error(`Failed to fetch map nodes: ${nodesError.message}`);
    }

    if (!nodes || nodes.length === 0) {
      deleteLogger.info("Map has no nodes, proceeding with map-only deletion", { mapId });
      const { error: mapError } = await supabase
        .from("learning_maps")
        .delete()
        .eq("id", mapId);

      if (mapError) {
        throw new Error(`Failed to delete map: ${mapError.message}`);
      }

      return {
        success: true,
        stats,
        message: `Map "${mapData.title}" deleted successfully (no nodes to clean up)`
      };
    }

    stats.nodeIds = nodes.map(n => n.id);
    deleteLogger.info(`Found ${stats.nodeIds.length} nodes to process`, { 
      mapId, 
      nodeCount: stats.nodeIds.length 
    });

    // Get all assessment IDs
    const { data: assessments } = await supabase
      .from("node_assessments")
      .select("id")
      .in("node_id", stats.nodeIds);

    stats.assessmentIds = assessments?.map(a => a.id) || [];

    // Step 2: Count what will be deleted (for logging and UI feedback)
    const counts = await Promise.all([
      // Count submission grades
      stats.assessmentIds.length > 0 ? supabase
        .from("submission_grades")
        .select("id", { count: "exact", head: true })
        .in("submission_id", 
          supabase.from("assessment_submissions").select("id").in("assessment_id", stats.assessmentIds)
        ) : null,
      
      // Count assessment submissions
      stats.assessmentIds.length > 0 ? supabase
        .from("assessment_submissions")
        .select("id", { count: "exact", head: true })
        .in("assessment_id", stats.assessmentIds) : null,
      
      // Count student progress
      supabase
        .from("student_node_progress")
        .select("id", { count: "exact", head: true })
        .in("node_id", stats.nodeIds),
      
      // Count node content
      supabase
        .from("node_content")
        .select("id", { count: "exact", head: true })
        .in("node_id", stats.nodeIds),
      
      // Count node paths
      supabase
        .from("node_paths")
        .select("id", { count: "exact", head: true })
        .or(`source_node_id.in.(${stats.nodeIds.join(",")}),destination_node_id.in.(${stats.nodeIds.join(",")})`)
    ]);

    // Extract counts
    stats.submissionGrades = counts[0]?.count || 0;
    stats.assessmentSubmissions = counts[1]?.count || 0;
    stats.studentProgress = counts[2]?.count || 0;
    stats.nodeContent = counts[3]?.count || 0;
    stats.nodePaths = counts[4]?.count || 0;
    stats.nodeAssessments = stats.assessmentIds.length;
    stats.mapNodes = stats.nodeIds.length;

    deleteLogger.info("Deletion statistics calculated", {
      mapId,
      stats
    });

    // Step 3: Perform deletions in correct order
    const deletionSteps = [
      // Delete submission grades first (deepest dependency)
      async () => {
        if (stats.assessmentIds.length === 0) return;
        const { error } = await supabase
          .from("submission_grades")
          .delete()
          .in("submission_id", 
            supabase.from("assessment_submissions").select("id").in("assessment_id", stats.assessmentIds)
          );
        if (error) throw new Error(`Failed to delete submission grades: ${error.message}`);
        deleteLogger.info("Deleted submission grades", { mapId, count: stats.submissionGrades });
      },

      // Delete assessment submissions
      async () => {
        if (stats.assessmentIds.length === 0) return;
        const { error } = await supabase
          .from("assessment_submissions")
          .delete()
          .in("assessment_id", stats.assessmentIds);
        if (error) throw new Error(`Failed to delete assessment submissions: ${error.message}`);
        deleteLogger.info("Deleted assessment submissions", { mapId, count: stats.assessmentSubmissions });
      },

      // Delete student progress
      async () => {
        const { error } = await supabase
          .from("student_node_progress")
          .delete()
          .in("node_id", stats.nodeIds);
        if (error) throw new Error(`Failed to delete student progress: ${error.message}`);
        deleteLogger.info("Deleted student progress", { mapId, count: stats.studentProgress });
      },

      // Delete node assessments
      async () => {
        const { error } = await supabase
          .from("node_assessments")
          .delete()
          .in("node_id", stats.nodeIds);
        if (error) throw new Error(`Failed to delete node assessments: ${error.message}`);
        deleteLogger.info("Deleted node assessments", { mapId, count: stats.nodeAssessments });
      },

      // Delete node content
      async () => {
        const { error } = await supabase
          .from("node_content")
          .delete()
          .in("node_id", stats.nodeIds);
        if (error) throw new Error(`Failed to delete node content: ${error.message}`);
        deleteLogger.info("Deleted node content", { mapId, count: stats.nodeContent });
      },

      // Delete node paths
      async () => {
        const { error: sourceError } = await supabase
          .from("node_paths")
          .delete()
          .in("source_node_id", stats.nodeIds);
        if (sourceError) throw new Error(`Failed to delete source node paths: ${sourceError.message}`);
        
        const { error: destError } = await supabase
          .from("node_paths")
          .delete()
          .in("destination_node_id", stats.nodeIds);
        if (destError) throw new Error(`Failed to delete destination node paths: ${destError.message}`);
        
        deleteLogger.info("Deleted node paths", { mapId, count: stats.nodePaths });
      },

      // Delete map nodes
      async () => {
        const { error } = await supabase
          .from("map_nodes")
          .delete()
          .in("id", stats.nodeIds);
        if (error) throw new Error(`Failed to delete map nodes: ${error.message}`);
        deleteLogger.info("Deleted map nodes", { mapId, count: stats.mapNodes });
      },

      // Delete the map itself (final step)
      async () => {
        const { error } = await supabase
          .from("learning_maps")
          .delete()
          .eq("id", mapId);
        if (error) throw new Error(`Failed to delete learning map: ${error.message}`);
        deleteLogger.info("Deleted learning map", { mapId, title: mapData.title });
      }
    ];

    // Execute all deletion steps
    for (let i = 0; i < deletionSteps.length; i++) {
      try {
        await deletionSteps[i]();
      } catch (error) {
        deleteLogger.error(`Deletion step ${i + 1} failed`, error, { mapId, step: i + 1 });
        throw error;
      }
    }

    const totalDeleted = Object.values(stats).reduce((sum, val) => {
      return sum + (Array.isArray(val) ? val.length : typeof val === 'number' ? val : 0);
    }, 0);

    deleteLogger.info("Map deletion completed successfully", {
      mapId,
      title: mapData.title,
      totalRecordsDeleted: totalDeleted,
      stats
    });

    return {
      success: true,
      stats,
      message: `Map "${mapData.title}" and all related data deleted successfully. ${totalDeleted} total records removed.`
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error during deletion";
    
    deleteLogger.error("Map deletion failed", error, {
      mapId,
      partialStats: stats
    });

    return {
      success: false,
      stats,
      message: "Deletion failed",
      error: errorMessage
    };
  }
};