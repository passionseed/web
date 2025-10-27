/**
 * Journey Map Builder
 *
 * Constructs ReactFlow nodes and edges from journey project data.
 * Handles node positioning, edge creation, and data transformation.
 */

import { Node, Edge } from "@xyflow/react";
import { ProjectWithMilestones, ProjectPath } from "@/types/journey";
import {
  calculateOverallProgress,
  categorizeProjects,
  getNodePosition,
  countLinkedProjects,
  checkRecentActivity,
} from "../utils/journeyCalculations";
import { NODE_LAYOUT } from "../constants/journeyMapConfig";
import { getProjectPathStyle } from "../utils/projectPathStyles";

export interface MapBuilderCallbacks {
  onViewMilestones: (projectId: string) => void;
  onEditProject: (projectId: string) => void;
  onAddReflection: (projectId: string) => void;
}

export interface MapBuilderResult {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Build ReactFlow nodes and edges from project data
 */
export function buildJourneyMap(
  projects: ProjectWithMilestones[],
  userId: string,
  userName: string,
  userAvatar: string | undefined,
  callbacks: MapBuilderCallbacks,
  projectPaths: ProjectPath[] = []
): MapBuilderResult {
  const newNodes: Node[] = [];
  const newEdges: Edge[] = [];

  // Create user center node at origin
  const completionPercentage = calculateOverallProgress(projects);
  newNodes.push(
    createUserCenterNode(
      userId,
      userName,
      userAvatar,
      projects.length,
      completionPercentage
    )
  );

  // Separate North Star and short-term projects
  const { northStarProjects, shortTermProjects } = categorizeProjects(projects);

  // Create North Star nodes and edges
  northStarProjects.forEach((project, index) => {
    const position = getNodePosition(
      project,
      index,
      northStarProjects.length,
      true
    );
    const linkedCount = countLinkedProjects(project.id, shortTermProjects);

    newNodes.push(
      createNorthStarNode(project, position, linkedCount, callbacks)
    );

    newEdges.push(createNorthStarEdge("user-center", project.id));
  });

  // Create short-term nodes and edges
  shortTermProjects.forEach((project, index) => {
    const position = getNodePosition(
      project,
      index,
      shortTermProjects.length,
      false
    );
    const northStarId = project.metadata?.north_star_id;
    const northStar = northStarProjects.find((p) => p.id === northStarId);

    newNodes.push(
      createShortTermNode(project, position, northStar?.title, callbacks)
    );

    // Create edge to North Star or user center
    if (northStarId) {
      newEdges.push(createProjectToNorthStarEdge(project.id, northStarId));
    } else {
      const isMainQuest = project.metadata?.is_main_quest === true;
      newEdges.push(createProjectToUserEdge(project.id, isMainQuest));
    }
  });

  // Add project path edges
  projectPaths.forEach((path) => {
    newEdges.push(createProjectPathEdge(path));
  });

  return { nodes: newNodes, edges: newEdges };
}

// ========================================
// NODE CREATORS
// ========================================

function createUserCenterNode(
  userId: string,
  userName: string,
  userAvatar: string | undefined,
  projectCount: number,
  completionPercentage: number
): Node {
  return {
    id: "user-center",
    type: "userCenter",
    position: NODE_LAYOUT.USER_CENTER_POSITION,
    data: {
      userId,
      userName,
      userAvatar,
      projectCount,
      completionPercentage,
    },
    draggable: false,
    selectable: true,
  };
}

function createNorthStarNode(
  project: ProjectWithMilestones,
  position: { x: number; y: number },
  linkedProjectCount: number,
  callbacks: MapBuilderCallbacks
): Node {
  return {
    id: project.id,
    type: "northStar",
    position,
    data: {
      project,
      icon: project.icon || "🎯",
      linkedProjectCount,
      hasRecentActivity: checkRecentActivity(project),
      onViewMilestones: () => callbacks.onViewMilestones(project.id),
      onEdit: () => callbacks.onEditProject(project.id),
      onReflect: () => callbacks.onAddReflection(project.id),
    },
    draggable: true,
    selectable: true,
  };
}

function createShortTermNode(
  project: ProjectWithMilestones,
  position: { x: number; y: number },
  northStarTitle: string | undefined,
  callbacks: MapBuilderCallbacks
): Node {
  return {
    id: project.id,
    type: "shortTerm",
    position,
    data: {
      project,
      icon: project.icon || "🎯",
      hasRecentActivity: checkRecentActivity(project),
      isMainQuest: project.metadata?.is_main_quest === true,
      northStarTitle,
      onViewMilestones: () => callbacks.onViewMilestones(project.id),
      onEdit: () => callbacks.onEditProject(project.id),
    },
    draggable: true,
    selectable: true,
  };
}

// ========================================
// EDGE CREATORS
// ========================================

function createNorthStarEdge(sourceId: string, targetId: string): Edge {
  return {
    id: `${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    type: "northStar",
    animated: false,
  };
}

function createProjectToNorthStarEdge(
  projectId: string,
  northStarId: string
): Edge {
  return {
    id: `${projectId}-northstar-${northStarId}`,
    source: projectId,
    target: northStarId,
    type: "northStar",
    animated: false,
  };
}

function createProjectToUserEdge(
  projectId: string,
  isMainQuest: boolean
): Edge {
  return {
    id: `user-${projectId}`,
    source: "user-center",
    target: projectId,
    type: isMainQuest ? "mainQuest" : "default",
    animated: isMainQuest,
  };
}

function createProjectPathEdge(path: ProjectPath): Edge {
  const pathStyle = getProjectPathStyle(path.path_type);

  return {
    id: path.id,
    source: path.source_project_id,
    target: path.destination_project_id,
    type: "projectLink",
    animated: pathStyle.animated,
    style: {
      stroke: pathStyle.stroke,
      strokeWidth: pathStyle.strokeWidth,
      strokeDasharray: pathStyle.strokeDasharray,
    },
    markerEnd: {
      type: pathStyle.markerEnd.type,
      color: pathStyle.markerEnd.color,
      width: pathStyle.markerEnd.width,
      height: pathStyle.markerEnd.height,
    },
    data: {
      pathType: path.path_type,
      pathId: path.id,
    },
  };
}
