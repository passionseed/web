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
import { EditNorthStarDialog } from "./EditNorthStarDialog";
import { QuickStatusChangeDialog } from "./QuickStatusChangeDialog";
import { ProjectDetailsPanel } from "./ProjectDetailsPanel";
import { MainQuestPanel } from "./MainQuestPanel";
import { MilestoneMapView } from "./MilestoneMapView";
import { NoNorthStarState } from "./NoNorthStarState";
import { CreateNorthStarDialog } from "./CreateNorthStarDialog";

import { useJourneyProjects } from "@/hooks/use-journey-projects";
import { useProjectPaths } from "@/hooks/use-project-paths";
import { useJourneyMapState } from "@/hooks/use-journey-map-state";
import { usePositionSync } from "@/hooks/use-position-sync";
import { useNorthStars } from "@/hooks/use-north-stars";
import { calculateJourneyStats } from "./utils/journeyCalculations";
import { buildJourneyMap } from "./utils/journeyMapBuilder";
import { PANEL_SIZES, VIEW_MODES } from "./constants/journeyMapConfig";
import { NorthStar, NorthStarStatus } from "@/types/journey";
import { updateNorthStar } from "@/lib/supabase/north-star";

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
  const { paths, loadPaths, createPath, deletePath, updatePathType } =
    useProjectPaths();
  const { northStars, refreshNorthStars } = useNorthStars();

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


  // North Star dialog state
  const [createNorthStarOpen, setCreateNorthStarOpen] = React.useState(false);
  const [editNorthStarOpen, setEditNorthStarOpen] = React.useState(false);
  const [editingNorthStar, setEditingNorthStar] =
    React.useState<NorthStar | null>(null);

  // Quick status change dialog state
  const [quickStatusDialogOpen, setQuickStatusDialogOpen] = React.useState(false);
  const [changingNorthStar, setChangingNorthStar] = React.useState<NorthStar | null>(null);
  const [targetStatus, setTargetStatus] = React.useState<NorthStarStatus>("active");

  const openCreateNorthStarDialog = useCallback(() => {
    setCreateNorthStarOpen(true);
  }, []);
  const closeCreateNorthStarDialog = useCallback(() => {
    setCreateNorthStarOpen(false);
  }, []);

  const openEditNorthStarDialog = useCallback((northStar: NorthStar) => {
    setEditingNorthStar(northStar);
    setEditNorthStarOpen(true);
  }, []);
  const closeEditNorthStarDialog = useCallback(() => {
    setEditNorthStarOpen(false);
    setEditingNorthStar(null);
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

  const handleEditNorthStar = useCallback(
    (northStar: NorthStar) => {
      openEditNorthStarDialog(northStar);
    },
    [openEditNorthStarDialog]
  );

  const handleNorthStarEdited = useCallback(() => {
    refreshNorthStars();
  }, [refreshNorthStars]);

  const handleCreateProjectForNorthStar = useCallback(
    (northStarId: string) => {
      // Store the pre-selected North Star ID in state
      setPreSelectedNorthStarId(northStarId);
      openCreateDialog();
    },
    [openCreateDialog]
  );

  const handleQuickStatusChange = useCallback(
    (northStar: NorthStar, newStatus: NorthStarStatus) => {
      setChangingNorthStar(northStar);
      setTargetStatus(newStatus);
      setQuickStatusDialogOpen(true);
    },
    []
  );

  const handleConfirmStatusChange = useCallback(
    async () => {
      if (!changingNorthStar) return;

      try {
        const updateData: any = {
          status: targetStatus,
        };

        // Add achieved_at timestamp when status changes to achieved
        if (targetStatus === "achieved") {
          updateData.achieved_at = new Date().toISOString();
        }

        await updateNorthStar(changingNorthStar.id, updateData);

        // Refresh North Stars to show updated status
        refreshNorthStars();

        toast.success("North Star status updated successfully!");
      } catch (error) {
        console.error("Error updating North Star status:", error);
        toast.error("Failed to update North Star status");
      }
    },
    [changingNorthStar, targetStatus, refreshNorthStars]
  );

  // State for pre-selected North Star
  const [preSelectedNorthStarId, setPreSelectedNorthStarId] = React.useState<string | null>(null);

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
    // Clear pre-selected North Star after project is created
    setPreSelectedNorthStarId(null);
  }, [refreshProjects]);

  const handleProjectPathCreated = useCallback(() => {
    loadPaths();
  }, [loadPaths]);

  // ========================================
  // MEMOIZED COMPUTATIONS
  // ========================================

  // Build map from projects data and North Stars
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
        onEditNorthStar: handleEditNorthStar,
        onCreateProjectForNorthStar: handleCreateProjectForNorthStar,
        onQuickStatusChange: handleQuickStatusChange,
      },
      paths,
      northStars
    );
  }, [
    projects,
    paths,
    northStars,
    userId,
    userName,
    userAvatar,
    switchToMilestoneView,
    handleEditProject,
    handleAddReflection,
    handleEditNorthStar,
    handleCreateProjectForNorthStar,
    handleQuickStatusChange,
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

  // Check if user has any North Star projects or North Star entities
  const hasNorthStar = useMemo(() => {
    // Check if there are North Star entities (new system)
    const hasNorthStarEntities = northStars.length > 0;

    // Check if there are legacy North Star projects
    const hasNorthStarProjects = projects.some(
      (project) => project.metadata?.is_north_star === true
    );

    return hasNorthStarEntities || hasNorthStarProjects;
  }, [northStars, projects]);

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

  // Show empty state if no North Star exists and not loading
  if (!isLoading && !hasNorthStar) {
    return (
      <>
        <div className="h-full w-full bg-slate-950">
          <NoNorthStarState onCreateNorthStar={openCreateNorthStarDialog} />
        </div>
        <CreateNorthStarDialog
          open={createNorthStarOpen}
          onOpenChange={closeCreateNorthStarDialog}
          onSuccess={refreshNorthStars}
        />
      </>
    );
  }

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
          setEdges={setEdges}
          isLoading={isLoading}
          journeyStats={journeyStats}
          syncStatus={syncStatus}
          syncMessage={syncMessage}
          isNavigationExpanded={isNavigationExpanded}
          setIsNavigationExpanded={setIsNavigationExpanded}
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
        onSuccess={handleProjectCreated}
        preSelectedNorthStarId={preSelectedNorthStarId || undefined}
        highlightNorthStarLink={!!preSelectedNorthStarId}
      />
      <EditProjectDialog
        open={editProjectOpen}
        onOpenChange={closeEditDialog}
        project={editingProject}
        onSuccess={refreshProjects}
      />
      <EditNorthStarDialog
        open={editNorthStarOpen}
        onOpenChange={closeEditNorthStarDialog}
        northStar={editingNorthStar}
        onSuccess={handleNorthStarEdited}
      />
      <QuickStatusChangeDialog
        open={quickStatusDialogOpen}
        onOpenChange={setQuickStatusDialogOpen}
        northStar={changingNorthStar}
        newStatus={targetStatus}
        onConfirm={handleConfirmStatusChange}
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
