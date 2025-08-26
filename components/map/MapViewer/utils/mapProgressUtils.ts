/**
 * Pure utility functions for map progress logic
 */

import { FullLearningMap } from "@/lib/supabase/maps";
import { 
  ProgressMap, 
  ProgressStats, 
  EnhancedProgress,
  SubmissionRequirement,
  UserRole 
} from "../types";

/**
 * Get submission requirement for a node
 */
export function getSubmissionRequirement(
  map: FullLearningMap, 
  nodeId: string
): SubmissionRequirement {
  const nodeData = map.map_nodes.find((n) => n.id === nodeId);
  return nodeData?.metadata?.submission_requirement || "single";
}

/**
 * Check if a node is unlocked based on prerequisites
 */
export function isNodeUnlocked(
  map: FullLearningMap,
  progressMap: ProgressMap,
  nodeId: string,
  isTeamMap: boolean,
  userRole: UserRole
): boolean {
  // Find the node data
  const nodeData = map.map_nodes.find((n) => n.id === nodeId);

  // Text nodes are always "unlocked" (visible) since they're just annotations
  if ((nodeData as any)?.node_type === "text") {
    return true;
  }

  // Instructors can see all nodes in team maps
  const isInstructorOrTA = userRole === "instructor" || userRole === "TA";
  if (isTeamMap && isInstructorOrTA) {
    return true;
  }

  // Find all nodes that have paths leading to this node
  const prerequisites = map.map_nodes.filter((node) =>
    node.node_paths_source.some((path) => path.destination_node_id === nodeId)
  );

  // If no prerequisites, node is unlocked (starting node)
  if (prerequisites.length === 0) return true;

  // Check if ALL prerequisites are passed OR submitted (pending grade)
  return prerequisites.every((prereq) => {
    const progress = progressMap[prereq.id];
    const status = progress?.status || (progress as any)?.status;
    return status === "passed" || status === "submitted";
  });
}

/**
 * Check if node is completed based on submission requirements
 */
export function isNodeCompleted(
  map: FullLearningMap,
  progressMap: ProgressMap,
  nodeId: string,
  progress: EnhancedProgress | undefined,
  isTeamMap: boolean,
  userRole: UserRole
): boolean {
  if (!progress) return false;

  const requirement = getSubmissionRequirement(map, nodeId);
  const status = progress.status || (progress as any)?.status;
  const isInstructorOrTA = userRole === "instructor" || userRole === "TA";

  // For individual maps (non-team maps), always use single requirement logic
  if (!isTeamMap || !isInstructorOrTA) {
    return status === "passed" || status === "submitted";
  }

  // For team maps, check submission requirements
  if (requirement === "single") {
    // Single requirement: any team member completion counts
    return status === "passed" || status === "submitted";
  } else {
    // All requirement: check if all team members have submitted
    if (progress?.member_progress) {
      return progress.member_progress.every(
        (member: any) =>
          member.node_status === "passed" || member.node_status === "submitted"
      );
    }
    return status === "passed" || status === "submitted";
  }
}

/**
 * Calculate progress statistics by requirement type
 */
export function getProgressStats(
  map: FullLearningMap,
  progressMap: ProgressMap,
  isTeamMap: boolean,
  userRole: UserRole
): ProgressStats {
  const stats: ProgressStats = {
    singleRequirement: { completed: 0, total: 0 },
    allRequirement: { completed: 0, total: 0 },
    totalCompleted: 0,
    totalNodes: map.map_nodes.filter((n) => (n as any)?.node_type !== "text").length,
  };

  map.map_nodes.forEach((node) => {
    // Skip text nodes
    if ((node as any)?.node_type === "text") return;

    const requirement = getSubmissionRequirement(map, node.id);
    const progress = progressMap[node.id];
    const completed = isNodeCompleted(map, progressMap, node.id, progress, isTeamMap, userRole);

    if (requirement === "single") {
      stats.singleRequirement.total++;
      if (completed) stats.singleRequirement.completed++;
    } else {
      stats.allRequirement.total++;
      if (completed) stats.allRequirement.completed++;
    }

    if (completed) stats.totalCompleted++;
  });

  return stats;
}

/**
 * Get node status information
 */
export function getNodeStatus(
  map: FullLearningMap,
  progressMap: ProgressMap,
  nodeId: string,
  isTeamMap: boolean,
  userRole: UserRole
): {
  isUnlocked: boolean;
  isCompleted: boolean;
  status: string;
  requirement: SubmissionRequirement;
} {
  const progress = progressMap[nodeId];
  const isUnlocked = isNodeUnlocked(map, progressMap, nodeId, isTeamMap, userRole);
  const isCompleted = isNodeCompleted(map, progressMap, nodeId, progress, isTeamMap, userRole);
  const status = progress?.status || (progress as any)?.status || "not_started";
  const requirement = getSubmissionRequirement(map, nodeId);

  return {
    isUnlocked,
    isCompleted,
    status,
    requirement,
  };
}

/**
 * Filter progress by status
 */
export function filterProgressByStatus(
  progressMap: ProgressMap,
  targetStatus: string
): number {
  return Object.values(progressMap).filter((p) => {
    const status = p.status || (p as any)?.status;
    return status === targetStatus;
  }).length;
}

/**
 * Get learning nodes (exclude text nodes)
 */
export function getLearningNodes(map: FullLearningMap) {
  return map.map_nodes.filter((node) => (node as any)?.node_type !== "text");
}

/**
 * Get unlocked learning nodes
 */
export function getUnlockedLearningNodes(
  map: FullLearningMap,
  progressMap: ProgressMap,
  isTeamMap: boolean,
  userRole: UserRole
) {
  const learningNodes = getLearningNodes(map);
  return learningNodes.filter((node) =>
    isNodeUnlocked(map, progressMap, node.id, isTeamMap, userRole)
  );
}