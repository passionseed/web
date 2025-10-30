/**
 * MilestoneMapView - Full-screen view for project milestones
 * Shows milestone nodes and paths with progress tracking
 */

"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useContext,
} from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  Node,
  Edge,
  Panel,
  MarkerType,
  OnSelectionChangeParams,
  ReactFlowProvider,
  addEdge,
  Connection,
  EdgeChange,
  applyEdgeChanges,
  ConnectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Target,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { MilestoneNode } from "./nodes/MilestoneNode";
import { MilestoneProgressDialog } from "./MilestoneProgressDialog";
import { MilestoneDetailsPanel } from "./MilestoneDetailsPanel";
import { AddMilestoneModal } from "./milestone-details/AddMilestoneModal";
import FloatingEdge from "../map/FloatingEdge";

import {
  getProjectById,
  getProjectMilestones,
  getMilestoneJournals,
  getProjectMilestonePaths,
  createMilestonePath,
  deleteMilestonePath,
} from "@/lib/supabase/journey";
import {
  ProjectWithMilestones,
  MilestoneWithJournals,
  ProjectMilestone,
  MilestonePath,
} from "@/types/journey";
import {
  getPositionSyncManager,
  SyncStatus,
} from "@/lib/sync/PositionSyncManager";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { MilestoneBreadcrumbContext } from "@/app/me/journey/journey-page-client";

interface MilestoneMapViewProps {
  projectId: string;
  onBack: () => void;
}

const nodeTypes = {
  milestone: MilestoneNode,
};

// Panel size constants
const PANEL_SIZES = {
  LEFT_DEFAULT: 70,
  LEFT_MIN: 30,
  LEFT_MAX: 85,
  RIGHT_DEFAULT: 30,
  RIGHT_MIN: 15,
  RIGHT_MAX: 70,
};

function MilestoneMapViewInner({ projectId, onBack }: MilestoneMapViewProps) {
  const { setMilestoneTitle, setOnBackToOverview } = useContext(
    MilestoneBreadcrumbContext
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<ProjectWithMilestones | null>(null);
  const [milestones, setMilestones] = useState<MilestoneWithJournals[]>([]);
  const [selectedMilestone, setSelectedMilestone] =
    useState<ProjectMilestone | null>(null);
  const [milestonePaths, setMilestonePaths] = useState<MilestonePath[]>([]);

  // Panel management
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);

  // Dialog states
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [addMilestoneModalOpen, setAddMilestoneModalOpen] = useState(false);

  // Sync manager and status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState<string | undefined>(undefined);
  const syncManager = getPositionSyncManager();

  // Register the onBack callback with the breadcrumb context
  useEffect(() => {
    setOnBackToOverview(() => onBack);
  }, [onBack, setOnBackToOverview]);

  // Edge types
  const edgeTypes = useMemo(
    () => ({
      floating: FloatingEdge,
    }),
    []
  );

  // Edge change handler with deletion support
  const onEdgesChange = useCallback(async (changes: EdgeChange[]) => {
    const deletedEdges = changes.filter(change => change.type === 'remove');
    
    // Handle edge deletions (including backspace)
    if (deletedEdges.length > 0) {
      for (const change of deletedEdges) {
        const edgeId = change.id;
        const edge = edges.find(e => e.id === edgeId);
        
        if (edge?.data?.pathId) {
          try {
            const pathId = edge.data.pathId as string;
            await deleteMilestonePath(pathId);
            setMilestonePaths((prev) => prev.filter((p) => p.id !== pathId));
            toast.success("Connection deleted");
          } catch (error) {
            console.error("Error deleting connection:", error);
            toast.error("Failed to delete connection");
            return; // Don't apply the edge change if deletion failed
          }
        }
      }
    }
    
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, [edges]);

  const handleOpenProgress = useCallback((milestone: ProjectMilestone) => {
    setSelectedMilestone(milestone);
    setProgressDialogOpen(true);
  }, []);

  const buildMilestoneMap = useCallback(
    async (milestonesData: MilestoneWithJournals[]) => {
      try {
        const newNodes: Node[] = [];

        // Check if milestones have positions set
        const hasPositions = milestonesData.some(
          (m) => m.position_x !== null && m.position_x !== undefined
        );

        // Create milestone nodes without fetching journals individually (performance improvement)
        for (let i = 0; i < milestonesData.length; i++) {
          const milestone = milestonesData[i];

          // Use existing journal data from milestone object instead of fetching
          const latestJournal = milestone.journals && milestone.journals.length > 0 
            ? milestone.journals[0] 
            : null;

          // Position logic - use position_x/position_y from database
          let position;
          if (hasPositions) {
            position = {
              x: milestone.position_x || 0,
              y: milestone.position_y || 0,
            };
          } else {
            // Auto-layout horizontally
            const horizontalSpacing = 350;
            const verticalVariation = (i % 2) * 100 - 50;
            position = {
              x: i * horizontalSpacing,
              y: verticalVariation,
            };
          }

          newNodes.push({
            id: milestone.id,
            type: "milestone",
            position,
            data: {
              milestone,
              latestJournalPreview: latestJournal
                ? latestJournal.content.slice(0, 100)
                : undefined,
            },
            draggable: true,
            selectable: true,
          });
        }

        console.log("✅ Built milestone nodes:", newNodes.length);
        setNodes(newNodes);
      } catch (error) {
        console.error("Error building milestone map:", error);
        toast.error("Failed to update milestone view");
      }
    },
    [setNodes]
  );

  // Build edges from milestone paths (separate useEffect to avoid timing issues)
  useEffect(() => {
    if (milestonePaths.length === 0) {
      setEdges([]);
      return;
    }

    const newEdges: Edge[] = milestonePaths.map((path) => ({
      id: path.id,
      source: path.source_milestone_id,
      target: path.destination_milestone_id,
      type: "floating",
      animated: path.path_type === "linear",
      selectable: true,
      deletable: true,
      focusable: true,
      style: {
        stroke:
          path.path_type === "linear"
            ? "#3b82f6"
            : path.path_type === "conditional"
              ? "#f59e0b"
              : "#10b981",
        strokeWidth: 3,
        cursor: "pointer",
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color:
          path.path_type === "linear"
            ? "#3b82f6"
            : path.path_type === "conditional"
              ? "#f59e0b"
              : "#10b981",
      },
      data: {
        pathType: path.path_type,
        pathId: path.id,
      },
    }));

    console.log("✅ Built edges from paths:", newEdges.length);
    setEdges(newEdges);
  }, [milestonePaths]);

  const loadMilestoneMap = useCallback(async () => {    
    setIsLoading(true);
    try {
      const [projectData, milestonesData, pathsData] = await Promise.all([
        getProjectById(projectId),
        getProjectMilestones(projectId),
        getProjectMilestonePaths(projectId),
      ]);

      setProject(projectData);
      setMilestones(milestonesData);
      setMilestonePaths(pathsData);

      if (projectData && milestonesData) {
        await buildMilestoneMap(milestonesData);
      }
    } catch (error) {
      console.error("Error loading milestone map:", error);
      toast.error("Failed to load milestone map");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, buildMilestoneMap]);

  useEffect(() => {
    loadMilestoneMap();

    // Cleanup: clear breadcrumb when unmounting or returning to overview
    return () => {
      setMilestoneTitle(null);
    };
  }, [projectId, setMilestoneTitle]);

  // Subscribe to sync status changes
  useEffect(() => {
    const unsubscribe = syncManager.onStatusChange((event) => {
      setSyncStatus(event.status);
      setSyncMessage(event.message);

      // Show error toast if sync fails
      if (event.status === "error") {
        toast.error(event.message || "Failed to save position changes");
      }
    });

    // Cleanup: flush pending changes and unsubscribe
    return () => {
      syncManager.flush();
      unsubscribe();
    };
  }, [syncManager]);

  const handleProgressUpdated = useCallback(async (updatedMilestone?: ProjectMilestone) => {
    try {
      if (updatedMilestone) {
        console.log("📝 Updating milestone data in place:", updatedMilestone.id);
        
        // Update milestones array
        setMilestones(prev => prev.map(m => 
          m.id === updatedMilestone.id 
            ? { ...m, ...updatedMilestone, journals: m.journals } 
            : m
        ));
        
        // CRITICAL: Update the selected milestone to maintain selection
        if (selectedMilestone && selectedMilestone.id === updatedMilestone.id) {
          console.log("📝 Updating selected milestone to maintain selection");
          setSelectedMilestone({ ...selectedMilestone, ...updatedMilestone });
        }
        
        // Update the node data directly - PRESERVE the selection state
        setNodes(prev => prev.map(node => {
          if (node.id === updatedMilestone.id) {
            return {
              ...node,
              selected: node.selected, // PRESERVE selection state
              data: {
                ...node.data,
                milestone: { ...node.data.milestone, ...updatedMilestone }
              }
            };
          }
          return node;
        }));
        
        console.log("📝 Milestone updated without losing selection");
      } else {
        // Fallback: only use if really necessary
        console.log("📝 Fallback: fetching fresh data");
        const milestonesData = await getProjectMilestones(projectId);
        setMilestones(milestonesData);
        await buildMilestoneMap(milestonesData);
      }
    } catch (error) {
      console.error("Error updating milestone progress:", error);
      toast.error("Failed to refresh milestones");
    }
  }, [projectId, buildMilestoneMap, selectedMilestone]);

  const handleMilestoneCreated = useCallback(async () => {
    // For new milestones, we do need to fetch fresh data
    try {
      const milestonesData = await getProjectMilestones(projectId);
      setMilestones(milestonesData);
      await buildMilestoneMap(milestonesData);
    } catch (error) {
      console.error("Error refreshing after milestone creation:", error);
      toast.error("Failed to refresh milestones");
    }
  }, [projectId, buildMilestoneMap]);

  const handleNodeDragStop = useCallback(
    (_event: any, node: Node) => {
      // Mark milestone as dirty for batched sync
      syncManager.markMilestoneDirty(node.id, node.position.x, node.position.y);
    },
    [syncManager]
  );

  const handleSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const selectedNodes = params.nodes;
      const selectedEdges = params.edges;
      
      console.log("🔄 Selection changed - nodes:", selectedNodes.length, "edges:", selectedEdges.length);
      
      // Only handle node selection for milestone details, ignore edge selection
      if (selectedNodes.length > 0) {
        const node = selectedNodes[0];
        const milestone = milestones.find((m) => m.id === node.id);
        if (milestone) {
          console.log("🎯 Selecting milestone:", milestone.title);
          setSelectedMilestone(milestone);
          // Update breadcrumb to show milestone title
          setMilestoneTitle(milestone.title);
          // Expand right panel if minimized
          if (isPanelMinimized && rightPanelRef.current) {
            rightPanelRef.current.resize(PANEL_SIZES.RIGHT_DEFAULT);
            setIsPanelMinimized(false);
          }
        }
      } else if (selectedEdges.length === 0 && selectedNodes.length === 0) {
        // Only clear milestone selection if nothing is selected
        console.log("🔄 Clearing milestone selection");
        setSelectedMilestone(null);
        // Clear breadcrumb when deselecting
        setMilestoneTitle(null);
      }
    },
    [milestones, isPanelMinimized, setMilestoneTitle]
  );

  const onConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) {
      toast.error("Cannot connect a milestone to itself");
      return;
    }

    try {
      // Create the path in database
      const newPath = await createMilestonePath(
        connection.source,
        connection.target,
        "linear"
      );

      // Add to local state
      setMilestonePaths((prev) => [...prev, newPath]);

      // Create edge
      const newEdge: Edge = {
        id: newPath.id,
        source: newPath.source_milestone_id,
        target: newPath.destination_milestone_id,
        type: "floating",
        animated: true,
        selectable: true,
        deletable: true,
        focusable: true,
        style: { 
          stroke: "#3b82f6", 
          strokeWidth: 3,
          cursor: "pointer"
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#3b82f6",
        },
        data: {
          pathType: newPath.path_type,
          pathId: newPath.id,
        },
      };

      setEdges((eds) => addEdge(newEdge, eds));
      toast.success("Connection created");
    } catch (error) {
      console.error("Error creating connection:", error);
      toast.error("Failed to create connection");
    }
  }, []);

  const onEdgeClick = useCallback(
    async (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();

      if (!edge.data?.pathId) return;

      const confirmed = window.confirm("Delete this connection?");

      if (!confirmed) return;

      try {
        const pathId = edge.data.pathId as string;
        await deleteMilestonePath(pathId);
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        setMilestonePaths((prev) => prev.filter((p) => p.id !== pathId));
        toast.success("Connection deleted");
      } catch (error) {
        console.error("Error deleting connection:", error);
        toast.error("Failed to delete connection");
      }
    },
    []
  );

  const onEdgeContextMenu = useCallback(
    async (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();

      if (!edge.data?.pathId) return;

      const confirmed = window.confirm("Delete this connection?");

      if (!confirmed) return;

      try {
        const pathId = edge.data.pathId as string;
        await deleteMilestonePath(pathId);
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        setMilestonePaths((prev) => prev.filter((p) => p.id !== pathId));
        toast.success("Connection deleted");
      } catch (error) {
        console.error("Error deleting connection:", error);
        toast.error("Failed to delete connection");
      }
    },
    []
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
  }, [isPanelMinimized]);

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading milestones...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-slate-950">
        <p className="text-slate-400 mb-4">Project not found</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Journey
        </Button>
      </div>
    );
  }

  const completedCount = milestones.filter(
    (m) => m.status === "completed"
  ).length;
  const totalCount = milestones.length;

  return (
    <>
      <ResizablePanelGroup
        direction="horizontal"
        className="h-screen bg-slate-950"
      >
        {/* Left Panel - Milestone Canvas */}
        <ResizablePanel
          ref={leftPanelRef}
          defaultSize={PANEL_SIZES.LEFT_DEFAULT}
          minSize={PANEL_SIZES.LEFT_MIN}
          maxSize={PANEL_SIZES.LEFT_MAX}
          className="transition-all duration-300 ease-in-out relative"
        >
          <div className="w-full h-full relative bg-slate-950">
            <style jsx>{`
              .react-flow__edge-path {
                transition: stroke 200ms ease-in-out !important;
              }
            `}</style>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onSelectionChange={handleSelectionChange}
              onNodeDragStop={handleNodeDragStop}
              onConnect={onConnect}
              onEdgeClick={onEdgeClick}
              onEdgeContextMenu={onEdgeContextMenu}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              connectionMode={ConnectionMode.Loose}
              fitView
              fitViewOptions={{
                padding: 0.2,
                minZoom: 0.5,
                maxZoom: 1.5,
              }}
              minZoom={0.3}
              maxZoom={2}
              defaultEdgeOptions={{
                type: "floating",
                animated: false,
                selectable: true,
                deletable: true,
                focusable: true,
              }}
              nodesDraggable
              nodesConnectable
              elementsSelectable
              edgesReconnectable={false}
              deleteKeyCode={["Delete", "Backspace"]}
              panOnScroll
              panOnDrag={[1, 2]}
              attributionPosition="bottom-left"
            >
              <Background
                gap={20}
                size={1}
                color="#334155"
                style={{ backgroundColor: "#0f172a" }}
              />
              <Controls
                style={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                }}
              />

              {/* Header panel */}
              <Panel
                position="top-left"
                className="bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border border-slate-800 rounded-lg shadow-lg p-2 m-2 max-w-3xl"
              >
                <div className="flex items-center gap-2">
                  <Button onClick={onBack} variant="outline" size="sm" className="flex-shrink-0">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Target className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <h2 className="text-sm font-bold text-slate-100 truncate">
                      {project.title}
                    </h2>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      {completedCount}/{totalCount}
                    </Badge>
                    <Badge
                      variant={
                        project.status === "in_progress"
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs flex-shrink-0"
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <Button
                    onClick={() => setAddMilestoneModalOpen(true)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </Panel>

              {/* Empty state */}
              {milestones.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border border-slate-800 rounded-lg shadow-lg p-6 text-center max-w-sm pointer-events-auto">
                    <Target className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                    <h3 className="text-lg font-bold text-slate-100 mb-2">
                      No milestones yet
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      Break down your project into milestones to track progress
                      and stay organized.
                    </p>
                    <Button onClick={() => setAddMilestoneModalOpen(true)} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Milestone
                    </Button>
                  </div>
                </div>
              )}
            </ReactFlow>

            {/* Linking Help Text */}
            <div className="absolute bottom-20 left-4 bg-slate-800/95 backdrop-blur border border-slate-700 rounded-lg p-3 shadow-lg max-w-sm">
              <p className="text-xs text-slate-200">
                <span className="font-semibold">💡 Tip:</span> Drag from the green dot on one milestone to the blue dot on another to create a connection. Click edges to select them, then press Backspace or Delete to remove.
              </p>
            </div>

            {/* Dialogs */}
            <MilestoneProgressDialog
              open={progressDialogOpen}
              onOpenChange={setProgressDialogOpen}
              milestone={selectedMilestone}
              onSuccess={handleProgressUpdated}
            />

            {/* Sync Status Indicator */}
            <SyncStatusIndicator status={syncStatus} message={syncMessage} />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Milestone Details */}
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
              <MilestoneDetailsPanel
                milestone={selectedMilestone}
                projectId={projectId}
                project={project || undefined}
                allMilestones={milestones}
                onMilestoneUpdated={handleProgressUpdated}
                onMilestoneSelect={setSelectedMilestone}
              />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Add Milestone Modal */}
      <AddMilestoneModal
        isOpen={addMilestoneModalOpen}
        onOpenChange={setAddMilestoneModalOpen}
        projectId={projectId}
        allMilestones={milestones}
        onMilestoneCreated={handleMilestoneCreated}
      />
    </>
  );
}

// Wrapper component with ReactFlowProvider
export function MilestoneMapView(props: MilestoneMapViewProps) {
  return (
    <ReactFlowProvider>
      <MilestoneMapViewInner {...props} />
    </ReactFlowProvider>
  );
}
