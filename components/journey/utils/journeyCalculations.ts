/**
 * Journey Map Calculation Utilities
 *
 * Pure functions for calculating journey statistics, progress,
 * and project positioning.
 */

import { ProjectWithMilestones } from "@/types/journey";
import {
  RECENT_ACTIVITY_DAYS,
  NODE_LAYOUT,
} from "../constants/journeyMapConfig";

// ========================================
// PROGRESS CALCULATIONS
// ========================================

/**
 * Calculate overall progress percentage across all projects
 */
export function calculateOverallProgress(
  projects: ProjectWithMilestones[]
): number {
  if (projects.length === 0) return 0;
  const total = projects.reduce(
    (sum, p) => sum + (p.progress_percentage || 0),
    0
  );
  return Math.round(total / projects.length);
}

/**
 * Calculate journey statistics for dashboard display
 */
export function calculateJourneyStats(projects: ProjectWithMilestones[]) {
  const totalProjects = projects.length;
  const northStarCount = projects.filter(
    (p) => p.metadata?.is_north_star
  ).length;
  const activeProjects = projects.filter(
    (p) => p.status === "in_progress"
  ).length;
  const completedProjects = projects.filter(
    (p) => p.status === "completed"
  ).length;
  const totalMilestones = projects.reduce(
    (sum, p) => sum + (p.milestone_count || 0),
    0
  );
  const completedMilestones = projects.reduce(
    (sum, p) => sum + (p.completed_milestone_count || 0),
    0
  );

  return {
    totalProjects,
    northStarCount,
    activeProjects,
    completedProjects,
    totalMilestones,
    completedMilestones,
    progressPercentage:
      totalMilestones > 0
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : 0,
  };
}

// ========================================
// PROJECT FILTERING
// ========================================

/**
 * Separate projects into North Star and short-term categories
 */
export function categorizeProjects(projects: ProjectWithMilestones[]) {
  const northStarProjects = projects.filter(
    (p) => p.metadata?.is_north_star === true
  );
  const shortTermProjects = projects.filter(
    (p) => p.metadata?.is_north_star !== true
  );

  return { northStarProjects, shortTermProjects };
}

/**
 * Extract simplified North Star project list for dropdowns
 */
export function extractNorthStarOptions(projects: ProjectWithMilestones[]) {
  return projects
    .filter((p) => p.metadata?.is_north_star === true)
    .map((p) => ({ id: p.id, title: p.title }));
}

// ========================================
// ACTIVITY DETECTION
// ========================================

/**
 * Check if a project has recent activity (within threshold)
 */
export function checkRecentActivity(project: ProjectWithMilestones): boolean {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - RECENT_ACTIVITY_DAYS);
  const updatedAt = new Date(project.updated_at);
  return updatedAt > threshold;
}

// ========================================
// NODE POSITIONING
// ========================================

export interface NodePosition {
  x: number;
  y: number;
}

/**
 * Calculate default circular position for a node
 */
export function calculateCircularPosition(
  index: number,
  totalCount: number,
  radius: number
): NodePosition {
  const angle = (index / totalCount) * 2 * Math.PI;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

/**
 * Get node position with fallback to calculated default
 */
export function getNodePosition(
  project: ProjectWithMilestones,
  index: number,
  totalCount: number,
  isNorthStar: boolean
): NodePosition {
  // Use saved position if available
  if (project.position_x !== null && project.position_y !== null) {
    return {
      x: project.position_x,
      y: project.position_y,
    };
  }

  // Calculate default position
  const radius = isNorthStar
    ? NODE_LAYOUT.NORTH_STAR_RADIUS
    : NODE_LAYOUT.SHORT_TERM_RADIUS;

  return calculateCircularPosition(index, totalCount, radius);
}

/**
 * Count linked projects for a North Star project
 */
export function countLinkedProjects(
  northStarId: string,
  allProjects: ProjectWithMilestones[]
): number {
  return allProjects.filter((p) => p.metadata?.north_star_id === northStarId)
    .length;
}
