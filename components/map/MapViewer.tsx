"use client";

import { useState, useEffect, useCallback } from "react";
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  OnSelectionChangeParams,
} from "reactflow";
import "reactflow/dist/style.css";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { NodeViewPanel } from "@/components/map/NodeViewPanel";
import { FullLearningMap, getStudentProgress } from "@/lib/supabase/maps";
import { MapNode, StudentNodeProgress } from "@/types/map";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, Clock, AlertTriangle } from "lucide-react";

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

  // Custom node component that shows progress
  const nodeTypes = {
    default: ({
      data,
    }: {
      data: MapNode & { progress?: StudentNodeProgress };
    }) => {
      const progress = data.progress;

      let borderColor = "border-stone-400";
      let bgColor = "bg-white";
      let statusIcon = null;

      if (progress) {
        switch (progress.status) {
          case "passed":
            borderColor = "border-green-500";
            bgColor = "bg-green-50";
            statusIcon = <CheckCircle className="h-4 w-4 text-green-500" />;
            break;
          case "failed":
            borderColor = "border-red-500";
            bgColor = "bg-red-50";
            statusIcon = <AlertTriangle className="h-4 w-4 text-red-500" />;
            break;
          case "submitted":
            borderColor = "border-blue-500";
            bgColor = "bg-blue-50";
            statusIcon = <Clock className="h-4 w-4 text-blue-500" />;
            break;
          case "in_progress":
            borderColor = "border-orange-500";
            bgColor = "bg-orange-50";
            statusIcon = (
              <Clock className="h-4 w-4 text-orange-500 animate-pulse" />
            );
            break;
        }
      }

      return (
        <div
          className={`px-4 py-2 shadow-md rounded-md ${bgColor} border-2 ${borderColor} min-w-[120px]`}
        >
          <div className="flex items-center justify-between">
            <div className="font-bold text-sm">{data.title}</div>
            {statusIcon && <div className="ml-2">{statusIcon}</div>}
          </div>
          <div className="text-xs text-gray-500">
            Difficulty: {data.difficulty}
          </div>
          {progress && (
            <div className="text-xs text-gray-600 capitalize">
              {progress.status.replace("_", " ")}
            </div>
          )}
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
      connectable: false, // Make individual nodes non-connectable
    }));

    const transformedEdges: Edge[] = [];
    map.map_nodes.forEach((node) => {
      node.node_paths_source.forEach((path) => {
        transformedEdges.push({
          id: path.id,
          source: path.source_node_id,
          target: path.destination_node_id,
          animated: true,
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
