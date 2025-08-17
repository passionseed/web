"use client";

import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  OnSelectionChangeParams,
  OnNodesDelete,
  OnEdgesDelete,
  Connection,
  OnNodeDrag,
} from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Plus, Info, Type } from "lucide-react";
import { AppNode, AppEdge } from "./types";
import { CustomNode } from "./components/CustomNode";
import { TextNode } from "./components/TextNode";
import { EDGE_TYPES, MINIMAP_CONFIG } from "./constants";

interface MapCanvasProps {
  nodes: AppNode[];
  edges: AppEdge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  onNodesDelete: OnNodesDelete;
  onEdgesDelete: OnEdgesDelete;
  onNodeDragStop: OnNodeDrag;
  onSelectionChange: (params: OnSelectionChangeParams) => void;
  onAddNode: () => void;
  onAddTextNode: () => void;
  onNodeDataChange: (nodeId: string, data: any) => void;
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
  onAddTextNode,
  onNodeDataChange,
}: MapCanvasProps) {
  const nodeTypes = useMemo(
    () => ({
      default: CustomNode,
      text: (props: any) => (
        <TextNode 
          {...props} 
          onDataChange={(data) => onNodeDataChange(props.id, data)}
        />
      ),
    }),
    [onNodeDataChange]
  );

  return (
    <div className="h-full relative bg-slate-50 dark:bg-slate-950">
      {/* Enhanced Floating Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-2 shadow-lg">
        <Button onClick={onAddNode} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Node
        </Button>
        <Button onClick={onAddTextNode} size="sm" variant="outline" className="gap-2">
          <Type className="h-4 w-4" />
          Add Text
        </Button>
        <div className="h-4 w-px bg-border" />
        <div className="text-xs text-muted-foreground px-2">
          {nodes.length} nodes • {edges.length} connections
        </div>
      </div>

      {/* Keyboard Shortcuts Helper */}
      <div className="absolute top-4 right-4 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-3 shadow-lg max-w-xs">
        <div className="flex items-center gap-2 text-xs font-medium mb-2">
          <Info className="h-3 w-3" />
          Quick Actions
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Add Node</span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-xs">+</kbd>
          </div>
          <div className="flex justify-between">
            <span>Delete Selected</span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Del</kbd>
          </div>
          <div className="flex justify-between">
            <span>Pan Canvas</span>
            <span className="text-xs">Space + Drag</span>
          </div>
          <div className="flex justify-between">
            <span>Zoom</span>
            <span className="text-xs">Mouse Wheel</span>
          </div>
        </div>
      </div>

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
        snapToGrid={true}
        snapGrid={[20, 20]}
        fitView
        attributionPosition="bottom-left"
        panOnScroll
        selectionOnDrag
        panOnDrag={[1, 2]}
      >
        <Background gap={20} size={1} color="#94a3b8" />
        <MiniMap
          {...MINIMAP_CONFIG}
          style={{
            background: "rgba(255, 255, 255, 0.9)",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
          }}
        />
      </ReactFlow>
    </div>
  );
}
