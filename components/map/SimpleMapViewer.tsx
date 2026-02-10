"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Controls,
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { FullLearningMap } from "@/lib/supabase/maps";
import {
  loadAllProgress as loadMapProgress,
  type StudentProgress,
} from "@/lib/supabase/progresses";
import { MapNode } from "@/types/map";
import { createClient } from "@/utils/supabase/client";
import { TextNode } from "@/components/map/MapEditor/components/TextNode";
import { CheckCircle, Clock, AlertTriangle, Play } from "lucide-react";
import FloatingEdge from "@/components/map/FloatingEdge";

interface SimpleMapViewerProps {
  map: FullLearningMap;
  seedId?: string;
}

const edgeTypes = {
  floating: FloatingEdge,
};

const miniMapConfig = {
  position: "bottom-right" as const,
  nodeBorderRadius: 8,
  nodeStrokeWidth: 2,
  nodeColor: (node: any) => {
    const progress = node.data?.progress;
    if (!progress) return "#94a3b8";

    switch (progress.status) {
      case "passed":
        return "#22c55e";
      case "failed":
        return "#ef4444";
      case "submitted":
        return "#3b82f6";
      case "in_progress":
        return "#f59e0b";
      default:
        return "#94a3b8";
    }
  },
  style: {
    transform: "scale(0.8)",
    transformOrigin: "bottom right",
  },
  nodeStrokeColor: "#ffffff",
  bgColor: "rgba(15, 23, 42, 0.8)",
  maskColor: "rgba(255, 255, 255, 0.1)",
  maskStrokeColor: "#ffffff",
  maskStrokeWidth: 1,
  pannable: true,
  zoomable: true,
  ariaLabel: "Learning map overview",
  offsetScale: 5,
};

function SimpleMapViewerContent({ map, seedId }: SimpleMapViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [progressMap, setProgressMap] = useState<Record<string, any>>({});
  const reactFlowInstance = useReactFlow();
  const [currentUser, setCurrentUser] = useState<any>(null);

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

  // Check if node is unlocked based on prerequisites
  const isNodeUnlocked = useCallback(
    (nodeId: string): boolean => {
      const nodeData = map.map_nodes.find((n) => n.id === nodeId);
      if ((nodeData as any)?.node_type === "text") return true;

      const prerequisites = map.map_nodes.filter((node) =>
        node.node_paths_source.some(
          (path) => path.destination_node_id === nodeId,
        ),
      );

      if (prerequisites.length === 0) return true;

      return prerequisites.every((prereq) => {
        const progress = progressMap[prereq.id];
        return (
          progress?.status === "passed" || progress?.status === "submitted"
        );
      });
    },
    [map.map_nodes, progressMap],
  );

  // Check if node is completed
  const isNodeCompleted = useCallback(
    (nodeId: string, progress: any): boolean => {
      // Simple check for now, can expand later if "all" requirement is needed
      return progress?.status === "passed" || progress?.status === "submitted";
    },
    [],
  );

  const loadAllProgress = useCallback(async () => {
    if (!currentUser) return;
    try {
      const progressData = await loadMapProgress(map.id);
      setProgressMap(progressData);
    } catch (error) {
      console.error("Error loading progress:", error);
    }
  }, [currentUser, map.id]);

  useEffect(() => {
    if (currentUser) {
      loadAllProgress();
    }
  }, [currentUser, loadAllProgress]);

  // Transform map data into React Flow nodes/edges
  useEffect(() => {
    if (!map) return;

    const newNodes = map.map_nodes.map((node) => ({
      id: node.id,
      type: (node as any).node_type === "text" ? "text" : "default",
      position: (node.metadata as any)?.position || { x: 0, y: 0 },
      data: {
        ...node,
        progress: progressMap[node.id],
      },
    }));

    const newEdges = map.map_nodes.flatMap((node) =>
      node.node_paths_source.map((path) => ({
        id: path.id,
        source: path.source_node_id,
        target: path.destination_node_id,
        type: "floating",
        animated: true,
        style: { stroke: "#64748b", strokeWidth: 2 },
      })),
    );

    setNodes(newNodes);
    setEdges(newEdges);

    // Fit view after a short delay
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
    }, 100);
  }, [map, progressMap, setNodes, setEdges, reactFlowInstance]);

  const nodeTypes = useMemo(
    () => ({
      text: TextNode,
      default: ({
        data,
      }: {
        data: MapNode & { progress?: StudentProgress | any };
      }) => {
        const progress = data.progress;
        const isUnlocked = isNodeUnlocked(data.id);
        const spriteUrl = data.sprite_url || "/islands/crystal.png";

        let statusIcon = null;
        let glowEffect = "";
        let brightness = "brightness(1)";
        let animationClass = "";

        if (isUnlocked) {
          animationClass = "animate-float";
        }

        if (!isUnlocked) {
          brightness = "brightness(0.3) grayscale(1)";
        } else if (progress) {
          const status = progress.status || (progress as any)?.status;
          const isCompleted = isNodeCompleted(data.id, progress);

          if (isCompleted) {
            glowEffect = "drop-shadow-[0_0_12px_rgba(34,197,94,0.6)]";
            statusIcon = <CheckCircle className="h-4 w-4 text-green-500" />;
            animationClass = "animate-float-success";
          } else if (status === "failed") {
            glowEffect = "drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]";
            statusIcon = <AlertTriangle className="h-4 w-4 text-red-500" />;
            animationClass = "animate-shake";
          } else if (status === "submitted") {
            glowEffect = "drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]";
            statusIcon = <Clock className="h-4 w-4 text-blue-500" />;
            animationClass = "animate-float";
          } else if (status === "in_progress") {
            glowEffect = "drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]";
            statusIcon = <Play className="h-4 w-4 text-amber-500" />;
            animationClass = "animate-float";
          }
        }

        if (isUnlocked && (!progress || !progress.status)) {
          animationClass = "animate-float";
        }

        return (
          <div className={`relative group ${animationClass}`}>
            <Handle
              type="target"
              position={Position.Left}
              className="!w-3 !h-3 !bg-slate-400/50 !border-2 !border-slate-600 !-left-2 transition-colors hover:!bg-slate-300 opacity-0"
            />
            <Handle
              type="source"
              position={Position.Right}
              className="!w-3 !h-3 !bg-slate-400/50 !border-2 !border-slate-600 !-right-2 transition-colors hover:!bg-slate-300 opacity-0"
            />

            <div className="relative min-w-[64px] min-h-[64px] w-fit h-fit flex items-center justify-center">
              {isUnlocked && (
                <div className="absolute inset-0 -z-10">
                  <img
                    src={spriteUrl}
                    alt=""
                    className="w-auto h-auto object-contain absolute opacity-60 pointer-events-none"
                    style={{
                      filter: "brightness(0) blur(4px)",
                      transform: "scale(1.3)",
                    }}
                  />
                </div>
              )}

              {glowEffect && (
                <div
                  className={`absolute inset-0 ${glowEffect} rounded-full animate-pulse-slow`}
                />
              )}

              <img
                src={spriteUrl}
                alt={data.title}
                className={`w-auto h-auto object-contain z-20 drop-shadow-lg transition-all duration-300 ${glowEffect}`}
                style={{
                  filter: brightness,
                }}
              />

              <div
                className={`absolute -bottom-10 left-1/2 transform -translate-x-1/2 transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-1 z-30`}
              >
                <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-lg min-w-[100px] max-w-[240px]">
                  <div className="text-xs font-bold text-card-foreground text-center break-words line-clamp-2 leading-snug">
                    {data.title}
                  </div>
                  <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1 mt-0.5">
                    ⭐ {data.difficulty}
                    {statusIcon && <span className="ml-1">{statusIcon}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      },
    }),
    [isNodeUnlocked, isNodeCompleted],
  );

  return (
    <div className="w-full h-full bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={4}
        defaultEdgeOptions={{
          type: "floating",
          animated: true,
        }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background gap={20} size={1} color="#334155" />
        <Controls showInteractive={false} />
        <MiniMap {...miniMapConfig} />
      </ReactFlow>
    </div>
  );
}

export function SimpleMapViewer(props: SimpleMapViewerProps) {
  return (
    <ReactFlowProvider>
      <SimpleMapViewerContent {...props} />
    </ReactFlowProvider>
  );
}
