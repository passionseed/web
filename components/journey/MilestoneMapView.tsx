/**
 * MilestoneMapView - Full-screen view for project milestones
 * Shows milestone nodes and paths with progress tracking
 */

"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import { ArrowLeft, Plus, Loader2, Target, ChevronLeft, ChevronRight, Link, Unlink } from "lucide-react";
import { toast } from "sonner";

import { MilestoneNode } from "./nodes/MilestoneNode";
import { MilestoneProgressDialog } from "./MilestoneProgressDialog";
import { MilestoneDetailsPanel } from "./MilestoneDetailsPanel";
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
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<ProjectWithMilestones | null>(null);
  const [milestones, setMilestones] = useState<MilestoneWithJournals[]>([]);
  const [selectedMilestone, setSelectedMilestone] =
    useState<ProjectMilestone | null>(null);
  const [milestonePaths, setMilestonePaths] = useState<MilestonePath[]>([]);
  const [isConnectMode, setIsConnectMode] = useState(false);

  // Panel management
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);

  // Dialog states
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);

  // Sync manager and status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState<string | undefined>(undefined);
  const syncManager = getPositionSyncManager();

  // Edge types
  const edgeTypes = useMemo(
    () => ({
      floating: FloatingEdge,
    }),
    []
  );

  // Edge change handler
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    []
  );

  const handleOpenProgress = useCallback((milestone: ProjectMilestone) => {
    setSelectedMilestone(milestone);
    setProgressDialogOpen(true);
  }, []);

  const buildMilestoneMap = useCallback(
    async (milestonesData: MilestoneWithJournals[]) => {
      const newNodes: Node[] = [];

      // Check if milestones have positions set
      const hasPositions = milestonesData.some(
        (m) => m.position_x !== null && m.position_x !== undefined
      );

      // Create milestone nodes
      for (let i = 0; i < milestonesData.length; i++) {
        const milestone = milestonesData[i];

        // Get latest journal for preview
        const journals = await getMilestoneJournals(milestone.id);
        const latestJournal = journals.length > 0 ? journals[0] : null;

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
            // Note: Removed onOpenProgress - selection handled by onSelectionChange
          },
          draggable: true,
          selectable: true,
        });
      }

      console.log("✅ Built milestone nodes:", newNodes.length);
      setNodes(newNodes);
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
      style: {
        stroke:
          path.path_type === "linear"
            ? "#3b82f6"
            : path.path_type === "conditional"
            ? "#f59e0b"
            : "#10b981",
        strokeWidth: 2,
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
  }, [loadMilestoneMap]);

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

  const handleProgressUpdated = () => {
    loadMilestoneMap();
  };

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
      if (selectedNodes.length > 0) {
        const node = selectedNodes[0];
        const milestone = milestones.find((m) => m.id === node.id);
        if (milestone) {
          setSelectedMilestone(milestone);
          // Expand right panel if minimized
          if (isPanelMinimized && rightPanelRef.current) {
            rightPanelRef.current.resize(PANEL_SIZES.RIGHT_DEFAULT);
            setIsPanelMinimized(false);
          }
        }
      } else {
        setSelectedMilestone(null);
      }
    },
    [milestones, isPanelMinimized]
  );

  const onConnect = useCallback(
    async (connection: Connection) => {
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
          style: { stroke: "#3b82f6", strokeWidth: 2 },
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
        setMilestonePaths((prev) =>
          prev.filter((p) => p.id !== pathId)
        );
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
    <ResizablePanelGroup direction="horizontal" className="h-screen bg-slate-950">
      {/* Left Panel - Milestone Canvas */}
      <ResizablePanel
        ref={leftPanelRef}
        defaultSize={PANEL_SIZES.LEFT_DEFAULT}
        minSize={PANEL_SIZES.LEFT_MIN}
        maxSize={PANEL_SIZES.LEFT_MAX}
        className="transition-all duration-300 ease-in-out relative"
      >
        <div className="w-full h-full relative bg-slate-950">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onSelectionChange={handleSelectionChange}
            onNodeDragStop={handleNodeDragStop}
            onConnect={isConnectMode ? onConnect : undefined}
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
            }}
            nodesDraggable
            nodesConnectable={isConnectMode}
            elementsSelectable
            deleteKeyCode="Delete"
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

            {/* Connect Mode Toggle */}
            <Panel position="top-right" className="space-x-2">
              <Button
                onClick={() => setIsConnectMode(!isConnectMode)}
                size="sm"
                variant={isConnectMode ? "default" : "outline"}
                className={isConnectMode ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                {isConnectMode ? (
                  <>
                    <Unlink className="w-4 h-4 mr-2" />
                    Exit Connect Mode
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4 mr-2" />
                    Connect Mode
                  </>
                )}
              </Button>
            </Panel>

            {/* Header panel */}
            <Panel
              position="top-left"
              className="bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border border-slate-800 rounded-lg shadow-lg p-4 m-4"
            >
              <div className="flex items-start gap-4">
                <Button onClick={onBack} variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-bold text-slate-100">
                      {project.title}
                    </h2>
                  </div>
                  {project.description && (
                    <p className="text-sm text-slate-400 mb-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {completedCount} / {totalCount} milestones
                    </Badge>
                    <Badge
                      variant={
                        project.status === "in_progress" ? "default" : "secondary"
                      }
                    >
                      {project.status}
                    </Badge>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    // Clear selection to trigger creation mode in panel
                    setSelectedMilestone(null);

                    // Expand right panel if minimized
                    if (isPanelMinimized && rightPanelRef.current) {
                      rightPanelRef.current.resize(PANEL_SIZES.RIGHT_DEFAULT);
                      setIsPanelMinimized(false);
                    }
                  }}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Milestone
                </Button>
              </div>
            </Panel>

            {/* Empty state */}
            {milestones.length === 0 && (
              <Panel position="top-center" className="mt-32">
                <div className="bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border border-slate-800 rounded-lg shadow-lg p-8 text-center max-w-md">
                  <Target className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                  <h3 className="text-xl font-bold text-slate-100 mb-2">
                    No milestones yet
                  </h3>
                  <p className="text-slate-400 mb-4">
                    Break down your project into milestones to track progress and
                    stay organized.
                  </p>
                  <Button
                    onClick={() => {
                      // Clear selection to trigger creation mode in panel
                      setSelectedMilestone(null);

                      // Expand right panel if minimized
                      if (isPanelMinimized && rightPanelRef.current) {
                        rightPanelRef.current.resize(PANEL_SIZES.RIGHT_DEFAULT);
                        setIsPanelMinimized(false);
                      }
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Milestone
                  </Button>
                </div>
              </Panel>
            )}
          </ReactFlow>

          {/* Connect Mode Help Text */}
          {isConnectMode && (
            <div className="absolute bottom-4 left-4 bg-blue-900/90 backdrop-blur border border-blue-700 rounded-lg p-3 shadow-lg max-w-sm">
              <p className="text-sm text-blue-100 font-medium mb-1">
                Connect Mode Active
              </p>
              <p className="text-xs text-blue-200">
                Drag from one milestone to another to create a connection.
                Right-click an edge to delete it.
              </p>
            </div>
          )}

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
              allMilestones={milestones}
              onMilestoneUpdated={loadMilestoneMap}
            />
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
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
