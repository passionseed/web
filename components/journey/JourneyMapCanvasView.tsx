/**
 * JourneyMapCanvas - Main ReactFlow canvas component
 *
 * Displays the journey map with nodes, edges, and controls.
 * Extracted from main component for better separation of concerns.
 */

"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  OnSelectionChangeParams,
  Connection,
  ConnectionMode,
  ConnectionLineType,
  Panel,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createProjectPath, deleteProjectPath } from "@/lib/supabase/journey";
import { getProjectPathStyle } from "./utils/projectPathStyles";

import { UniversityGoalNode } from "./nodes/UniversityGoalNode";
import { UserCenterNode } from "./nodes/UserCenterNode";
import { NorthStarProjectNode } from "./nodes/NorthStarProjectNode";
import { NorthStarNode } from "./nodes/NorthStarNode";
import { ShortTermProjectNode } from "./nodes/ShortTermProjectNode";
import { MainQuestFloatingPath } from "./edges/MainQuestFloatingPath";
import { NorthStarFloatingLink } from "./edges/NorthStarFloatingLink";
import { ProjectFloatingEdge } from "./ProjectFloatingEdge";
import FloatingEdge from "../map/FloatingEdge";
import { JourneyActionBar, JourneyStats } from "./JourneyActionBar";
import { NavigationGuide } from "./NavigationGuide";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import {
  FLOW_CONFIG,
  BACKGROUND_CONFIG,
} from "./constants/journeyMapConfig";
import { SyncStatus } from "@/lib/sync/PositionSyncManager";

const nodeTypes = {
  userCenter: UserCenterNode,
  northStar: NorthStarProjectNode,
  northStarEntity: NorthStarNode,
  universityGoal: UniversityGoalNode,
  shortTerm: ShortTermProjectNode,
};

const edgeTypes = {
  mainQuest: MainQuestFloatingPath,
  northStar: NorthStarFloatingLink,
  projectLink: ProjectFloatingEdge,
  floating: FloatingEdge,
};

export type ZoomLevel = "low" | "medium" | "high";

interface JourneyMapCanvasViewProps {
  // Data
  nodes: Node[];
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  isLoading: boolean;
  journeyStats: JourneyStats;

  // Sync status
  syncStatus: SyncStatus;
  syncMessage: string | undefined;

  // Navigation state
  isNavigationExpanded: boolean;
  setIsNavigationExpanded: (expanded: boolean) => void;

  // Event handlers
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onSelectionChange: (params: OnSelectionChangeParams) => void;
  onNodeDragStop: (_event: any, node: Node) => void;
  onCreateProject: () => void;
  onCreateNorthStar: () => void;
  onProjectPathCreated?: () => void;
  onZoomChange?: (zoomLevel: ZoomLevel, numericZoom: number) => void;
}

export function JourneyMapCanvasView({
  nodes,
  edges,
  setEdges,
  isLoading,
  journeyStats,
  syncStatus,
  syncMessage,
  isNavigationExpanded,
  setIsNavigationExpanded,
  onNodesChange,
  onEdgesChange,
  onSelectionChange,
  onNodeDragStop,
  onCreateProject,
  onCreateNorthStar,
  onProjectPathCreated,
  onZoomChange,
}: JourneyMapCanvasViewProps) {
  const { getZoom } = useReactFlow();

  // Zoom level state - track both numeric and categorical
  const [currentZoom, setCurrentZoom] = useState<number>(1);
  const [currentZoomLevel, setCurrentZoomLevel] = useState<ZoomLevel>("medium");

  // Helper function to determine zoom level
  const getZoomLevel = useCallback((zoom: number): ZoomLevel => {
    if (zoom < 0.75) return "low";
    if (zoom >= 1.25) return "high";
    return "medium";
  }, []);

  // Monitor zoom changes with ReactFlow's viewport change handler
  useEffect(() => {
    const updateZoomLevel = () => {
      const zoom = getZoom();
      const newZoomLevel = getZoomLevel(zoom);

      // Update numeric zoom for smooth transitions
      setCurrentZoom(zoom);

      // Update categorical zoom level if changed
      if (newZoomLevel !== currentZoomLevel) {
        setCurrentZoomLevel(newZoomLevel);
        onZoomChange?.(newZoomLevel, zoom);
      }
    };

    // Check zoom level periodically - using shorter interval for smoother updates
    const interval = setInterval(updateZoomLevel, 50);
    return () => clearInterval(interval);
  }, [getZoom, getZoomLevel, currentZoomLevel, onZoomChange]);

  // Center on user node (0,0) on initial load
  const { setCenter } = useReactFlow();
  useEffect(() => {
    // Small delay to ensure nodes are rendered
    const timer = setTimeout(() => {
      setCenter(0, 0, { zoom: 1, duration: 800 });
    }, 100);
    return () => clearTimeout(timer);
  }, [setCenter]);

  // Path type dialog state
  const [pathTypeDialogOpen, setPathTypeDialogOpen] = useState(false);
  const [connectingToProject, setConnectingToProject] = useState<string | null>(
    null
  );
  const [connectingFromProject, setConnectingFromProject] = useState<
    string | null
  >(null);
  const [isCreatingPath, setIsCreatingPath] = useState(false);

  // Handle connection between projects
  const onConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target) return;

    // Prevent connecting to self
    if (connection.source === connection.target) {
      toast.error("Cannot connect a project to itself");
      return;
    }

    // Prevent connecting to/from user center
    if (
      connection.source === "user-center" ||
      connection.target === "user-center"
    ) {
      toast.error("Cannot connect to user center");
      return;
    }

    // Store connection and open path type dialog
    setConnectingFromProject(connection.source);
    setConnectingToProject(connection.target);
    setPathTypeDialogOpen(true);
  }, []);

  // Create project path with selected type
  const handleCreatePath = useCallback(
    async (pathType: "dependency" | "relates_to" | "leads_to") => {
      if (!connectingFromProject || !connectingToProject) return;

      setIsCreatingPath(true);
      try {
        // Create the path in database
        const newPath = await createProjectPath(
          connectingFromProject,
          connectingToProject,
          pathType
        );

        // Get path style configuration
        const pathStyle = getProjectPathStyle(pathType);

        // Create new edge and immediately add to visual state
        const newEdge: Edge = {
          id: newPath.id,
          source: connectingFromProject,
          target: connectingToProject,
          type: "smoothstep",
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
            pathType: pathType,
            pathId: newPath.id,
          },
        };

        // Add edge to visual state immediately
        setEdges((eds) => addEdge(newEdge, eds));

        toast.success("Project connection created");
        setPathTypeDialogOpen(false);
        setConnectingFromProject(null);
        setConnectingToProject(null);
      } catch (error) {
        console.error("Error creating project path:", error);
        toast.error("Failed to create project connection");
      } finally {
        setIsCreatingPath(false);
      }
    },
    [connectingFromProject, connectingToProject, setEdges]
  );

  // Handle edge changes including deletion
  const handleEdgesChange = useCallback(
    async (changes: EdgeChange[]) => {
      // Handle edge deletions
      for (const change of changes) {
        if (change.type === "remove") {
          const edge = edges.find((e) => e.id === change.id);
          if (edge && edge.data?.pathId) {
            try {
              await deleteProjectPath(edge.data.pathId);
              toast.success("Connection deleted");
            } catch (error) {
              console.error("Error deleting connection:", error);
              toast.error("Failed to delete connection");
              return; // Don't apply the change if deletion failed
            }
          }
        }
      }

      // Apply the changes to the edges directly
      setEdges((eds) => applyEdgeChanges(changes, eds) as Edge[]);
    },
    [edges, setEdges]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading your journey...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Top Action Bar */}
      <JourneyActionBar
        stats={journeyStats}
        onCreateProject={onCreateProject}
        onCreateNorthStar={onCreateNorthStar}
      />

      {/* ReactFlow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={handleEdgesChange}
          onSelectionChange={onSelectionChange}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={FLOW_CONFIG.FIT_VIEW_OPTIONS}
          minZoom={FLOW_CONFIG.MIN_ZOOM}
          maxZoom={FLOW_CONFIG.MAX_ZOOM}
          defaultEdgeOptions={{
            type: "straight",
            animated: false,
          }}
          connectionMode={ConnectionMode.Loose}
          connectionLineType={ConnectionLineType.SmoothStep}
          nodesDraggable
          nodesConnectable
          connectOnClick={false}
          elementsSelectable
          edgesReconnectable={false}
          deleteKeyCode={["Delete", "Backspace"]}
          panOnScroll
          panOnDrag={FLOW_CONFIG.PAN_ON_DRAG}
          attributionPosition="bottom-left"
          onlyRenderVisibleElements
          elevateEdgesOnSelect={false}
          disableKeyboardA11y={true}
        >
          <Background
            gap={BACKGROUND_CONFIG.GAP}
            size={BACKGROUND_CONFIG.SIZE}
            color={BACKGROUND_CONFIG.COLOR}
            style={{ backgroundColor: BACKGROUND_CONFIG.BG_COLOR }}
          />
          <Controls
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.9)",
              border: "1px solid #334155",
              borderRadius: "8px",
            }}
          />

          {/* Connection Help */}
          <Panel position="bottom-left" className="m-4">
            <div className="bg-slate-800/95 backdrop-blur border border-slate-700 rounded-lg p-3 shadow-lg max-w-sm">
              <p className="text-xs text-slate-200">
                <span className="font-semibold">💡 Tip:</span> Drag from the
                colored dot on one project to another project to create a
                connection. Click edges to select them, then press Backspace or
                Delete to remove.
              </p>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Path Type Selection Dialog */}
      <Dialog open={pathTypeDialogOpen} onOpenChange={setPathTypeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Connection Type</DialogTitle>
            <DialogDescription>
              Choose how these projects are related to each other.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button
              onClick={() => handleCreatePath("dependency")}
              disabled={isCreatingPath}
              variant="outline"
              className="justify-start h-auto py-3 px-4"
            >
              <div className="text-left">
                <div className="font-semibold text-blue-600">Dependency</div>
                <div className="text-xs text-slate-500 mt-1">
                  Target project depends on source project
                </div>
              </div>
            </Button>
            <Button
              onClick={() => handleCreatePath("relates_to")}
              disabled={isCreatingPath}
              variant="outline"
              className="justify-start h-auto py-3 px-4"
            >
              <div className="text-left">
                <div className="font-semibold text-amber-600">Relates To</div>
                <div className="text-xs text-slate-500 mt-1">
                  Projects are related or connected
                </div>
              </div>
            </Button>
            <Button
              onClick={() => handleCreatePath("leads_to")}
              disabled={isCreatingPath}
              variant="outline"
              className="justify-start h-auto py-3 px-4"
            >
              <div className="text-left">
                <div className="font-semibold text-emerald-600">Leads To</div>
                <div className="text-xs text-slate-500 mt-1">
                  Source project leads to target project
                </div>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPathTypeDialogOpen(false);
                setConnectingFromProject(null);
                setConnectingToProject(null);
              }}
              disabled={isCreatingPath}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Navigation Guide - Bottom */}
      <NavigationGuide
        stats={journeyStats}
        isExpanded={isNavigationExpanded}
        onToggle={() => setIsNavigationExpanded(!isNavigationExpanded)}
      />

      {/* Sync Status Indicator */}
      <SyncStatusIndicator status={syncStatus} message={syncMessage} />
    </>
  );
}
