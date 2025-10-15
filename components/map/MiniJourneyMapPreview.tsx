"use client";

import React, { useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GameNode } from "./MapViewer/components/GameNode";
import { TextNode } from "./MapEditor/components/TextNode";
import { CommentNode } from "./CommentNode";
import FloatingEdge from "./FloatingEdge";
import { getMapWithNodes } from "@/lib/supabase/maps";
import { Loader2, Map as MapIcon, Sparkles, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MiniJourneyMapPreviewProps {
  mapId: string;
  onClick?: () => void;
}

interface MapNode {
  id: string;
  title: string;
  description?: string;
  metadata?: any;
  node_type?: string;
  node_paths_source?: any[];
}

interface LearningMap {
  id: string;
  title: string;
  map_nodes: MapNode[];
}

function MiniMapPreviewContent({ mapId, onClick }: MiniJourneyMapPreviewProps) {
  const [map, setMap] = useState<LearningMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const fetchMap = async () => {
      try {
        const data = await getMapWithNodes(mapId);
        if (data) {
          setMap(data as any);
        }
      } catch (error) {
        console.error("Error fetching map:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMap();
  }, [mapId]);

  useEffect(() => {
    if (!map) return;

    // Transform map nodes to ReactFlow nodes
    const transformedNodes = map.map_nodes.map((node) => {
      let nodeType = "default";
      if (node.node_type === "text") {
        nodeType = "text";
      } else if (node.node_type === "comment") {
        nodeType = "comment";
      }

      return {
        id: node.id,
        type: nodeType,
        data: node as any,
        position: (node.metadata as any)?.position || {
          x: Math.random() * 400,
          y: Math.random() * 400,
        },
        draggable: false,
        connectable: false,
        selectable: false,
        // Remove background and border to match MapViewer style
        style: {
          backgroundColor: "transparent",
          border: "none",
          padding: 0,
        },
      } as Node;
    });

    // Transform paths to edges
    const transformedEdges: Edge[] = [];
    map.map_nodes.forEach((node) => {
      node.node_paths_source?.forEach((path: any) => {
        transformedEdges.push({
          id: path.id,
          type: "floating",
          source: path.source_node_id,
          target: path.destination_node_id,
          animated: false,
          style: {
            stroke: "#6b7280",
            strokeWidth: 2,
            opacity: 0.6,
          },
        });
      });
    });

    setNodes(transformedNodes);
    setEdges(transformedEdges);
  }, [map, setNodes, setEdges]);

  const nodeTypes = {
    default: ({ data }: { data: any }) => (
      <GameNode
        data={data}
        selected={false}
        isUnlocked={true}
        isCompleted={false}
        requirement={null}
        isTeamMap={false}
        isInstructorOrTA={false}
        allSubmissions={[]}
      />
    ),
    text: ({ data }: { data: any }) => (
      <TextNode
        data={data}
        selected={false}
        allowEdit={false}
        allowDoubleClick={false}
        showHint={false}
      />
    ),
    comment: ({ data }: { data: any }) => (
      <CommentNode
        data={data}
        selected={false}
        userRole="student"
        allowEdit={false}
        allowDoubleClick={false}
        showHint={false}
        showEditButton={false}
      />
    ),
  };

  const edgeTypes = {
    floating: FloatingEdge,
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col gap-4 p-6 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-lg">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 bg-white/20" />
          <Skeleton className="h-4 w-32 bg-white/20" />
        </div>
        <div className="flex-1 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
                <div className="absolute inset-0 animate-ping">
                  <Sparkles className="h-12 w-12 text-purple-300 opacity-40" />
                </div>
              </div>
              <p className="text-sm text-white/70 font-medium">
                Loading your journey...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!map) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-lg">
        <div className="text-center">
          <MapIcon className="h-12 w-12 mx-auto mb-3 text-white/50" />
          <p className="text-sm text-white/70 font-medium">
            No journey map available
          </p>
        </div>
      </div>
    );
  }

  const nodeCount = map.map_nodes.length;

  return (
    <div className="w-full h-full relative group overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-200 via-blue-100 to-indigo-200 dark:from-slate-900 dark:via-indigo-950 dark:to-purple-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-300/20 via-transparent to-transparent animate-pulse-slow" />
      </div>

      {/* Map Canvas - with extra padding at bottom for info overlay */}
      <div className="absolute inset-0" style={{ paddingBottom: '100px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={{
            padding: 0.15,
            includeHiddenNodes: false,
            maxZoom: 0.9,
            minZoom: 0.5,
          }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            gap={20}
            size={1.5}
            color="#cbd5e1"
            style={{ opacity: 0.2 }}
          />
        </ReactFlow>
      </div>

      {/* Click overlay */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClick}>
        {/* Top gradient fade */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/10 to-transparent pointer-events-none" />

        {/* Bottom info section with strong gradient */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 via-black/50 to-transparent pointer-events-none" />

        {/* Info card */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 pointer-events-none">
          <div className="max-w-full space-y-3 md:space-y-4">
            {/* Header row with title and badges */}
            <div className="flex items-start justify-between gap-3">
              {/* Title - takes available space */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-black text-lg md:text-xl lg:text-2xl tracking-tight drop-shadow-2xl leading-tight line-clamp-2">
                  {map.title}
                </h3>
              </div>

              {/* Badges - right aligned, don't shrink */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md rounded-full px-2.5 py-1 border border-white/30 shadow-lg">
                  <MapIcon className="h-3 w-3 md:h-3.5 md:w-3.5 text-white flex-shrink-0" />
                  <span className="text-white text-xs font-bold tabular-nums">
                    {nodeCount}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-amber-500/90 backdrop-blur-md rounded-full px-2.5 py-1 shadow-lg">
                  <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5 text-white flex-shrink-0" />
                  <span className="text-white text-xs font-bold">Live</span>
                </div>
              </div>
            </div>

            {/* Action row */}
            <div className="flex items-center justify-between">
              {/* Left side - could add more info here */}
              <div className="flex-1">
                {/* Placeholder for additional info if needed */}
              </div>

              {/* Right side - CTA button */}
              <div className="flex-shrink-0 pointer-events-auto">
                <button className="bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md rounded-full px-4 py-2 md:px-5 md:py-2.5 flex items-center gap-2 shadow-xl ring-1 ring-white/30 hover:ring-white/50 transition-all duration-200 group/btn border border-white/20">
                  <span className="text-white font-semibold text-sm md:text-base">
                    Explore Journey
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4 text-white group-hover/btn:translate-x-0.5 transition-transform duration-200 flex-shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Hover ring effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none">
          <div className="absolute inset-0 ring-4 ring-inset ring-purple-400/40 shadow-[inset_0_0_60px_rgba(168,85,247,0.15)]" />
        </div>

        {/* Animated sparkles on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <Sparkles
              key={i}
              className="absolute text-white/30 animate-twinkle"
              style={{
                left: `${15 + i * 12}%`,
                top: `${20 + (i % 3) * 20}%`,
                width: "16px",
                height: "16px",
                animationDelay: `${i * 0.2}s`,
                animationDuration: `${2 + (i % 3) * 0.5}s`,
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0;
            transform: scale(0.8) rotate(0deg);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.2) rotate(180deg);
          }
        }
        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}

export function MiniJourneyMapPreview({
  mapId,
  onClick,
}: MiniJourneyMapPreviewProps) {
  return (
    <ReactFlowProvider>
      <MiniMapPreviewContent mapId={mapId} onClick={onClick} />
    </ReactFlowProvider>
  );
}
