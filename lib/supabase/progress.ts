import { createClient } from "./client";
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

// --- Student Progress Functions ---

export const getStudentProgress = async (
  userId: string,
  nodeId: string
): Promise<StudentNodeProgress | null> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("student_node_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("node_id", nodeId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching progress:", error);
    throw new Error("Could not fetch student progress.");
  }

  return data || null;
};

export const startNodeProgress = async (
  userId: string,
  nodeId: string
): Promise<StudentNodeProgress> => {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("student_node_progress")
    .upsert({
      user_id: userId,
      node_id: nodeId,
      status: "in_progress",
      arrived_at: now,
      started_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error("Error starting progress:", error);
    throw new Error("Could not start node progress.");
  }

  return data;
};

export const submitNodeProgress = async (
  progressId: string
): Promise<StudentNodeProgress> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("student_node_progress")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", progressId)
    .select()
    .single();

  if (error) {
    console.error("Error submitting progress:", error);
    throw new Error("Could not submit progress.");
  }

  return data;
};

// --- Progress Calculation Functions ---

/**
 * Loads all student progress for a specific map and user
 */
export const loadMapProgress = async (
  mapId: string,
  userId?: string
): Promise<Record<string, StudentNodeProgress>> => {
  const supabase = createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return {};
    targetUserId = user.id;
  }

  const { data, error } = await supabase
    .from("student_node_progress")
    .select("*")
    .eq("user_id", targetUserId)
    .in("node_id", [
      // Subquery to get all node IDs for this map
      supabase.from("map_nodes").select("id").eq("map_id", mapId),
    ]);

  if (error) {
    console.error("Error loading map progress:", error);
    return {};
  }

  // Convert to map for easy lookup
  const progressMap: Record<string, StudentNodeProgress> = {};
  (data || []).forEach((progress) => {
    progressMap[progress.node_id] = progress;
  });

  return progressMap;
};

/**
 * Calculates real-time progress percentage for a user's map enrollment
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
  const supabase = createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
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
    targetUserId = user.id;
  }

  // Get all nodes for this map
  const { data: mapNodes, error: nodesError } = await supabase
    .from("map_nodes")
    .select("id")
    .eq("map_id", mapId);

  if (nodesError) {
    console.error("Error fetching map nodes:", nodesError);
    throw new Error("Failed to calculate map progress");
  }

  const totalNodes = mapNodes?.length || 0;
  if (totalNodes === 0) {
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

  // Get progress for all nodes
  const nodeIds = mapNodes.map((node) => node.id);
  const { data: progressData, error: progressError } = await supabase
    .from("student_node_progress")
    .select("node_id, status")
    .eq("user_id", targetUserId)
    .in("node_id", nodeIds);

  if (progressError) {
    console.error("Error fetching progress data:", progressError);
    throw new Error("Failed to calculate map progress");
  }

  // Count nodes by status
  let passedNodes = 0;
  let failedNodes = 0;
  let submittedNodes = 0;
  let inProgressNodes = 0;

  (progressData || []).forEach((progress) => {
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

  // Calculate progress: passed nodes / total nodes
  const progressPercentage = Math.floor((passedNodes / totalNodes) * 100);
  const completedNodes = passedNodes + failedNodes; // Nodes that have been fully processed

  return {
    progressPercentage,
    completedNodes,
    totalNodes,
    passedNodes,
    failedNodes,
    submittedNodes,
    inProgressNodes,
  };
};
