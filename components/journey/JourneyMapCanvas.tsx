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
import { NorthStarDetailsPanel } from "./NorthStarDetailsPanel";
import { MainQuestPanel } from "./MainQuestPanel";
import { MilestoneMapView } from "./MilestoneMapView";
import { NoNorthStarState } from "./NoNorthStarState";
import { CreateNorthStarDialog } from "./CreateNorthStarDialog";
import { JourneyMapOnboarding } from "./JourneyMapOnboarding";

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
import { createClient } from "@/utils/supabase/client";

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
  const { projects, isLoading, refreshProjects, updateProjectPositionLocal } = useJourneyProjects();
  const { paths, loadPaths, createPath, deletePath, updatePathType } =
    useProjectPaths();
  const { northStars, refreshNorthStars, updateNorthStarPositionLocal } = useNorthStars();
  
  // User profile state
  const [userEducationLevel, setUserEducationLevel] = React.useState<'high_school' | 'university' | 'unaffiliated'>('high_school');
  const supabase = createClient();

  // UI state hooks
  const {
    selectedProjectId,
    setSelectedProjectId,
    selectedNorthStarId,
    setSelectedNorthStarId,
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

  // Zoom level state
  const [zoomLevel, setZoomLevel] = React.useState<"low" | "medium" | "high">(
    "medium"
  );
  const [numericZoom, setNumericZoom] = React.useState<number>(1);

  // North Star dialog state
  const [createNorthStarOpen, setCreateNorthStarOpen] = React.useState(false);
  const [editNorthStarOpen, setEditNorthStarOpen] = React.useState(false);
  const [editingNorthStar, setEditingNorthStar] =
    React.useState<NorthStar | null>(null);

  // Quick status change dialog state
  const [quickStatusDialogOpen, setQuickStatusDialogOpen] =
    React.useState(false);
  const [changingNorthStar, setChangingNorthStar] =
    React.useState<NorthStar | null>(null);
  const [targetStatus, setTargetStatus] =
    React.useState<NorthStarStatus>("active");

  // Fetch user profile to get education level
  React.useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('education_level')
          .eq('id', userId)
          .single();
        
        if (profile?.education_level) {
          // setUserEducationLevel(profile.education_level);
          console.log('Profile education level:', profile.education_level);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [userId, supabase]);

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

  // Position sync hook with optimistic local state updates
  const { syncStatus, syncMessage, handleNodeDragStop, hasPendingSave } = usePositionSync(
    updateProjectPositionLocal,
    updateNorthStarPositionLocal
  );

  // Handle zoom changes from the canvas
  const handleZoomChange = useCallback(
    (zoomLevel: "low" | "medium" | "high", numericZoom: number) => {
      setZoomLevel(zoomLevel);
      setNumericZoom(numericZoom);
    },
    []
  );

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
    refreshProjects(); // Also refresh projects in case they were updated
  }, [refreshNorthStars, refreshProjects]);

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

  const handleConfirmStatusChange = useCallback(async () => {
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
  }, [changingNorthStar, targetStatus, refreshNorthStars]);

  // State for pre-selected North Star
  const [preSelectedNorthStarId, setPreSelectedNorthStarId] = React.useState<
    string | null
  >(null);

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
  // NOTE: numericZoom is NOT in dependencies to prevent rebuilds on zoom
  // It's only passed to buildJourneyMap for initial node sizing
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
      northStars,
      numericZoom
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
    numericZoom,
  ]);

  // Update ReactFlow nodes/edges when map data changes
  // Preserve user-dragged positions by keeping existing node positions
  // This prevents position resets when mapData rebuilds after saves
  React.useEffect(() => {
    setNodes((currentNodes) => {
      // Create a map of current positions for all existing nodes
      // This preserves user-dragged positions even after saves complete
      const currentPositions = new Map(
        currentNodes.map((node) => [node.id, node.position])
      );

      // Update nodes, preserving existing positions to prevent resets
      return mapData.nodes.map((newNode) => {
        const existingPosition = currentPositions.get(newNode.id);
        return existingPosition
          ? { ...newNode, position: existingPosition }
          : newNode;
      });
    });

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

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = React.useState(false);

  // Check onboarding status on mount
  React.useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("journey_map_onboarding_seen");
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
    setHasCheckedOnboarding(true);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem("journey_map_onboarding_seen", "true");
    setShowOnboarding(false);
    // Open North Star dialog immediately after onboarding
    setCreateNorthStarOpen(true);
  }, []);

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

  // Show loading state while checking onboarding
  if (!hasCheckedOnboarding) {
    return null; // Or a loading spinner
  }

  // Show onboarding if needed
  if (showOnboarding) {
    return <JourneyMapOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <ResizablePanelGroup id="journey-map-panel-group" direction="horizontal" className="h-full bg-slate-950">
      {/* Left Panel - Main Map Canvas */}
      <ResizablePanel
        ref={leftPanelRef}
        defaultSize={PANEL_SIZES.LEFT_DEFAULT}
        minSize={PANEL_SIZES.LEFT_MIN}
        maxSize={PANEL_SIZES.LEFT_MAX}
        className="transition-all duration-300 ease-in-out relative flex flex-col"
      >
        {/* Show empty state if no North Star exists and not loading */}
        {!isLoading && !hasNorthStar ? (
          <div className="h-full w-full flex items-center justify-center">
            <NoNorthStarState onCreateNorthStar={openCreateNorthStarDialog} />
          </div>
        ) : (
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
            onCreateNorthStar={openCreateNorthStarDialog}
            onProjectPathCreated={handleProjectPathCreated}
            onZoomChange={handleZoomChange}
          />
        )}
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
              {selectedNorthStarId ? (
                <NorthStarDetailsPanel
                  northStarId={selectedNorthStarId}
                  onEdit={() => {
                    const northStar = northStars.find(
                      (ns) => ns.id === selectedNorthStarId
                    );
                    if (northStar) {
                      openEditNorthStarDialog(northStar);
                    }
                  }}
                  onCreateProject={() => {
                    handleCreateProjectForNorthStar(selectedNorthStarId);
                  }}
                  onProjectSelect={handleProjectSelect}
                />
              ) : selectedProjectId ? (
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
      <CreateNorthStarDialog
        open={createNorthStarOpen}
        onOpenChange={closeCreateNorthStarDialog}
        onSuccess={handleNorthStarEdited}
        userEducationLevel={userEducationLevel}
      />
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
