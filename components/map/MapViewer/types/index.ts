/**
 * Type definitions for MapViewer component
 */

import { Node, Edge } from "@xyflow/react";
import { ImperativePanelHandle } from "react-resizable-panels";
import { FullLearningMap, MapNode } from "@/lib/supabase/maps";
import { StudentProgress } from "@/lib/supabase/progresses";
import { TeamNodeProgress, TeamMemberProgress } from "@/lib/supabase/team-progress";

// Main component props
export interface MapViewerProps {
  map: FullLearningMap;
}

// User role types
export type UserRole = "instructor" | "TA" | "student";

// Progress types - union of individual and team progress
export type AnyProgress = StudentProgress | TeamNodeProgress;

// Enhanced progress with team member data
export type EnhancedProgress = AnyProgress & {
  member_progress?: TeamMemberProgress[];
  best_submission?: any;
};

// Map type detection
export interface MapTypeInfo {
  isTeamMap: boolean;
  classroomId?: string;
  teamId?: string | null;
}

// Progress statistics
export interface ProgressStats {
  singleRequirement: { completed: number; total: number };
  allRequirement: { completed: number; total: number };
  totalCompleted: number;
  totalNodes: number;
}

// Node unlock status
export interface NodeStatus {
  isUnlocked: boolean;
  isCompleted: boolean;
  status: string;
  requirement: "single" | "all";
}

// Submission requirement types
export type SubmissionRequirement = "single" | "all";

// Progress map type
export type ProgressMap = Record<string, EnhancedProgress>;

// ReactFlow node with enhanced data
export interface MapViewerNode extends Node {
  data: MapNode & {
    progress?: EnhancedProgress;
    node_type?: string;
  };
}

// ReactFlow edge for map
export interface MapViewerEdge extends Edge {
  animated: boolean;
}

// Panel management
export interface PanelRefs {
  left: React.RefObject<ImperativePanelHandle>;
  right: React.RefObject<ImperativePanelHandle>;
}

// Component state
export interface MapViewerState {
  selectedNode: MapViewerNode | null;
  currentUser: any;
  progressMap: ProgressMap;
  isNavigationExpanded: boolean;
  isPanelMinimized: boolean;
  showGradingOverview: boolean;
  selectedSubmission: any;
  allSubmissions: any[];
  isLoadingSubmissions: boolean;
  classroomRole: string | null;
  isTeamMap: boolean;
  teamId: string | null;
}

// Hook return types
export interface UseMapProgressReturn {
  progressMap: ProgressMap;
  loadAllProgress: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export interface UseMapNavigationReturn {
  navigateToAdjacentNode: (direction: 1 | -1) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
}

export interface UsePanelManagementReturn {
  isPanelMinimized: boolean;
  togglePanelSize: () => void;
  handleSelectionChange: (selectedNode: MapViewerNode | null) => void;
}

export interface UseMapDataReturn {
  nodes: MapViewerNode[];
  edges: MapViewerEdge[];
  nodeTypes: any;
}

// Node component props
export interface GameNodeProps {
  data: MapNode & { progress?: EnhancedProgress };
  selected?: boolean;
  isUnlocked: boolean;
  isCompleted: boolean;
  requirement: SubmissionRequirement;
  isTeamMap: boolean;
  isInstructorOrTA: boolean;
  allSubmissions: any[];
}

// Navigation guide props
export interface NavigationGuideProps {
  isExpanded: boolean;
  onToggle: () => void;
  progressStats: ProgressStats;
  progressMap: ProgressMap;
  isTeamMap: boolean;
  isInstructorOrTA: boolean;
}

// Progress stats props
export interface ProgressStatsProps {
  stats: ProgressStats;
  progressMap: ProgressMap;
  isTeamMap: boolean;
  isInstructorOrTA: boolean;
}