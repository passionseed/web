/**
 * Student Progress Management - API-based approach
 * This module provides functions for managing student progress through maps
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

// Re-export the StudentProgress type for compatibility
export type { StudentProgress };

/**
 * Get student progress for a specific node
 * This is the main function used throughout the app
 */
export async function getStudentProgress(
  userId: string,
  nodeId: string,
  mapId?: string
): Promise<StudentProgress | null> {
  console.log("📊 Loading progress for node:", nodeId);
  
  if (!mapId) {
    console.warn("⚠️ [Progress] No mapId provided, cannot fetch progress");
    return null;
  }

  try {
    console.log("🔄 Using API client for progress fetch");
    return await getNodeProgress(mapId, nodeId);
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
  console.log("🗺️ Loading all progress for map:", mapId);
  
  try {
    return await getMapProgress(mapId);
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
  console.log("🚀 Starting node progress:", { userId, nodeId, mapId });
  
  if (!mapId) {
    console.warn("⚠️ [Progress] No mapId provided, cannot start progress");
    return null;
  }

  try {
    return await apiStartNodeProgress(mapId, nodeId);
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
  console.log("📤 Submitting node progress:", { mapId, nodeId });
  
  try {
    return await apiSubmitNodeProgress(mapId, nodeId);
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
