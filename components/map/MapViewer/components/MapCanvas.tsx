/**
 * MapCanvas - ReactFlow canvas component with nodes and edges
 */

import React from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  OnSelectionChangeParams,
} from "@xyflow/react";

import { MapViewerNode, MapViewerEdge } from "../types";
import { MINIMAP_CONFIG } from "../constants";
import { getMiniMapNodeColor } from "../utils/nodeTransformers";
import FloatingEdge from "@/components/map/FloatingEdge";

const edgeTypes = {
  floating: FloatingEdge,
};

interface MapCanvasProps {
  nodes: MapViewerNode[];
  edges: MapViewerEdge[];
  nodeTypes: any;
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  onSelectionChange: (params: OnSelectionChangeParams) => void;
}

export function MapCanvas({
  nodes,
  edges,
  nodeTypes,
  onNodesChange,
  onEdgesChange,
  onSelectionChange,
}: MapCanvasProps) {
  const miniMapConfigWithColor = {
    ...MINIMAP_CONFIG,
    nodeColor: getMiniMapNodeColor,
    style: {
      ...MINIMAP_CONFIG.style,
      background: "rgba(255, 255, 255, 0.9)",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
    },
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onSelectionChange={onSelectionChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={true}
      panOnScroll
      panOnDrag={[1, 2]}
      attributionPosition="bottom-left"
      aria-label="Interactive learning map"
    >
      <Background gap={20} size={1} color="#94a3b8" />
      <MiniMap
        {...miniMapConfigWithColor}
      />
    </ReactFlow>
  );
}