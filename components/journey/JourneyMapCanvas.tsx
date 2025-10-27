/**
 * JourneyMapCanvas - Refactored Main Component
 *
 * Clean, modular version of the journey map canvas with:
 * - Extracted hooks for business logic
 * - Separated UI components
 * - Centralized constants and utilities
 * - Improved type safety
 */

"use client";

import React, { useCallback, useMemo, useRef } from "react";
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { JourneyMapCanvasView } from "./JourneyMapCanvasView";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { EditProjectDialog } from "./EditProjectDialog";
import { ProjectDetailsPanel } from "./ProjectDetailsPanel";
import { MainQuestPanel } from "./MainQuestPanel";
import { MilestoneMapView } from "./MilestoneMapView";

import { useJourneyProjects } from "@/hooks/use-journey-projects";
import { useProjectPaths } from "@/hooks/use-project-paths";
import { useJourneyMapState } from "@/hooks/use-journey-map-state";
import { usePositionSync } from "@/hooks/use-position-sync";
import {
  calculateJourneyStats,
  extractNorthStarOptions,
} from "./utils/journeyCalculations";
import { buildJourneyMap } from "./utils/journeyMapBuilder";
import { PANEL_SIZES, VIEW_MODES } from "./constants/journeyMapConfig";

// ========================================
// TYPES
// ========================================

export interface JourneyMapCanvasProps {
  userId: string;
  userName: string;
  userAvatar?: string;
}

// ========================================
// MAIN COMPONENT (Inner - with hooks)
// ========================================

function JourneyMapCanvasInner({
  userId,
  userName,
  userAvatar,
}: JourneyMapCanvasProps) {
  // Data hooks
  const { projects, isLoading, refreshProjects } = useJourneyProjects();
  const {
    paths,
    loadPaths,
    createPath,
    deletePath,
    updatePathType,
  } = useProjectPaths();

  // UI state hooks
  const {
    selectedProjectId,
    setSelectedProjectId,
    handleSelectionChange,
    viewMode,
    milestoneProjectId,
    switchToMilestoneView,
    switchToOverviewView,
    createProjectOpen,
    editProjectOpen,
    editingProject,
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    isPanelMinimized,
    setIsPanelMinimized,
    isNavigationExpanded,
    setIsNavigationExpanded,
  } = useJourneyMapState();

  // Connection mode state
  const [isProjectConnectMode, setIsProjectConnectMode] = React.useState(false);
  const toggleConnectMode = useCallback(() => {
    setIsProjectConnectMode((prev) => !prev);
  }, []);

  // Position sync hook
  const { syncStatus, syncMessage, handleNodeDragStop } = usePositionSync();

  // Panel refs
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // ========================================
  // CALLBACKS
  // ========================================

  const handleEditProject = useCallback(
    (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        openEditDialog(project);
      }
    },
    [projects, openEditDialog]
  );

  const handleAddReflection = useCallback(
    (projectId: string) => {
      setSelectedProjectId(projectId);
      toast.info("Reflection dialog coming soon!");
    },
    [setSelectedProjectId]
  );

  const handleProjectSelect = useCallback(
    (projectId: string) => {
      setSelectedProjectId(projectId);
      // Expand right panel if minimized
      if (isPanelMinimized && rightPanelRef.current) {
        rightPanelRef.current.resize(PANEL_SIZES.RIGHT_DEFAULT);
        setIsPanelMinimized(false);
      }
    },
    [isPanelMinimized, setSelectedProjectId, setIsPanelMinimized]
  );

  const togglePanelSize = useCallback(() => {
    const panel = rightPanelRef.current;
    if (!panel) return;

    if (isPanelMinimized) {
      panel.resize(PANEL_SIZES.RIGHT_DEFAULT);
      setIsPanelMinimized(false);
    } else {
      panel.resize(PANEL_SIZES.RIGHT_MIN);
      setIsPanelMinimized(true);
    }
  }, [isPanelMinimized, setIsPanelMinimized]);

  const handleProjectCreated = useCallback(() => {
    refreshProjects();
  }, [refreshProjects]);

  const handleProjectPathCreated = useCallback(() => {
    loadPaths();
  }, [loadPaths]);

  // ========================================
  // MEMOIZED COMPUTATIONS
  // ========================================

  // Build map from projects data
  const mapData = useMemo(() => {
    return buildJourneyMap(
      projects,
      userId,
      userName,
      userAvatar,
      {
        onViewMilestones: switchToMilestoneView,
        onEditProject: handleEditProject,
        onAddReflection: handleAddReflection,
      },
      paths
    );
  }, [
    projects,
    paths,
    userId,
    userName,
    userAvatar,
    switchToMilestoneView,
    handleEditProject,
    handleAddReflection,
  ]);

  // Update ReactFlow nodes/edges when map data changes
  React.useEffect(() => {
    setNodes(mapData.nodes);
    setEdges(mapData.edges);
  }, [mapData, setNodes, setEdges]);

  // Load project paths on mount
  React.useEffect(() => {
    loadPaths();
  }, [loadPaths]);

  // Calculate journey statistics
  const journeyStats = useMemo(
    () => calculateJourneyStats(projects),
    [projects]
  );

  // Extract North Star options for dialogs
  const northStarProjects = useMemo(
    () => extractNorthStarOptions(projects),
    [projects]
  );

  // ========================================
  // RENDER MILESTONE VIEW
  // ========================================

  if (viewMode === VIEW_MODES.MILESTONE && milestoneProjectId) {
    return (
      <div className="h-full w-full bg-slate-950">
        <MilestoneMapView
          projectId={milestoneProjectId}
          onBack={switchToOverviewView}
        />
      </div>
    );
  }

  // ========================================
  // RENDER OVERVIEW (MAIN MAP)
  // ========================================

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full bg-slate-950">
      {/* Left Panel - Main Map Canvas */}
      <ResizablePanel
        ref={leftPanelRef}
        defaultSize={PANEL_SIZES.LEFT_DEFAULT}
        minSize={PANEL_SIZES.LEFT_MIN}
        maxSize={PANEL_SIZES.LEFT_MAX}
        className="transition-all duration-300 ease-in-out relative flex flex-col"
      >
        <JourneyMapCanvasView
          nodes={nodes}
          edges={edges}
          isLoading={isLoading}
          journeyStats={journeyStats}
          syncStatus={syncStatus}
          syncMessage={syncMessage}
          isNavigationExpanded={isNavigationExpanded}
          setIsNavigationExpanded={setIsNavigationExpanded}
          isProjectConnectMode={isProjectConnectMode}
          onToggleConnectMode={toggleConnectMode}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onSelectionChange={handleSelectionChange}
          onNodeDragStop={handleNodeDragStop}
          onCreateProject={openCreateDialog}
          onProjectPathCreated={handleProjectPathCreated}
        />
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Right Panel - Project Details */}
      <ResizablePanel
        ref={rightPanelRef}
        defaultSize={PANEL_SIZES.RIGHT_DEFAULT}
        minSize={PANEL_SIZES.RIGHT_MIN}
        maxSize={PANEL_SIZES.RIGHT_MAX}
        className="transition-all duration-300 ease-in-out relative bg-slate-900"
      >
        {/* Panel Minimize/Maximize Button */}
        <button
          onClick={togglePanelSize}
          className="absolute top-2 right-2 z-20 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/80 border border-slate-700 rounded-lg p-2 shadow-lg hover:bg-slate-700 transition-colors"
          title={isPanelMinimized ? "Maximize panel" : "Minimize panel"}
          aria-label={isPanelMinimized ? "Maximize panel" : "Minimize panel"}
        >
          {isPanelMinimized ? (
            <ChevronLeft className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </button>

        <div className="h-full flex flex-col overflow-hidden">
          {!isPanelMinimized && (
            <>
              {selectedProjectId ? (
                <ProjectDetailsPanel
                  projectId={selectedProjectId}
                  onEdit={() => handleEditProject(selectedProjectId)}
                  onAddReflection={() =>
                    toast.info("Reflection dialog coming soon!")
                  }
                  onAddMilestone={() =>
                    toast.info("Milestone dialog coming soon!")
                  }
                />
              ) : (
                <MainQuestPanel
                  projects={projects}
                  onProjectSelect={handleProjectSelect}
                  onRefresh={refreshProjects}
                />
              )}
            </>
          )}
        </div>
      </ResizablePanel>

      {/* Dialogs */}
      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={closeCreateDialog}
        northStarProjects={northStarProjects}
        onSuccess={handleProjectCreated}
      />
      <EditProjectDialog
        open={editProjectOpen}
        onOpenChange={closeEditDialog}
        project={editingProject}
        onSuccess={refreshProjects}
      />
    </ResizablePanelGroup>
  );
}

// ========================================
// WRAPPER COMPONENT (with ReactFlowProvider)
// ========================================

export function JourneyMapCanvas(props: JourneyMapCanvasProps) {
  return (
    <ReactFlowProvider>
      <JourneyMapCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
