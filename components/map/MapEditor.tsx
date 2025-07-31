"use client";

import React, { useEffect, useCallback, useState, useMemo } from "react";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  OnNodesDelete,
  OnEdgesDelete,
  NodeDragHandler,
  OnSelectionChangeParams,
  Handle,
  Position,
  MarkerType,
  MiniMap,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { FullLearningMap } from "@/lib/supabase/maps";
import { MapNode } from "@/types/map";
import { Plus } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { NodeEditorPanel } from "./NodeEditorPanel";
import FloatingEdge, { FloatingEdgeEdit } from "./FloatingEdge";

// Type definitions
type AppNode = Node<MapNode, "default">;
type AppEdge = Edge;

interface MapEditorProps {
  map: FullLearningMap;
  onMapChange: (updatedMap: FullLearningMap) => void;
}

// Constants
const INITIAL_NODES: AppNode[] = [];
const INITIAL_EDGES: AppEdge[] = [];

const EDGE_TYPES = {
  floating: FloatingEdgeEdit,
};

const EDGE_STYLE = {
  stroke: "#83460d",
  strokeWidth: 2,
};

const NODE_STYLE = {
  backgroundColor: "#ffffff00",
  border: "2px solid #cccccc00",
  flexGrow: 1,
  aspectRatio: "1 / 1",
} as const;

// Utility functions
const generateTempId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random()}`;

const getRandomPosition = () => ({
  x: Math.random() * 400,
  y: Math.random() * 400,
});

// Custom node component
const CustomNode = ({
  data,
  selected,
}: {
  data: MapNode;
  selected?: boolean;
}) => {
  const spriteUrl = data.sprite_url || "/islands/crystal.png";

  const nodeClassName = `relative ${selected ? "scale-110" : ""} transition-transform duration-200`;
  const imageFilter = selected
    ? "brightness(1.1) saturate(1.2)"
    : "brightness(1)";

  return (
    <>
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-5 h-5 bg-blue-500 border-2 border-white shadow-md"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-green-500 border-2 border-white shadow-md"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500 border-2 border-white shadow-md"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-500 border-2 border-white shadow-md"
      />

      <div className={nodeClassName}>
        {selected && (
          <div className="absolute -inset-2 rounded-full border-4 border-blue-400 animate-pulse" />
        )}

        <img
          src={spriteUrl}
          alt={data.title}
          className="w-max h-max object-contain drop-shadow-lg hover:drop-shadow-xl transition-all duration-200"
          style={{ filter: imageFilter }}
        />

        {/* Node label */}
        <div
          className={`absolute -top-8 -right-10 transform ${selected ? "scale-105" : ""} transition-all duration-200`}
        >
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1 shadow-lg">
            <div className="text-xs font-bold text-gray-800 text-center whitespace-normal max-w-24 truncate">
              {data.title}
            </div>
            <div className="text-xs text-gray-500 text-center">
              ⭐ {data.difficulty}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export function MapEditor({ map, onMapChange }: MapEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedNode, setSelectedNode] = useState<AppNode | null>(null);
  const { toast } = useToast();

  // Track quiz questions for batch operations
  const [pendingQuizQuestions, setPendingQuizQuestions] = useState<
    Record<string, QuizQuestion[]>
  >({});

  // Memoized node types
  const nodeTypes = useMemo(
    () => ({
      default: CustomNode,
    }),
    []
  );

  // Transform map data to React Flow format
  useEffect(() => {
    const transformedNodes: AppNode[] = map.map_nodes.map((node) => ({
      id: node.id,
      type: "default",
      data: node,
      position: (node.metadata as any)?.position || getRandomPosition(),
      draggable: true,
      connectable: true,
      selectable: true,
      selected: selectedNode?.id === node.id,
      style: NODE_STYLE,
    }));

    const transformedEdges: AppEdge[] = [];
    map.map_nodes.forEach((node) => {
      node.node_paths_source?.forEach((path) => {
        transformedEdges.push({
          id: path.id,
          source: path.source_node_id,
          target: path.destination_node_id,
          type: "floating",
          markerEnd: { type: MarkerType.ArrowClosed },
          style: EDGE_STYLE,
        });
      });
    });

    setNodes(transformedNodes);
    setEdges(transformedEdges);
  }, [map, selectedNode, setNodes, setEdges]);

  // Add node handler
  const handleAddNode = useCallback(() => {
    const tempId = generateTempId("temp_node");
    const newNodeData: MapNode & {
      node_paths_source: any[];
      node_paths_destination: any[];
      node_content: any[];
      node_assessments: any[];
    } = {
      id: tempId,
      map_id: map.id,
      title: "New Node",
      instructions: "Add instructions...",
      difficulty: 1,
      sprite_url: null,
      metadata: {
        position: { x: 100, y: 100 },
        temp_id: tempId, // FIXED: Include temp ID in metadata for reliable mapping
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      node_paths_source: [],
      node_paths_destination: [],
      node_content: [],
      node_assessments: [],
    };

    const newNode: AppNode = {
      id: tempId,
      position: { x: 100, y: 100 },
      data: newNodeData,
      type: "default",
      draggable: true,
      connectable: true,
      selectable: true,
    };

    setNodes((nds) => [...nds, newNode]);

    const updatedMap = {
      ...map,
      map_nodes: [...map.map_nodes, newNodeData],
    };
    onMapChange(updatedMap);

    toast({ title: "Node Added! (Save to persist)" });
  }, [map, onMapChange, setNodes, toast]);

  // Connection handler
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      // Validate connection
      if (params.source === params.target) {
        toast({
          title: "Cannot connect node to itself",
          variant: "destructive",
        });
        return;
      }

      const existingConnection = edges.find(
        (edge) => edge.source === params.source && edge.target === params.target
      );
      if (existingConnection) {
        toast({ title: "Connection already exists", variant: "destructive" });
        return;
      }

      // Create new edge with better temp ID handling
      const tempId = generateTempId("temp_path");
      const newEdge: AppEdge = {
        id: tempId,
        ...params,
        type: "floating",
        markerEnd: { type: MarkerType.ArrowClosed },
      };
      setEdges((eds) => addEdge(newEdge, eds));

      // Update map state with proper temp ID tracking
      const updatedMap = {
        ...map,
        map_nodes: map.map_nodes.map((node) => {
          if (node.id === params.source) {
            const newPath = {
              id: tempId,
              source_node_id: params.source!,
              destination_node_id: params.target!,
            };

            return {
              ...node,
              node_paths_source: [
                ...(Array.isArray(node.node_paths_source)
                  ? node.node_paths_source
                  : []),
                newPath,
              ],
            };
          }
          return node;
        }),
      };

      console.log("🔗 Created path:", {
        tempId,
        source: params.source,
        target: params.target,
      });
      onMapChange(updatedMap);
      toast({ title: "Path created! (Save to persist)" });
    },
    [setEdges, edges, toast, map, onMapChange]
  );

  // Node deletion handler
  const onNodesDelete: OnNodesDelete = useCallback(
    (deleted) => {
      const deletedIds = deleted.map((node) => node.id);

      const updatedMap = {
        ...map,
        map_nodes: map.map_nodes
          .filter((node) => !deletedIds.includes(node.id))
          .map((node) => ({
            ...node,
            node_paths_source: (node.node_paths_source || []).filter(
              (path) => !deletedIds.includes(path.destination_node_id)
            ),
            node_paths_destination: (node.node_paths_destination || []).filter(
              (path) => !deletedIds.includes(path.source_node_id)
            ),
          })),
      };

      onMapChange(updatedMap);

      deleted.forEach((node) => {
        toast({ title: `Node "${node.data.title}" deleted (Save to persist)` });
      });
    },
    [toast, map, onMapChange]
  );

  // Edge deletion handler
  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deleted) => {
      const deletedIds = deleted.map((edge) => edge.id);

      const updatedMap = {
        ...map,
        map_nodes: map.map_nodes.map((node) => ({
          ...node,
          node_paths_source: (node.node_paths_source || []).filter(
            (path) => !deletedIds.includes(path.id)
          ),
          node_paths_destination: (node.node_paths_destination || []).filter(
            (path) => !deletedIds.includes(path.id)
          ),
        })),
      };

      onMapChange(updatedMap);
      toast({ title: "Path deleted (Save to persist)" });
    },
    [toast, map, onMapChange]
  );

  // Node drag handler
  const onNodeDragStop: NodeDragHandler = useCallback(
    (_, node) => {
      const updatedMap = {
        ...map,
        map_nodes: map.map_nodes.map((mapNode) => {
          if (mapNode.id === node.id) {
            return {
              ...mapNode,
              metadata: { ...mapNode.metadata, position: node.position },
            };
          }
          return mapNode;
        }),
      };
      onMapChange(updatedMap);
    },
    [map, onMapChange]
  );

  // Selection change handler
  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const node = params.nodes[0];
    setSelectedNode((node as AppNode) || null);
  }, []);

  // Enhanced node data change handler to capture quiz questions
  const handleNodeDataChange = useCallback(
    (nodeId: string, data: Partial<MapNode>) => {
      console.log(
        "🔧 MapEditor: Node data change for",
        nodeId,
        Object.keys(data)
      );

      // If this update includes assessments with quiz questions, track them
      if (data.node_assessments) {
        const assessment = data.node_assessments[0];
        if (
          assessment?.assessment_type === "quiz" &&
          assessment.quiz_questions
        ) {
          console.log(
            "📊 MapEditor: Tracking quiz questions for node",
            nodeId,
            assessment.quiz_questions.length
          );
          setPendingQuizQuestions((prev) => ({
            ...prev,
            [nodeId]: assessment.quiz_questions || [],
          }));
        }
      }

      // Update React Flow state
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            const newData = { ...node.data, ...data };
            return { ...node, data: newData };
          }
          return node;
        })
      );

      // Update selected node if it's the one being changed
      if (selectedNode?.id === nodeId) {
        setSelectedNode((prev) =>
          prev ? { ...prev, data: { ...prev.data, ...data } } : null
        );
      }

      // Update map state
      const updatedMap = {
        ...map,
        map_nodes: map.map_nodes.map((node) => {
          if (node.id === nodeId) {
            return { ...node, ...data };
          }
          return node;
        }),
      };

      onMapChange(updatedMap);
    },
    [map, onMapChange, selectedNode, setNodes]
  );

  // Node delete handler
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const nodeToDelete = nodes.find((node) => node.id === nodeId);
      if (!nodeToDelete) return;

      // Remove from React Flow state
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );

      // Update map state
      const updatedMap = {
        ...map,
        map_nodes: map.map_nodes
          .filter((node) => node.id !== nodeId)
          .map((node) => ({
            ...node,
            node_paths_source: (node.node_paths_source || []).filter(
              (path) => path.destination_node_id !== nodeId
            ),
            node_paths_destination: (node.node_paths_destination || []).filter(
              (path) => path.source_node_id !== nodeId
            ),
          })),
      };

      onMapChange(updatedMap);

      // Clear selection if deleted node was selected
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
      }

      toast({
        title: `Node "${nodeToDelete.data.title}" deleted (Save to persist)`,
      });
    },
    [nodes, selectedNode, setNodes, setEdges, map, onMapChange, toast]
  );

  return (
    <ResizablePanelGroup direction="horizontal" className="border rounded-lg">
      <ResizablePanel defaultSize={75}>
        <div className="h-full relative">
          <Button
            onClick={handleAddNode}
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
            <MiniMap
              // Position
              position="bottom-right"
              // Node styling - rounded nodes
              nodeBorderRadius={8}
              nodeStrokeWidth={2}
              nodeColor={(node) => {
                switch (node.type) {
                  case "input":
                    return "#4CAF50"; // Green
                  case "output":
                    return "#9C27B0"; // Purple
                  default:
                    return "#FF9800"; // Orange
                }
              }}
              style={{
                transform: "scale(0.6)",
                transformOrigin: "bottom right",
              }}
              nodeStrokeColor="#ffffff"
              // Background
              bgColor="#1e1e1e"
              // Mask (viewport indicator)
              maskColor="rgba(255, 255, 255, 0.15)"
              maskStrokeColor="#ffffff"
              maskStrokeWidth={1}
              // Interactivity
              pannable
              zoomable
              // Accessibility
              ariaLabel="Flow overview minimap"
              // Optional tweaks
              offsetScale={5}
            />
          </ReactFlow>
        </div>
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
