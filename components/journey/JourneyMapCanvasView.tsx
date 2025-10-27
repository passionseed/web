/**
 * JourneyMapCanvas - Main ReactFlow canvas component
 *
 * Displays the journey map with nodes, edges, and controls.
 * Extracted from main component for better separation of concerns.
 */

"use client";

import React, { useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  OnSelectionChangeParams,
  Connection,
  ConnectionMode,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Loader2, GitFork } from "lucide-react";
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
import { createProjectPath } from "@/lib/supabase/journey";

import { UserCenterNode } from "./nodes/UserCenterNode";
import { NorthStarProjectNode } from "./nodes/NorthStarProjectNode";
import { ShortTermProjectNode } from "./nodes/ShortTermProjectNode";
import { MainQuestFloatingPath } from "./edges/MainQuestFloatingPath";
import { NorthStarFloatingLink } from "./edges/NorthStarFloatingLink";
import { JourneyActionBar, JourneyStats } from "./JourneyActionBar";
import { NavigationGuide } from "./NavigationGuide";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import {
  FLOW_CONFIG,
  BACKGROUND_CONFIG,
  MINIMAP_COLORS,
} from "./constants/journeyMapConfig";
import { SyncStatus } from "@/lib/sync/PositionSyncManager";

const nodeTypes = {
  userCenter: UserCenterNode,
  northStar: NorthStarProjectNode,
  shortTerm: ShortTermProjectNode,
};

const edgeTypes = {
  mainQuest: MainQuestFloatingPath,
  northStar: NorthStarFloatingLink,
};

interface JourneyMapCanvasViewProps {
  // Data
  nodes: Node[];
  edges: Edge[];
  isLoading: boolean;
  journeyStats: JourneyStats;

  // Sync status
  syncStatus: SyncStatus;
  syncMessage: string | undefined;

  // Navigation state
  isNavigationExpanded: boolean;
  setIsNavigationExpanded: (expanded: boolean) => void;

  // Connection mode
  isProjectConnectMode: boolean;
  onToggleConnectMode: () => void;

  // Event handlers
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onSelectionChange: (params: OnSelectionChangeParams) => void;
  onNodeDragStop: (_event: any, node: Node) => void;
  onCreateProject: () => void;
  onProjectPathCreated?: () => void;
}

export function JourneyMapCanvasView({
  nodes,
  edges,
  isLoading,
  journeyStats,
  syncStatus,
  syncMessage,
  isNavigationExpanded,
  setIsNavigationExpanded,
  isProjectConnectMode,
  onToggleConnectMode,
  onNodesChange,
  onEdgesChange,
  onSelectionChange,
  onNodeDragStop,
  onCreateProject,
  onProjectPathCreated,
}: JourneyMapCanvasViewProps) {
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
  const onConnect = useCallback((connection: Connection) => {
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
        await createProjectPath(
          connectingFromProject,
          connectingToProject,
          pathType
        );
        toast.success("Project connection created");
        setPathTypeDialogOpen(false);
        setConnectingFromProject(null);
        setConnectingToProject(null);

        // Notify parent to reload data
        onProjectPathCreated?.();
      } catch (error) {
        console.error("Error creating project path:", error);
        toast.error("Failed to create project connection");
      } finally {
        setIsCreatingPath(false);
      }
    },
    [connectingFromProject, connectingToProject, onProjectPathCreated]
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
      />

      {/* ReactFlow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onSelectionChange={onSelectionChange}
          onNodeDragStop={onNodeDragStop}
          onConnect={isProjectConnectMode ? onConnect : undefined}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={FLOW_CONFIG.FIT_VIEW_OPTIONS}
          minZoom={FLOW_CONFIG.MIN_ZOOM}
          maxZoom={FLOW_CONFIG.MAX_ZOOM}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: false,
          }}
          connectionMode={ConnectionMode.Loose}
          nodesDraggable
          nodesConnectable={isProjectConnectMode}
          elementsSelectable
          panOnScroll
          panOnDrag={FLOW_CONFIG.PAN_ON_DRAG}
          attributionPosition="bottom-left"
        >
          <Background
            gap={BACKGROUND_CONFIG.GAP}
            size={BACKGROUND_CONFIG.SIZE}
            color={BACKGROUND_CONFIG.COLOR}
            style={{ backgroundColor: BACKGROUND_CONFIG.BG_COLOR }}
          />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === "userCenter") return MINIMAP_COLORS.USER_CENTER;
              if (node.type === "northStar") return MINIMAP_COLORS.NORTH_STAR;
              return MINIMAP_COLORS.SHORT_TERM;
            }}
            maskColor={MINIMAP_COLORS.MASK}
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.9)",
              border: "1px solid #334155",
              borderRadius: "8px",
            }}
          />
          <Controls
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.9)",
              border: "1px solid #334155",
              borderRadius: "8px",
            }}
          />

          {/* Connection Mode Toggle */}
          <Panel position="top-right" className="m-2">
            <Button
              onClick={onToggleConnectMode}
              size="sm"
              className={cn(
                "transition-colors shadow-lg",
                isProjectConnectMode
                  ? "bg-teal-500/20 text-teal-400 border-teal-500 hover:bg-teal-500/30"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              )}
              variant={isProjectConnectMode ? "default" : "outline"}
              title="Connect projects together"
            >
              <GitFork className="w-4 h-4 mr-2" />
              {isProjectConnectMode ? "Exit Connect" : "Link Projects"}
            </Button>
          </Panel>

          {/* Connection Mode Help */}
          {isProjectConnectMode && (
            <Panel position="bottom-left" className="m-4">
              <div className="bg-teal-900/90 backdrop-blur border border-teal-700 rounded-lg p-3 shadow-lg max-w-sm">
                <p className="text-sm text-teal-100 font-medium mb-1">
                  Connect Mode Active
                </p>
                <p className="text-xs text-teal-200">
                  Drag from one project to another to create a connection.
                </p>
              </div>
            </Panel>
          )}
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
