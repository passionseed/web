"use client";

import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  NodeDragHandler,
  OnSelectionChangeParams,
  OnNodesDelete,
  OnEdgesDelete,
  Connection,
} from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AppNode, AppEdge } from "./types";
import { CustomNode } from "./components/CustomNode";
import { EDGE_TYPES, MINIMAP_CONFIG } from "./constants";

interface MapCanvasProps {
  nodes: AppNode[];
  edges: AppEdge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  onNodesDelete: OnNodesDelete;
  onEdgesDelete: OnEdgesDelete;
  onNodeDragStop: NodeDragHandler;
  onSelectionChange: (params: OnSelectionChangeParams) => void;
  onAddNode: () => void;
}

export function MapCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodesDelete,
  onEdgesDelete,
  onNodeDragStop,
  onSelectionChange,
  onAddNode,
}: MapCanvasProps) {
  const nodeTypes = useMemo(
    () => ({
      default: CustomNode,
    }),
    []
  );

  return (
    <div className="h-full relative">
      <Button
        onClick={onAddNode}
        className="absolute top-4 right-4 z-10"
        size="sm"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Node
      </Button>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={EDGE_TYPES}
        fitView
      >
        <Background />
        <MiniMap {...MINIMAP_CONFIG} />
      </ReactFlow>
    </div>
  );
}
