"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Controls,
  ReactFlow,
  Background,
  MiniMap,
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
import {
  getStudentProgress,
  loadAllProgress as loadMapProgress,
  type StudentProgress,
} from "@/lib/supabase/progresses";
import { MapNode } from "@/types/map";
import { createClient } from "@/utils/supabase/client";
import { TextNode } from "@/components/map/MapEditor/components/TextNode";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  Lock,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import FloatingEdge from "@/components/map/FloatingEdge";

interface MapViewerProps {
  map: FullLearningMap;
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
    if (!progress) return "#94a3b8"; // Default slate-400

    switch (progress.status) {
      case "passed":
        return "#22c55e"; // Green-500
      case "failed":
        return "#ef4444"; // Red-500
      case "submitted":
        return "#3b82f6"; // Blue-500
      case "in_progress":
        return "#f59e0b"; // Amber-500
      default:
        return "#94a3b8"; // Slate-400
    }
  },
  style: {
    transform: "scale(0.8)",
    transformOrigin: "bottom right",
  },
  nodeStrokeColor: "#ffffff",
  bgColor: "rgba(15, 23, 42, 0.8)", // slate-900 with opacity
  maskColor: "rgba(255, 255, 255, 0.1)",
  maskStrokeColor: "#ffffff",
  maskStrokeWidth: 1,
  pannable: true,
  zoomable: true,
  ariaLabel: "Learning map overview",
  offsetScale: 5,
};

export function MapViewer({ map }: MapViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [progressMap, setProgressMap] = useState<
    Record<string, StudentProgress>
  >({});
  const [isNavigationExpanded, setIsNavigationExpanded] = useState(false);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const reactFlowInstance = useReactFlow();

  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const leftPanelRef = useRef<ImperativePanelHandle>(null);

  // Toggle panel minimize/maximize
  const togglePanelSize = useCallback(() => {
    if (!rightPanelRef.current || !leftPanelRef.current) return;

    if (isPanelMinimized) {
      // Maximize: restore to appropriate size based on selection
      if (selectedNode) {
        rightPanelRef.current.resize(65);
        leftPanelRef.current.resize(35);
      } else {
        rightPanelRef.current.resize(30);
        leftPanelRef.current.resize(70);
      }
      setIsPanelMinimized(false);
    } else {
      // Minimize: shrink right panel to minimal size
      rightPanelRef.current.resize(5);
      leftPanelRef.current.resize(95);
      setIsPanelMinimized(true);
    }
  }, [isPanelMinimized, selectedNode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!reactFlowInstance) return;

      switch (event.key) {
        case "f":
        case "F":
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            reactFlowInstance.fitView({ duration: 600, padding: 0.1 });
          }
          break;
        case "Escape":
          setSelectedNode(null);
          if (rightPanelRef.current && leftPanelRef.current) {
            leftPanelRef.current.resize(70);
            rightPanelRef.current.resize(30);
          }
          break;
        case "Tab":
          if (event.shiftKey) {
            // Navigate to previous unlocked node
            event.preventDefault();
            navigateToAdjacentNode(-1);
          } else {
            // Navigate to next unlocked node
            event.preventDefault();
            navigateToAdjacentNode(1);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reactFlowInstance, selectedNode]);

  // Function to navigate to adjacent unlocked nodes
  const navigateToAdjacentNode = (direction: 1 | -1) => {
    // Only navigate through learning nodes, not text nodes
    const learningNodes = map.map_nodes.filter(
      (node) => (node as any)?.node_type !== "text"
    );
    const unlockedNodes = learningNodes.filter((node) =>
      isNodeUnlocked(node.id)
    );
    if (unlockedNodes.length === 0) return;

    const currentIndex = selectedNode
      ? unlockedNodes.findIndex((node) => node.id === selectedNode.id)
      : -1;

    let nextIndex;
    if (currentIndex === -1) {
      nextIndex = direction === 1 ? 0 : unlockedNodes.length - 1;
    } else {
      nextIndex =
        (currentIndex + direction + unlockedNodes.length) %
        unlockedNodes.length;
    }

    const nextNode = unlockedNodes[nextIndex];
    if (nextNode && reactFlowInstance) {
      // Select the node
      reactFlowInstance.setCenter(
        (nextNode.metadata as any)?.position?.x || 0,
        (nextNode.metadata as any)?.position?.y || 0,
        { zoom: 1.2, duration: 600 }
      );

      // Update selection
      setSelectedNode({
        id: nextNode.id,
        data: nextNode,
        position: (nextNode.metadata as any)?.position || { x: 0, y: 0 },
      });
    }
  };

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

    try {
      console.log("🗺️ [MapViewer] Loading all progress for map:", map.id);

      // Use the new API-based approach to load all progress at once
      const progressData = await loadMapProgress(map.id);

      console.log(
        "✅ [MapViewer] Loaded progress for",
        Object.keys(progressData).length,
        "nodes"
      );
      setProgressMap(progressData);
    } catch (error) {
      console.error("❌ [MapViewer] Error loading all progress:", error);
      setProgressMap({}); // Fallback to empty progress
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadAllProgress();
    }
  }, [currentUser, map]);

  // Check if node is unlocked based on prerequisites
  const isNodeUnlocked = (nodeId: string): boolean => {
    // Find the node data
    const nodeData = map.map_nodes.find((n) => n.id === nodeId);

    // Text nodes are always "unlocked" (visible) since they're just annotations
    if ((nodeData as any)?.node_type === "text") {
      return true;
    }

    // Find all nodes that have paths leading to this node
    const prerequisites = map.map_nodes.filter((node) =>
      node.node_paths_source.some((path) => path.destination_node_id === nodeId)
    );

    // If no prerequisites, node is unlocked (starting node)
    if (prerequisites.length === 0) return true;

    // Check if ALL prerequisites are passed OR submitted (pending grade)
    return prerequisites.every((prereq) => {
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
      data: MapNode & { progress?: StudentProgress };
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
        <div className="relative inline-block group w-fit h-fit">
          {/* Connection handles - visible but non-interactive in viewer mode */}
          <Handle
            type="target"
            position={Position.Top}
            className="w-3 h-3 bg-blue-500/20 border-2 border-blue-400/50 shadow-sm opacity-60"
            style={{ pointerEvents: "none" }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            className="w-2 h-2 bg-green-500/20 border-2 border-green-400/50 shadow-sm opacity-60"
            style={{ pointerEvents: "none" }}
          />
          <Handle
            type="target"
            position={Position.Left}
            className="w-2 h-2 bg-blue-500/20 border-2 border-blue-400/50 shadow-sm opacity-60"
            style={{ pointerEvents: "none" }}
          />
          <Handle
            type="source"
            position={Position.Right}
            className="w-2 h-2 bg-green-500/20 border-2 border-green-400/50 shadow-sm opacity-60"
            style={{ pointerEvents: "none" }}
          />
          <div
            className={`relative ${selected ? "scale-110 translate-y-3" : ""} transition-transform duration-300 cursor-pointer ${animationClass}`}
            role="button"
            tabIndex={isUnlocked ? 0 : -1}
            aria-label={`${data.title} - ${isUnlocked ? "Available" : "Locked"} - Difficulty: ${data.difficulty} stars`}
            aria-describedby={progress ? `progress-${data.id}` : undefined}
          >
            {/* Selection Shadow - Enhanced for flying islands */}
            {selected && (
              <div className="absolute inset-0 -z-10">
                {/* Main shadow image */}
                <img
                  src={spriteUrl}
                  alt=""
                  className="w-auto h-auto object-contain absolute opacity-60"
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

            {/* Sprite Image */}
            <img
              src={spriteUrl}
              alt={data.title}
              className={`w-auto h-auto object-contain z-20 drop-shadow-lg hover:drop-shadow-xl transition-all duration-300 ${glowEffect}`}
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

            {/* Screen Reader Description */}
            {progress && (
              <div id={`progress-${data.id}`} className="sr-only">
                Progress: {progress.status.replace("_", " ")}
                {progress.submitted_at &&
                  `, Submitted: ${new Date(progress.submitted_at).toLocaleDateString()}`}
              </div>
            )}
          </div>
        </div>
      );
    },
    text: ({
      data,
      selected,
    }: {
      data: MapNode & { node_type?: string };
      selected?: boolean;
    }) => {
      // Text nodes are read-only in the viewer, so no onDataChange
      return (
        <TextNode
          data={data}
          selected={selected}
          // No onDataChange prop since this is viewer mode
        />
      );
    },
  };

  useEffect(() => {
    const transformedNodes = map.map_nodes.map((node) => {
      // Determine node type - check for node_type property
      const nodeType = (node as any)?.node_type === "text" ? "text" : "default";

      return {
        id: node.id,
        type: nodeType,
        data: { ...node, progress: progressMap[node.id] },
        position: (node.metadata as any)?.position || {
          x: Math.random() * 400,
          y: Math.random() * 400,
        },
        draggable: false, // Disable dragging in viewer mode
        connectable: false,
        selectable: true,
        selected: selectedNode?.id === node.id,
        style: {
          backgroundColor: "#ffffff00",
          border: "2px solid #cccccc00",
          flexGrow: 1,
          aspectRatio: "1 / 1",
        },
      };
    });

    const transformedEdges: Edge[] = [];
    map.map_nodes.forEach((node) => {
      node.node_paths_source.forEach((path) => {
        // Add visual indicators for path states
        const sourceProgress = progressMap[path.source_node_id];
        const isPathActive =
          sourceProgress?.status === "passed" ||
          sourceProgress?.status === "in_progress" ||
          sourceProgress?.status === "submitted";

        transformedEdges.push({
          id: path.id,
          type: "floating",
          source: path.source_node_id,
          target: path.destination_node_id,
          animated: isPathActive,
          style: {
            stroke: isPathActive ? "#10b981" : "#6b7280",
            strokeWidth: isPathActive ? 3 : 2,
            opacity: isPathActive ? 1 : 0.6,
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
      const newSelectedNode = selected || null;

      setSelectedNode(newSelectedNode);

      // Don't resize panels if currently minimized - let user control that
      if (isPanelMinimized) return;

      // Animate panel resize based on selection
      if (newSelectedNode && rightPanelRef.current && leftPanelRef.current) {
        // Only resize if panel is not minimized
        if (!isPanelMinimized) {
          // Node selected: expand right panel to 45%, shrink left to 55%
          rightPanelRef.current.resize(45);
          leftPanelRef.current.resize(55);
        }

        // Center the selected node accounting for the expanded panel
        setTimeout(() => {
          if (reactFlowInstance && newSelectedNode) {
            // Get the current viewport
            const viewport = reactFlowInstance.getViewport();

            // Calculate the center position accounting for the 55/45 panel split
            // We want to center in the left panel (55% of total width) but shift slightly left for visual balance
            const containerRect = document
              .querySelector(".react-flow")
              ?.getBoundingClientRect();
            if (containerRect) {
              const leftPanelWidth = containerRect.width * 0.55; // 55% for left panel after resize
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
    [reactFlowInstance, isPanelMinimized]
  );

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel
        ref={leftPanelRef}
        defaultSize={70}
        minSize={35}
        maxSize={85}
        className="transition-all duration-300 ease-in-out relative flex flex-col"
      >
        {/* Map Container - Takes up full space */}
        <div className="flex-1">
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
              {...miniMapConfig}
              style={{
                ...miniMapConfig.style,
                background: "rgba(255, 255, 255, 0.9)",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
              }}
            />
          </ReactFlow>
        </div>

        {/* Navigation Guide & Progress Stats - Bottom */}
        {isNavigationExpanded && (
          <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Info className="h-4 w-4" />
                Navigation Guide & Progress
              </h3>
              <button
                onClick={() => setIsNavigationExpanded(false)}
                className="p-1 hover:bg-muted/50 rounded transition-colors"
                aria-label="Hide navigation guide"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Progress Statistics */}
            <div className="mb-4 bg-muted/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-2 font-medium">
                Progress Overview
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>
                    {
                      Object.values(progressMap).filter(
                        (p) => p.status === "passed"
                      ).length
                    }{" "}
                    Completed
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>
                    {
                      Object.values(progressMap).filter(
                        (p) => p.status === "submitted"
                      ).length
                    }{" "}
                    Submitted
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <span>
                    {
                      Object.values(progressMap).filter(
                        (p) => p.status === "in_progress"
                      ).length
                    }{" "}
                    In Progress
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <span className="text-muted-foreground">
                    {map.map_nodes.length} Total
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Instructions */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Select Node</span>
                  <span className="text-muted-foreground">Click</span>
                </div>
                <div className="flex justify-between">
                  <span>Next Node</span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                    Tab
                  </kbd>
                </div>
                <div className="flex justify-between">
                  <span>Previous Node</span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                    Shift+Tab
                  </kbd>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Pan Map</span>
                  <span className="text-muted-foreground">Drag</span>
                </div>
                <div className="flex justify-between">
                  <span>Zoom</span>
                  <span className="text-muted-foreground">Mouse Wheel</span>
                </div>
                <div className="flex justify-between">
                  <span>Deselect</span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                    Esc
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toggle Navigation Guide Button - Fixed Bottom Right */}
        <button
          onClick={() => setIsNavigationExpanded(!isNavigationExpanded)}
          className="absolute bottom-4 right-4 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-2 shadow-lg hover:bg-muted/50 transition-colors"
          aria-expanded={isNavigationExpanded}
          title={
            isNavigationExpanded
              ? "Hide navigation guide"
              : "Show navigation guide"
          }
        >
          {isNavigationExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
        </button>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        ref={rightPanelRef}
        defaultSize={30}
        minSize={5}
        maxSize={65}
        className="transition-all duration-300 ease-in-out relative"
      >
        {/* Panel Minimize/Maximize Button */}
        <button
          onClick={togglePanelSize}
          className="absolute top-2 right-2 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-2 shadow-lg hover:bg-muted/50 transition-colors"
          title={isPanelMinimized ? "Maximize panel" : "Minimize panel"}
          aria-label={isPanelMinimized ? "Maximize panel" : "Minimize panel"}
        >
          {isPanelMinimized ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <div className="h-full flex flex-col overflow-hidden">
          {!isPanelMinimized && (
            <NodeViewPanel
              key={selectedNode?.id || "no-selection"} // Force remount on node change
              selectedNode={selectedNode}
              mapId={map.id}
              onProgressUpdate={loadAllProgress}
              isNodeUnlocked={
                selectedNode ? isNodeUnlocked(selectedNode.id) : true
              }
            />
          )}
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
        /* ================================
     Tunables
     ================================ */
        :root {
          --island-ease: cubic-bezier(0.33, 1, 0.68, 1);
          --island-amp: 6px; /* vertical travel of islands */
          --island-amp-sm: 3px; /* for micro motions (rope/knot) */
          --island-rot: 0.6deg;

          --edge-active: #10b981; /* active path color */
          --edge-idle: #475569; /* idle path color (slate-600) */
          --edge-width: 2.25;
          --edge-width-active: 2.75;
          --edge-opacity: 0.55;
          --edge-opacity-active: 0.85;
        }

        /* ================================
     Islands — calmer motion
     ================================ */
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(calc(-1 * var(--island-amp)))
              rotate(var(--island-rot));
          }
        }
        @keyframes float-success {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
            filter: brightness(1) saturate(1.12);
          }
          50% {
            transform: translateY(calc(-1.2 * var(--island-amp)))
              rotate(calc(-1 * var(--island-rot)));
            filter: brightness(1.04) saturate(1.16);
          }
        }
        @keyframes float-failed {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
            filter: brightness(0.98) saturate(1.05);
          }
          50% {
            transform: translateY(calc(-0.7 * var(--island-amp))) rotate(0.3deg);
            filter: brightness(0.99) saturate(1.08);
          }
        }
        @keyframes float-submitted {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
            filter: brightness(1) saturate(1.08);
          }
          50% {
            transform: translateY(calc(-1 * var(--island-amp))) rotate(-0.3deg);
            filter: brightness(1.02) saturate(1.12);
          }
        }
        @keyframes float-progress {
          0%,
          100% {
            transform: translateY(0) rotate(0deg) scale(1);
            filter: brightness(1) saturate(1.08);
          }
          50% {
            transform: translateY(calc(-0.8 * var(--island-amp))) rotate(0.3deg)
              scale(1.01);
            filter: brightness(1.01) saturate(1.12);
          }
        }

        .animate-float {
          animation: float 5s var(--island-ease) infinite;
        }
        .animate-float-success {
          animation: float-success 5.5s var(--island-ease) infinite;
        }
        .animate-float-failed {
          animation: float-failed 6s var(--island-ease) infinite;
        }
        .animate-float-submitted {
          animation: float-submitted 5.5s var(--island-ease) infinite;
        }
        .animate-float-progress {
          animation: float-progress 4.5s var(--island-ease) infinite;
        }

        /* Hover tempo: barely faster */
        .react-flow__node:hover .animate-float,
        .react-flow__node:hover .animate-float-success,
        .react-flow__node:hover .animate-float-progress {
          animation-duration: 80%;
        }

        /* ================================
     Bridge / Rope — subtle micro-motion
     ================================ */
        @keyframes float-bridge {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(calc(-1 * var(--island-amp-sm)));
          }
        }
        @keyframes rope-sway {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(1.2deg);
          }
        }
        @keyframes float-knot {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(calc(-0.5 * var(--island-amp-sm))) scale(1.03);
          }
        }
        .animate-float-bridge {
          animation: float-bridge 7s var(--island-ease) infinite;
        }
        .animate-float-rope {
          animation: rope-sway 6.5s var(--island-ease) infinite;
        }
        .animate-float-knot {
          animation: float-knot 6s var(--island-ease) infinite;
        }

        /* ================================
     Edges — no dashes, no dots
     ================================ */
        /* Kill the default dashed animation that looks like dots */
        .react-flow__edge-path.animated {
          stroke-dasharray: none !important;
          animation: none !important;
        }
        /* Smoother, consistent look */
        .react-flow__edge-path {
          stroke-linecap: round;
          transition:
            stroke 200ms ease,
            opacity 200ms ease,
            stroke-width 200ms ease;
        }
        /* Use className on edges to toggle these: edge--active / edge--idle */
        .edge--idle .react-flow__edge-path {
          stroke: var(--edge-idle);
          stroke-width: var(--edge-width);
          opacity: var(--edge-opacity);
        }
        .edge--active .react-flow__edge-path {
          stroke: var(--edge-active);
          stroke-width: var(--edge-width-active);
          opacity: var(--edge-opacity-active);
        }

        /* ================================
     Focus / Accessibility
     ================================ */
        .react-flow__node:focus {
          outline: 3px solid #3b82f6;
          outline-offset: 2px;
        }
        .react-flow__edge:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 1px;
        }

        @media (prefers-contrast: high) {
          .react-flow__edge {
            stroke-width: 4px !important;
          }
          .react-flow__node {
            border: 2px solid currentColor !important;
          }
        }

        @media (min-resolution: 2dppx) {
          /* High DPI adjustments could go here if needed */
        }

        /* Reduced motion: stop all animations */
        @media (prefers-reduced-motion: reduce) {
          .animate-float,
          .animate-float-success,
          .animate-float-failed,
          .animate-float-submitted,
          .animate-float-progress,
          .animate-float-bridge,
          .animate-float-rope,
          .animate-float-knot {
            animation: none !important;
          }
          .react-flow__edge-path {
            transition: none !important;
          }
        }
      `}</style>

      <MapViewer map={map} />
    </ReactFlowProvider>
  );
}
