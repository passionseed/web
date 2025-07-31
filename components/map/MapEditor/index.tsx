"use client";

import React from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { FullLearningMap } from "@/lib/supabase/maps";
import { MapCanvas } from "./MapCanvas";
import { NodeEditorPanel } from "../NodeEditorPanel";
import { useMapEditor } from "./hooks/useMapEditor";

interface MapEditorProps {
  map: FullLearningMap;
  onMapChange: (updatedMap: FullLearningMap) => void;
}

export function MapEditor({ map, onMapChange }: MapEditorProps) {
  const {
    nodes,
    edges,
    selectedNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodesDelete,
    onEdgesDelete,
    onNodeDragStop,
    onSelectionChange,
    handleAddNode,
    handleNodeDataChange,
    handleDeleteNode,
  } = useMapEditor(map, onMapChange);

  return (
    <ResizablePanelGroup direction="horizontal" className="border rounded-lg">
      <ResizablePanel defaultSize={75}>
        <MapCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onNodeDragStop={onNodeDragStop}
          onSelectionChange={onSelectionChange}
          onAddNode={handleAddNode}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
        <NodeEditorPanel
          selectedNode={selectedNode}
          onNodeDataChange={handleNodeDataChange}
          onNodeDelete={handleDeleteNode}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
