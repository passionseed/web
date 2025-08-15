/**
 * Student Progress Management - Consolidated API-based approach
 * This is the single source of truth for all student progress operations
 */

import { 
  getMapProgress, 
  getNodeProgress, 
  updateNodeProgress, 
  startNodeProgress as apiStartNodeProgress, 
  submitNodeProgress as apiSubmitNodeProgress,
  type StudentProgress
} from "@/lib/api/progress-client";

import {
  LearningMap,
  MapNode,
  NodePath,
  NodeContent,
  NodeAssessment,
  QuizQuestion,
  StudentNodeProgress,
  AssessmentSubmission,
  SubmissionGrade,
  Grade,
  ProgressStatus,
} from "@/types/map";

// Re-export types for compatibility
export type { StudentProgress };
export type { StudentNodeProgress };

/**
 * Get student progress for a specific node
 * This is the main function used throughout the app
 */
export async function getStudentProgress(
  userId: string,
  nodeId: string,
  mapId?: string
): Promise<StudentProgress | null> {
  console.log("📊 [Progress] Loading progress for node:", nodeId, "mapId:", mapId);
  
  if (!mapId) {
    console.warn("⚠️ [Progress] No mapId provided, cannot fetch progress reliably");
    return null;
  }

  try {
    console.log("🔄 [Progress] Using API client for progress fetch");
    const result = await getNodeProgress(mapId, nodeId);
    console.log("✅ [Progress] Successfully fetched progress:", result?.status || 'not_started');
    return result;
  } catch (error) {
    console.error("❌ [Progress] Error fetching progress:", error);
    return null;
  }
}

/**
 * Load all progress for a map
 * Returns a map of nodeId -> progress for easy lookup
 */
export async function loadAllProgress(mapId: string): Promise<Record<string, StudentProgress>> {
  console.log("🗺️ [Progress] Loading all progress for map:", mapId);
  
  try {
    const result = await getMapProgress(mapId);
    console.log("✅ [Progress] Successfully loaded progress for", Object.keys(result).length, "nodes");
    return result;
  } catch (error) {
    console.error("❌ [Progress] Error loading all progress:", error);
    return {};
  }
}

/**
 * Start progress on a node (mark as in_progress)
 */
export const startNodeProgress = async (
  userId: string,
  nodeId: string,
  mapId?: string
): Promise<StudentProgress | null> => {
  console.log("🚀 [Progress] Starting node progress:", { userId, nodeId, mapId });
  
  if (!mapId) {
    console.warn("⚠️ [Progress] No mapId provided, cannot start progress");
    return null;
  }

  try {
    const result = await apiStartNodeProgress(mapId, nodeId);
    console.log("✅ [Progress] Successfully started progress");
    return result;
  } catch (error) {
    console.error("❌ [Progress] Error starting node progress:", error);
    return null;
  }
};

/**
 * Submit node progress (mark as submitted)
 * This version takes a mapId and nodeId instead of progressId
 */
export const submitNodeProgress = async (
  mapId: string,
  nodeId: string
): Promise<StudentProgress | null> => {
  console.log("📤 [Progress] Submitting node progress:", { mapId, nodeId });
  
  try {
    const result = await apiSubmitNodeProgress(mapId, nodeId);
    console.log("✅ [Progress] Successfully submitted progress");
    return result;
  } catch (error) {
    console.error("❌ [Progress] Error submitting node progress:", error);
    return null;
  }
};

/**
 * Legacy function for compatibility with existing code
 * @deprecated Use submitNodeProgress(mapId, nodeId) instead
 */
export const submitNodeProgressLegacy = async (
  progressId: string
): Promise<StudentNodeProgress | null> => {
  console.warn("⚠️ [Progress] Using legacy submitNodeProgress - this may not work due to RLS restrictions");
  // This function is deprecated and may not work due to RLS
  // Callers should be updated to use the new API-based approach
  return null;
};

/**
 * Calculate real-time progress percentage for a user's map enrollment
 * Uses the new API-based approach
 */
export const calculateMapProgress = async (
  mapId: string,
  userId?: string
): Promise<{
  progressPercentage: number;
  completedNodes: number;
  totalNodes: number;
  passedNodes: number;
  failedNodes: number;
  submittedNodes: number;
  inProgressNodes: number;
}> => {
  console.log("📊 [Progress] Calculating map progress for:", mapId);
  
  try {
    // Get all progress for this map
    const progressMap = await getMapProgress(mapId);
    const progressArray = Object.values(progressMap);
    
    // Count nodes by status
    let passedNodes = 0;
    let failedNodes = 0;
    let submittedNodes = 0;
    let inProgressNodes = 0;

    progressArray.forEach((progress) => {
      switch (progress.status) {
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
      }
    });

    // For total nodes, we need to get the actual count from the map
    // This is a limitation of the current approach - we might not have progress for all nodes
    const totalNodes = Math.max(progressArray.length, passedNodes + failedNodes + submittedNodes + inProgressNodes);
    
    // Calculate progress: passed nodes / total nodes
    const progressPercentage = totalNodes > 0 ? Math.floor((passedNodes / totalNodes) * 100) : 0;
    const completedNodes = passedNodes + failedNodes; // Nodes that have been fully processed

    const result = {
      progressPercentage,
      completedNodes,
      totalNodes,
      passedNodes,
      failedNodes,
      submittedNodes,
      inProgressNodes,
    };

    console.log("✅ [Progress] Calculated progress:", result);
    return result;
  } catch (error) {
    console.error("❌ [Progress] Error calculating map progress:", error);
    return {
      progressPercentage: 0,
      completedNodes: 0,
      totalNodes: 0,
      passedNodes: 0,
      failedNodes: 0,
      submittedNodes: 0,
      inProgressNodes: 0,
    };
  }
};

/**
 * Load map progress (alias for loadAllProgress for compatibility)
 */
export const loadMapProgress = loadAllProgress;
