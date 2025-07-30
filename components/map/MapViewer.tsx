"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Controls,
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  OnSelectionChangeParams,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { NodeViewPanel } from "@/components/map/NodeViewPanel";
import { FullLearningMap } from "@/lib/supabase/maps";
import { getStudentProgress } from "@/lib/supabase/progresses";
import { MapNode, StudentNodeProgress } from "@/types/map";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, Clock, AlertTriangle, Play, Lock } from "lucide-react";

interface MapViewerProps {
  map: FullLearningMap;
}

export function MapViewer({ map }: MapViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<MapNode> | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [progressMap, setProgressMap] = useState<
    Record<string, StudentNodeProgress>
  >({});

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  const loadAllProgress = async () => {
    if (!currentUser) return;

    const progressData: Record<string, StudentNodeProgress> = {};

    for (const node of map.map_nodes) {
      try {
        const progress = await getStudentProgress(currentUser.id, node.id);
        if (progress) {
          progressData[node.id] = progress;
        }
      } catch (error) {
        console.error(`Error loading progress for node ${node.id}:`, error);
      }
    }

    setProgressMap(progressData);
  };

  useEffect(() => {
    if (currentUser) {
      loadAllProgress();
    }
  }, [currentUser, map]);

  // Check if node is unlocked based on prerequisites
  const isNodeUnlocked = (nodeId: string): boolean => {
    // Find all nodes that have paths leading to this node
    const prerequisites = map.map_nodes.filter((node) =>
      node.node_paths_source.some((path) => path.destination_node_id === nodeId)
    );

    // If no prerequisites, node is unlocked (starting node)
    if (prerequisites.length === 0) return true;

    // Check if at least one prerequisite is passed
    return prerequisites.some((prereq) => {
      const progress = progressMap[prereq.id];
      return progress?.status === "passed";
    });
  };

  // Custom node component with sprite-based gamified design
  const nodeTypes = {
    default: ({
      data,
      selected,
    }: {
      data: MapNode & { progress?: StudentNodeProgress };
      selected?: boolean;
    }) => {
      const progress = data.progress;
      const isUnlocked = isNodeUnlocked(data.id);
      const spriteUrl = data.sprite_url || "/islands/crystal.png";

      // Determine node state and styling
      let overlayColor = "";
      let statusIcon = null;
      let glowEffect = "";
      let brightness = "brightness(1)";

      if (!isUnlocked) {
        brightness = "brightness(0.3) grayscale(1)";
        statusIcon = null;
      } else if (progress) {
        switch (progress.status) {
          case "passed":
            glowEffect = "drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]";
            statusIcon = <CheckCircle className="h-4 w-4 text-green-500" />;
            break;
          case "failed":
            glowEffect = "drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]";
            statusIcon = <AlertTriangle className="h-4 w-4 text-red-500" />;
            break;
          case "submitted":
            glowEffect = "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]";
            statusIcon = <Clock className="h-4 w-4 text-blue-500" />;
            break;
          case "in_progress":
            glowEffect = "drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]";
            statusIcon = (
              <Clock className="h-4 w-4 text-orange-500 animate-pulse" />
            );
            break;
          case "not_started":
            if (isUnlocked) {
              statusIcon = <Play className="h-4 w-4 text-blue-400" />;
            }
            break;
        }
      } else if (isUnlocked) {
        statusIcon = <Play className="h-4 w-4 text-blue-400" />;
      }

      return (
        <div className="relative group">
          {/* Connection Handles - Hidden in viewer mode */}
          <Handle type="target" position={Position.Top} className="opacity-0" />
          <Handle
            type="source"
            position={Position.Bottom}
            className="opacity-0"
          />
          <Handle
            type="target"
            position={Position.Left}
            className="opacity-0"
          />
          <Handle
            type="source"
            position={Position.Right}
            className="opacity-0"
          />

          {/* Main Sprite Container */}
          <div
            className={`relative ${selected ? "scale-110" : ""} transition-transform duration-200 cursor-pointer`}
          >
            {/* Selection Ring */}
            {selected && (
              <div className="absolute -inset-2 rounded-full border-4 border-blue-400 animate-pulse" />
            )}

            {/* Progress Glow Effect */}
            {glowEffect && (
              <div className={`absolute inset-0 ${glowEffect} rounded-full`} />
            )}

            {/* Sprite Image */}
            <img
              src={spriteUrl}
              alt={data.title}
              className={`w-max h-max object-contain drop-shadow-lg hover:drop-shadow-xl transition-all duration-200 ${glowEffect}`}
              style={{
                filter: selected
                  ? `${brightness} brightness(1.1) saturate(1.2)`
                  : brightness,
              }}
            />

            {/* Floating Label */}
            <div
              className={`absolute -bottom-8 left-1/2 transform -translate-x-1/2 ${selected ? "scale-105" : ""} transition-all duration-200`}
            >
              <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1 shadow-lg">
                <div className="text-xs font-bold text-gray-800 text-center whitespace-nowrap max-w-24 truncate">
                  {data.title}
                </div>
                <div className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
                  ⭐ {data.difficulty}
                  {statusIcon && <span className="ml-1">{statusIcon}</span>}
                </div>
              </div>
            </div>

            {/* Lock Overlay for locked nodes */}
            {!isUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/50 rounded-full p-2">
                  <Lock className="h-6 w-6 text-white" />
                </div>
              </div>
            )}
          </div>
        </div>
      );
    },
  };

  useEffect(() => {
    const transformedNodes = map.map_nodes.map((node) => ({
      id: node.id,
      type: "default",
      data: { ...node, progress: progressMap[node.id] },
      position: (node.metadata as any)?.position || {
        x: Math.random() * 400,
        y: Math.random() * 400,
      },
      draggable: true, // Disable dragging in viewer mode
      connectable: false,
      selectable: true,
      selected: selectedNode?.id === node.id,
      style: {
        backgroundColor: "#ffffff00",
        border: "2px solid #cccccc00",
        flexGrow: 1,
        aspectRatio: "1 / 1",
      },
    }));

    const transformedEdges: Edge[] = [];
    map.map_nodes.forEach((node) => {
      node.node_paths_source.forEach((path) => {
        // Add visual indicators for path states
        const sourceProgress = progressMap[path.source_node_id];
        const isPathActive =
          sourceProgress?.status === "passed" ||
          sourceProgress?.status === "in_progress";

        transformedEdges.push({
          id: path.id,
          source: path.source_node_id,
          target: path.destination_node_id,
          animated: isPathActive,
          style: {
            stroke: isPathActive ? "#10b981" : "#6b7280",
            strokeWidth: isPathActive ? 3 : 2,
            opacity: isPathActive ? 1 : 0.5,
          },
        });
      });
    });

    setNodes(transformedNodes as any);
    setEdges(transformedEdges);
  }, [map, progressMap, setNodes, setEdges]);

  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const selected = params.nodes[0];
    if (selected) {
      setSelectedNode(selected as Node<MapNode>);
    } else {
      setSelectedNode(null);
    }
  }, []);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={70}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
        >
          <Controls showInteractive={false} />
          <Background />
        </ReactFlow>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
        <NodeViewPanel
          selectedNode={selectedNode}
          onProgressUpdate={loadAllProgress}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
