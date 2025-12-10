/**
 * Journey Map Builder
 *
 * Constructs ReactFlow nodes and edges from journey project data.
 * Handles node positioning, edge creation, and data transformation.
 */

import { Node, Edge, MarkerType } from "@xyflow/react";
import { ProjectWithMilestones, ProjectPath, NorthStar } from "@/types/journey";
import {
  calculateOverallProgress,
  categorizeProjects,
  getNodePosition,
  countLinkedProjects,
  checkRecentActivity,
} from "../utils/journeyCalculations";
import { NODE_LAYOUT } from "../constants/journeyMapConfig";
import { getProjectPathStyle } from "../utils/projectPathStyles";
import { NORTH_STAR_SHAPES } from "@/constants/sdg";

export interface MapBuilderCallbacks {
  onViewMilestones: (projectId: string) => void;
  onEditProject: (projectId: string) => void;
  onAddReflection: (projectId: string) => void;
  onEditNorthStar?: (northStar: NorthStar) => void;
  onViewNorthStarDetails?: (northStarId: string) => void;
  onCreateProjectForNorthStar?: (northStarId: string) => void;
  onQuickStatusChange?: (
    northStar: NorthStar,
    newStatus: NorthStar["status"]
  ) => void;
  onUserClick?: () => void;
}

export interface MapBuilderResult {
  nodes: Node[];
  edges: Edge[];
}

export type ZoomLevel = "low" | "medium" | "high";

/**
 * Build ReactFlow nodes and edges from project data
 */
export function buildJourneyMap(
  projects: ProjectWithMilestones[],
  userId: string,
  userName: string,
  userAvatar: string | undefined,
  callbacks: MapBuilderCallbacks,
  projectPaths: ProjectPath[] = [],
  northStars: NorthStar[] = [],
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
      completionPercentage,
      callbacks
    )
  );

  // Create North Star entity nodes (from north_stars table)
  // North Star nodes are now rendered in the NorthStarSky overlay
  // We still calculate positions for project alignment, but don't create nodes
  /*
  northStars.forEach((northStar, index) => {
    // ... (node creation logic removed)
  });
  */

  // Separate North Star and short-term projects
  const { northStarProjects, shortTermProjects } = categorizeProjects(projects);

  // Create North Star nodes
  northStarProjects.forEach((project, index) => {
    const position = getNodePosition(
      project,
      index,
      northStarProjects.length,
      true
    );
    const linkedCount = countLinkedProjects(project.id, shortTermProjects);

    newNodes.push(
      createNorthStarNode(
        project,
        position,
        linkedCount,
        callbacks
      )
    );

    // Removed automatic center connection - users can create manually
  });

  // Create short-term nodes
  // Separate projects: linked to North Star vs independent
  const linkedProjects: Array<{
    project: ProjectWithMilestones;
    northStarId: string;
    northStarEntity: NorthStar;
    milestoneIndex?: number;
  }> = [];
  const independentProjects: ProjectWithMilestones[] = [];

  shortTermProjects.forEach((project) => {
    const linkedNorthStarEntity = northStars.find(
      (ns) => ns.id === project.linked_north_star_id
    );

    if (linkedNorthStarEntity) {
      linkedProjects.push({
        project,
        northStarId: linkedNorthStarEntity.id,
        northStarEntity: linkedNorthStarEntity,
        milestoneIndex: project.metadata?.milestone_index,
      });
    } else {
      independentProjects.push(project);
    }
  });

  // Position and create nodes for linked projects (aligned to North Star)
  const linkedProjectsByNorthStar = new Map<
    string,
    Array<{
      project: ProjectWithMilestones;
      northStarEntity: NorthStar;
      milestoneIndex?: number;
    }>
  >();

  linkedProjects.forEach((item) => {
    const existing = linkedProjectsByNorthStar.get(item.northStarId) || [];
    existing.push(item);
    linkedProjectsByNorthStar.set(item.northStarId, existing);
  });

  // Handle North Stars with no linked projects - create direct edge from user center
  // Edges to North Stars are replaced by directional beams
  /*
  northStars.forEach((northStar) => {
    const linkedItems = linkedProjectsByNorthStar.get(northStar.id);
    const hasLinkedProjects = linkedItems && linkedItems.length > 0;
    if (!hasLinkedProjects) {
      // Create direct edge from user center to North Star if no projects
      newEdges.push(
        createProjectToNorthStarEntityEdge("user-center", northStar.id)
      );
    }
  });
  */

  linkedProjectsByNorthStar.forEach((items) => {
    if (items.length === 0) return;

    const northStarEntity = items[0].northStarEntity;
    const northStarPos = getNorthStarEntityPosition(
      northStarEntity,
      northStars.indexOf(northStarEntity),
      northStars.length
    );

    // Sort by milestone_index if available
    const sortedItems = [...items].sort((a, b) => {
      const indexA = a.milestoneIndex ?? 999;
      const indexB = b.milestoneIndex ?? 999;
      return indexA - indexB;
    });

    // Calculate positions for linked projects
    sortedItems.forEach((item, index) => {
      let position: { x: number; y: number };

      // PRIORITY 1: Use saved position if available
      if (item.project.position_x !== null && item.project.position_y !== null) {
        position = {
          x: item.project.position_x,
          y: item.project.position_y,
        };
      } else {
        // PRIORITY 2: Calculate S-Curve position for new/unsaved projects
        position = calculateSCurvePosition(
          { x: 0, y: 0 }, // User center
          northStarPos, // North Star entity position
          index,
          sortedItems.length
        );
      }

      newNodes.push(
        createShortTermNode(
          item.project,
          position,
          northStarEntity,
          callbacks
        )
      );

      // Create sequential chain edges for continuous line visualization
      if (index === 0) {
        // First project: connect from user center
        newEdges.push(
          createProjectToNorthStarEntityEdge("user-center", item.project.id)
        );
      } else {
        // Middle projects: connect from previous project
        const previousProject = sortedItems[index - 1];
        newEdges.push(
          createProjectToNorthStarEntityEdge(
            previousProject.project.id,
            item.project.id
          )
        );
      }

      // Last project: directional beam handled by node component
      /*
      if (index === sortedItems.length - 1) {
        newEdges.push(
          createProjectToNorthStarEntityEdge(
            item.project.id,
            northStarEntity.id
          )
        );
      }
      */
    });
  });

  // Add independent projects with circular positioning
  independentProjects.forEach((project, index) => {
    const position = getNodePosition(
      project,
      index,
      independentProjects.length,
      false
    );

    // Check for old North Star project (legacy system)
    const northStarId = project.metadata?.north_star_id;
    const northStar = northStarProjects.find((p) => p.id === northStarId);

    newNodes.push(
      createShortTermNode(
        project,
        position,
        undefined, // Legacy North Star projects don't use the sky overlay
        callbacks,
      )
    );
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
  completionPercentage: number,
  callbacks: MapBuilderCallbacks
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
      onClick: callbacks.onUserClick,
    },
    draggable: false,
    selectable: true,
  };
}

function createNorthStarNode(
  project: ProjectWithMilestones,
  position: { x: number; y: number },
  linkedProjectCount: number,
  callbacks: MapBuilderCallbacks,
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
  northStar: NorthStar | undefined,
  callbacks: MapBuilderCallbacks,
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
      northStar,
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

// ========================================
// NORTH STAR ENTITY HELPERS
// ========================================

/**
 * Create a North Star entity node (from north_stars table)
 */
function createNorthStarEntityNode(
  northStar: NorthStar,
  position: { x: number; y: number },
  linkedProjectCount: number,
  callbacks: MapBuilderCallbacks,
): Node {
  return {
    id: northStar.id,
    type: "northStarEntity",
    position,
    data: {
      northStar,
      linkedProjectCount,
      hasRecentActivity: false, // Could be enhanced with activity tracking
      onEdit: () => callbacks.onEditNorthStar?.(northStar),
      onViewDetails: () => callbacks.onViewNorthStarDetails?.(northStar.id),
      onUpdateProgress: () => {
        // Quick progress update handler - could be enhanced
        console.log("Update progress for:", northStar.title);
      },
      onCreateProject: () =>
        callbacks.onCreateProjectForNorthStar?.(northStar.id),
    onQuickStatusChange: (newStatus: NorthStar["status"]) =>
        callbacks.onQuickStatusChange?.(northStar, newStatus),
    },
    draggable: true,
    selectable: true,
  };
}

/**
 * Create a University Goal node
 */
function createUniversityGoalNode(
  northStar: NorthStar,
  position: { x: number; y: number },
  linkedProjectCount: number,
  callbacks: MapBuilderCallbacks,
): Node {
  return {
    id: northStar.id,
    type: "universityGoal",
    position,
    data: {
      northStar,
      linkedProjectCount,
      hasRecentActivity: false,
      onEdit: () => callbacks.onEditNorthStar?.(northStar),
      onViewDetails: () => callbacks.onViewNorthStarDetails?.(northStar.id),
      onCreateProject: () =>
        callbacks.onCreateProjectForNorthStar?.(northStar.id),
      onQuickStatusChange: (newStatus: NorthStar["status"]) =>
        callbacks.onQuickStatusChange?.(northStar, newStatus),
    },
    draggable: true,
    selectable: true,
  };
}

/**
 * Calculate position for North Star entity
 * Places at top of canvas, spread horizontally
 */
function getNorthStarEntityPosition(
  northStar: NorthStar,
  index: number,
  totalCount: number
): { x: number; y: number } {
  // Use saved position if available
  if (northStar.position_x !== null && northStar.position_y !== null) {
    return {
      x: northStar.position_x,
      y: northStar.position_y,
    };
  }

  // Auto-position at top of canvas
  const baseY = -800; // Above user center (increased from -400 to give more space)
  const spacing = 800; // Horizontal spacing between North Stars (increased from 500)

  // Center multiple North Stars
  const totalWidth = (totalCount - 1) * spacing;
  const startX = -totalWidth / 2;
  const x = startX + index * spacing;

  return { x, y: baseY };
}

/**
 * Create edge from user center to North Star entity
 */
function createNorthStarEntityEdge(sourceId: string, targetId: string): Edge {
  return {
    id: `${sourceId}-ns-entity-${targetId}`,
    source: sourceId,
    target: targetId,
    type: "floating",
    animated: false,
    style: {
      stroke: "#FFD700",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
  };
}

/**
 * Calculate position along an S-curve (ZigZag) between two points
 * Used to align milestone projects between user center and North Star
 * Creates a visual path like: Left -> Right -> Left (as moving up)
 */
function calculateSCurvePosition(
  start: { x: number; y: number },
  end: { x: number; y: number },
  index: number,
  totalCount: number
): { x: number; y: number } {
  // Position projects evenly spaced vertically
  // Start closer to user center (25%) and end closer to North Star (75%)
  const startPercent = 0.25;
  const endPercent = 0.75;
  const availableRange = endPercent - startPercent;

  let t: number;
  if (totalCount === 1) {
    // Single project: place at midpoint
    t = 0.5;
  } else {
    // Multiple projects: distribute evenly
    t = startPercent + (index / (totalCount - 1)) * availableRange;
  }

  // Linear interpolation for main trajectory
  const baseX = start.x + (end.x - start.x) * t;
  const baseY = start.y + (end.y - start.y) * t;

  // Add ZigZag/S-Curve offset
  // We want to oscillate left and right relative to the main line
  // Magnitude of oscillation (how wide the S-curve is)
  const amplitude = 250; 
  
  // Calculate which side to swing to based on index
  // Even index = Left (-), Odd index = Right (+)
  // We use Math.pow(-1, index) to toggle sign
  // But strictly speaking, an S-curve is usually a Sine wave. 
  // Let's use a Sine wave for smoother curves if many points, 
  // or a simple alternating offset for the "ZigZag" look requested.
  // The user image shows distinct nodes left and right.
  // Let's go with alternating offset.
  
  // Direction vector of the line
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  
  // Perpendicular vector (normalized)
  const len = Math.sqrt(dx*dx + dy*dy);
  const perpX = -dy / (len || 1);
  const perpY = dx / (len || 1);
  
  // Alternating factor: -1 for even, +1 for odd (or vice versa)
  // Let's start Left (-1) for index 0 (closest to user) as per commonly intuitive "start"
  // User image: Center -> Bottom Node (Left?) -> Mid Node (Right) -> Top Node (Left)
  // If we have 3 nodes: 0, 1, 2
  // 0: Left, 1: Right, 2: Left
  const side = index % 2 === 0 ? -1 : 1;
  
  // Apply offset perpendicular to the main line
  const offsetX = perpX * amplitude * side;
  const offsetY = perpY * amplitude * side;

  return {
    x: baseX + offsetX,
    y: baseY + offsetY,
  };
}

/**
 * Create edge from project to North Star entity
 */
function createProjectToNorthStarEntityEdge(
  projectId: string,
  northStarId: string
): Edge {
  return {
    id: `project-${projectId}-ns-entity-${northStarId}`,
    source: projectId,
    target: northStarId,
    type: "floating",
    animated: true,
    style: {
      stroke: "#9B59B6",
      strokeWidth: 2.5,
      strokeDasharray: "8,4",
    },
    markerEnd: {
      type: MarkerType.Arrow,
      color: "#9B59B6",
    },
  };
}
