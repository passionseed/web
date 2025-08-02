"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
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
  const reactFlowInstance = useReactFlow();

  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const leftPanelRef = useRef<ImperativePanelHandle>(null);

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

    // Check if at least one prerequisite is passed OR submitted (pending grade)
    return prerequisites.some((prereq) => {
      const progress = progressMap[prereq.id];
      return progress?.status === "passed" || progress?.status === "submitted";
    });
  };

  // Custom node component with sprite-based gamified design and floating animations
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
      let animationClass = "";

      // Base floating animation for all unlocked nodes
      if (isUnlocked) {
        animationClass = "animate-float";
      }

      if (!isUnlocked) {
        brightness = "brightness(0.3) grayscale(1)";
        statusIcon = null;
      } else if (progress) {
        switch (progress.status) {
          case "passed":
            glowEffect = "drop-shadow-[0_0_12px_rgba(34,197,94,0.6)]";
            statusIcon = <CheckCircle className="h-4 w-4 text-green-500" />;
            animationClass = "animate-float-success";
            break;
          case "failed":
            glowEffect = "drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]";
            statusIcon = <AlertTriangle className="h-4 w-4 text-red-500" />;
            animationClass = "animate-float-failed";
            break;
          case "submitted":
            glowEffect = "drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]";
            statusIcon = <Clock className="h-4 w-4 text-blue-500" />;
            animationClass = "animate-float-submitted";
            break;
          case "in_progress":
            glowEffect = "drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]";
            statusIcon = (
              <Clock className="h-4 w-4 text-orange-500 animate-pulse" />
            );
            animationClass = "animate-float-progress";
            break;
          case "not_started":
            if (isUnlocked) {
              statusIcon = <Play className="h-4 w-4 text-blue-400" />;
              animationClass = "animate-float";
            }
            break;
        }
      } else if (isUnlocked) {
        statusIcon = <Play className="h-4 w-4 text-blue-400" />;
        animationClass = "animate-float";
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

          {/* Main Sprite Container with Floating Animation */}
          <div
            className={`relative ${selected ? "scale-110 translate-y-3" : ""} transition-transform duration-300 cursor-pointer ${animationClass}`}
          >
            {/* Selection Shadow - Enhanced for flying islands */}
            {selected && (
              <div className="absolute inset-0 -z-10">
                {/* Main shadow image */}
                <img
                  src={spriteUrl}
                  alt=""
                  className="w-max h-max object-contain absolute opacity-60"
                  style={{
                    filter: "brightness(0) blur(4px)",
                    transform: "scale(1.3)",
                  }}
                />
                {/* Secondary softer shadow for depth */}
                <img
                  src={spriteUrl}
                  alt=""
                  className="w-max h-max object-contain absolute opacity-30"
                  style={{
                    filter: "brightness(0) blur(8px)",
                    transform: "translateY(16px) scale(1.2)",
                  }}
                />
                {/* Ground shadow for flying island effect */}
                <div
                  className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 w-16 h-6 bg-black/20 rounded-full blur-md"
                  style={{
                    animation: selected
                      ? "shadow-pulse 2s ease-in-out infinite"
                      : "none",
                  }}
                />
              </div>
            )}

            {/* Progress Glow Effect */}
            {glowEffect && (
              <div
                className={`absolute inset-0 ${glowEffect} rounded-full animate-pulse-slow`}
              />
            )}

            {/* Floating Particles for Special States */}
            {progress?.status === "passed" && (
              <div className="absolute -inset-4 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-1 h-1 bg-green-400 rounded-full animate-float-particle-1"></div>
                <div className="absolute top-1/4 right-0 w-0.5 h-0.5 bg-green-300 rounded-full animate-float-particle-2"></div>
                <div className="absolute bottom-1/4 left-0 w-0.5 h-0.5 bg-green-500 rounded-full animate-float-particle-3"></div>
              </div>
            )}

            {progress?.status === "in_progress" && (
              <div className="absolute -inset-4 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-1 h-1 bg-orange-400 rounded-full animate-float-particle-1"></div>
                <div className="absolute bottom-0 left-1/4 w-0.5 h-0.5 bg-orange-300 rounded-full animate-float-particle-2"></div>
              </div>
            )}

            {/* Sprite Image */}
            <img
              src={spriteUrl}
              alt={data.title}
              className={`w-max h-max object-contain z-20 drop-shadow-lg hover:drop-shadow-xl transition-all duration-300 ${glowEffect}`}
              style={{
                filter: selected
                  ? `${brightness} brightness(1.15) saturate(1.3)`
                  : brightness,
              }}
            />

            {/* Floating Label with Enhanced Animation */}
            <div
              className={`absolute -bottom-8 left-1/2 transform -translate-x-1/2 ${selected ? "scale-105 -translate-y-1" : ""} transition-all duration-300`}
            >
              <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1 shadow-lg hover:shadow-xl transition-shadow duration-200">
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
                <div className="bg-black/60 rounded-full p-3 backdrop-blur-sm animate-pulse">
                  <Lock className="h-6 w-6 text-white drop-shadow-sm" />
                </div>
              </div>
            )}

            {/* Hover Effect for Unlocked Nodes */}
            {isUnlocked && (
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 bg-gradient-to-t from-blue-400/10 to-transparent rounded-full blur-sm" />
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

  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const selected = params.nodes[0];
      const newSelectedNode = (selected as unknown as Node<MapNode>) || null;

      setSelectedNode(newSelectedNode);

      // Animate panel resize based on selection
      if (newSelectedNode && rightPanelRef.current && leftPanelRef.current) {
        // Node selected: expand right panel to 65%, shrink left to 35%
        rightPanelRef.current.resize(65);
        leftPanelRef.current.resize(35);

        // Center the selected node accounting for the expanded panel
        setTimeout(() => {
          if (reactFlowInstance && newSelectedNode) {
            // Get the current viewport
            const viewport = reactFlowInstance.getViewport();

            // Calculate the center position accounting for the 35/65 panel split
            // We want to center in the left panel (35% of total width) but shift slightly left for visual balance
            const containerRect = document
              .querySelector(".react-flow")
              ?.getBoundingClientRect();
            if (containerRect) {
              const leftPanelWidth = containerRect.width * 0.35; // 35% for left panel after resize
              const targetX = leftPanelWidth * 0.5; // Center in the left panel
              const targetY = containerRect.height * 0.5; // Center vertically

              // Use fitView to center on the selected node with padding
              reactFlowInstance.fitView({
                nodes: [{ id: newSelectedNode.id }],
                duration: 600,
                padding: 0.15,
                // Custom center point accounting for panel layout
                minZoom: viewport.zoom * 0.9, // Slightly zoom out for better view
                maxZoom: viewport.zoom * 1.1, // Allow slight zoom in
              });
            }
          }
        }, 350); // Wait for panel animation to complete
      } else if (
        !newSelectedNode &&
        rightPanelRef.current &&
        leftPanelRef.current
      ) {
        // Node deselected: restore default sizes (70% left, 30% right)
        leftPanelRef.current.resize(70);
        rightPanelRef.current.resize(30);
      }
    },
    [reactFlowInstance]
  );

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel
        ref={leftPanelRef}
        defaultSize={70}
        minSize={35}
        maxSize={85}
        className="transition-all duration-300 ease-in-out"
      >
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
      <ResizablePanel
        ref={rightPanelRef}
        defaultSize={30}
        minSize={15}
        maxSize={65}
        className="transition-all duration-300 ease-in-out"
      >
        <div className="h-full flex flex-col overflow-hidden">
          <NodeViewPanel
            selectedNode={selectedNode}
            onProgressUpdate={loadAllProgress}
            isNodeUnlocked={
              selectedNode ? isNodeUnlocked(selectedNode.id) : true
            }
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

// Wrapper component that provides ReactFlow context
export function MapViewerWithProvider({ map }: MapViewerProps) {
  return (
    <ReactFlowProvider>
      <style jsx global>{`
        /* Floating Island Animations */
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(1deg);
          }
        }

        @keyframes float-success {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
            filter: brightness(1) saturate(1.2) hue-rotate(0deg);
          }
          50% {
            transform: translateY(-12px) rotate(-1deg);
            filter: brightness(1.1) saturate(1.3) hue-rotate(5deg);
          }
        }

        @keyframes float-failed {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
            filter: brightness(0.9) saturate(1.1);
          }
          50% {
            transform: translateY(-6px) rotate(0.5deg);
            filter: brightness(0.95) saturate(1.2);
          }
        }

        @keyframes float-submitted {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
            filter: brightness(1) saturate(1.1) hue-rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(-0.5deg);
            filter: brightness(1.05) saturate(1.2) hue-rotate(-5deg);
          }
        }

        @keyframes float-progress {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg) scale(1);
            filter: brightness(1) saturate(1.1);
          }
          25% {
            transform: translateY(-5px) rotate(0.5deg) scale(1.02);
            filter: brightness(1.05) saturate(1.2);
          }
          75% {
            transform: translateY(-5px) rotate(-0.5deg) scale(0.98);
            filter: brightness(1.03) saturate(1.15);
          }
        }

        @keyframes float-particle-1 {
          0%,
          100% {
            transform: translateY(0px) translateX(0px) scale(1);
            opacity: 0.6;
          }
          33% {
            transform: translateY(-20px) translateX(10px) scale(1.2);
            opacity: 1;
          }
          66% {
            transform: translateY(-40px) translateX(-5px) scale(0.8);
            opacity: 0.4;
          }
        }

        @keyframes float-particle-2 {
          0%,
          100% {
            transform: translateY(0px) translateX(0px) scale(0.8);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-30px) translateX(-15px) scale(1.1);
            opacity: 0.8;
          }
        }

        @keyframes float-particle-3 {
          0%,
          100% {
            transform: translateY(0px) translateX(0px) scale(1);
            opacity: 0.5;
          }
          40% {
            transform: translateY(-25px) translateX(20px) scale(1.3);
            opacity: 0.9;
          }
          80% {
            transform: translateY(-50px) translateX(5px) scale(0.6);
            opacity: 0.3;
          }
        }

        @keyframes shadow-pulse {
          0%,
          100% {
            transform: translateX(-50%) scale(1);
            opacity: 0.2;
          }
          50% {
            transform: translateX(-50%) scale(1.1);
            opacity: 0.3;
          }
        }

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }

        /* Apply animations */
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }

        .animate-float-success {
          animation: float-success 3.5s ease-in-out infinite;
        }

        .animate-float-failed {
          animation: float-failed 5s ease-in-out infinite;
        }

        .animate-float-submitted {
          animation: float-submitted 4.5s ease-in-out infinite;
        }

        .animate-float-progress {
          animation: float-progress 2.5s ease-in-out infinite;
        }

        .animate-float-particle-1 {
          animation: float-particle-1 6s ease-in-out infinite;
        }

        .animate-float-particle-2 {
          animation: float-particle-2 8s ease-in-out infinite 1s;
        }

        .animate-float-particle-3 {
          animation: float-particle-3 7s ease-in-out infinite 2s;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        /* Enhanced hover effects for floating islands */
        .react-flow__node:hover .animate-float {
          animation-duration: 2s;
        }

        .react-flow__node:hover .animate-float-success {
          animation-duration: 2s;
        }

        .react-flow__node:hover .animate-float-progress {
          animation-duration: 1.5s;
        }
      `}</style>
      <MapViewer map={map} />
    </ReactFlowProvider>
  );
}
