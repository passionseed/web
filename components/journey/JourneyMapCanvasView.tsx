/**
 * JourneyMapCanvas - Main ReactFlow canvas component
 *
 * Displays the journey map with nodes, edges, and controls.
 * Extracted from main component for better separation of concerns.
 */

"use client";

import React from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Loader2 } from "lucide-react";

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

  // Event handlers
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onSelectionChange: (params: OnSelectionChangeParams) => void;
  onNodeDragStop: (_event: any, node: Node) => void;
  onCreateProject: () => void;
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
  onNodesChange,
  onEdgesChange,
  onSelectionChange,
  onNodeDragStop,
  onCreateProject,
}: JourneyMapCanvasViewProps) {
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
          nodesDraggable
          nodesConnectable={false}
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
        </ReactFlow>
      </div>

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
