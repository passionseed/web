/**
 * Journey Map Components - Barrel export file
 *
 * Exports all journey components, utilities, and types.
 */

// Main canvas component
export { JourneyMapCanvas } from "./JourneyMapCanvas";
export type { JourneyMapCanvasProps } from "./JourneyMapCanvas";
export { JourneyMapPreview } from "./JourneyMapPreview";
export { MilestoneMapView } from "./MilestoneMapView";

// Canvas sub-components (refactored)
export { JourneyMapCanvasView } from "./JourneyMapCanvasView";
export { JourneyActionBar } from "./JourneyActionBar";
export type { JourneyStats } from "./JourneyActionBar";
export { NavigationGuide } from "./NavigationGuide";

// Node components
export { UserCenterNode } from "./nodes/UserCenterNode";
export { NorthStarProjectNode } from "./nodes/NorthStarProjectNode";
export { ShortTermProjectNode } from "./nodes/ShortTermProjectNode";
export { MilestoneNode } from "./nodes/MilestoneNode";

// Edge components
export { MainQuestPath } from "./edges/MainQuestPath";
export { NorthStarLink } from "./edges/NorthStarLink";

// Dialog components
export { CreateProjectDialog } from "./CreateProjectDialog";
export { MilestoneProgressDialog } from "./MilestoneProgressDialog";

// Panel components
export { ProjectReflectionPanel } from "./ProjectReflectionPanel";
export { DailyActivityPanel } from "./DailyActivityPanel";
export { MiniJourneyPreview } from "./DailyActivityPanel";

// Constants
export {
  PANEL_SIZES,
  NODE_LAYOUT,
  FLOW_CONFIG,
  BACKGROUND_CONFIG,
  MINIMAP_COLORS,
  VIEW_MODES,
  RECENT_ACTIVITY_DAYS,
} from "./constants/journeyMapConfig";
export type { ViewMode } from "./constants/journeyMapConfig";

// Utilities
export {
  calculateOverallProgress,
  calculateJourneyStats,
  categorizeProjects,
  extractNorthStarOptions,
  checkRecentActivity,
  calculateCircularPosition,
  getNodePosition,
  countLinkedProjects,
} from "./utils/journeyCalculations";
export type { NodePosition } from "./utils/journeyCalculations";

export { buildJourneyMap } from "./utils/journeyMapBuilder";
export type {
  MapBuilderCallbacks,
  MapBuilderResult,
} from "./utils/journeyMapBuilder";
