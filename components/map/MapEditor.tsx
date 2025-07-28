"use client";

import React, { useEffect, useCallback, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
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
  EdgeProps,
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

// Type definitions for v12
type AppNode = Node<MapNode, "default">;
type AppEdge = Edge;

interface MapEditorProps {
  map: FullLearningMap;
  onMapChange: (updatedMap: FullLearningMap) => void;
}

const initialNodes: AppNode[] = [];
const initialEdges: AppEdge[] = [];

const edgeTypes = {
  floating: FloatingEdgeEdit,
};

export function MapEditor({ map, onMapChange }: MapEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<AppNode | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const transformedNodes: AppNode[] = map.map_nodes.map((node) => ({
      id: node.id,
      type: "default",
      data: node,
      position: (node.metadata as any)?.position || {
        x: Math.random() * 400,
        y: Math.random() * 400,
      },
      draggable: true,
      connectable: true,
      selectable: true,
      selected: selectedNode?.id === node.id,
      style: {
        backgroundColor: "#ffffff00",
        border: "2px solid #cccccc00",
        flexGrow: 1,
        aspectRatio: "1 / 1",
      },
    }));

    const transformedEdges: AppEdge[] = [];
    map.map_nodes.forEach((node) => {
      node.node_paths_source?.forEach((path) => {
        transformedEdges.push({
          id: path.id,
          source: path.source_node_id,
          target: path.destination_node_id,
          type: "floating",
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
          style: {
            stroke: "#83460d",
            strokeWidth: 2,
          },
        });
      });
    });

    setNodes(transformedNodes);
    setEdges(transformedEdges);
  }, [map, selectedNode, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

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

      const tempId = `temp_${Date.now()}_${Math.random()}`;
      const newEdge: AppEdge = {
        id: tempId,
        ...params,
        type: "floating",
        markerEnd: { type: MarkerType.ArrowClosed },
      };
      setEdges((eds) => addEdge(newEdge, eds));

      const updatedMap = {
        ...map,
        map_nodes: map.map_nodes.map((node) => {
          if (node.id === params.source) {
            return {
              ...node,
              node_paths_source: [
                ...(node.node_paths_source || []),
                {
                  id: tempId,
                  source_node_id: params.source!,
                  destination_node_id: params.target!,
                },
              ],
            };
          }
          return node;
        }),
      };
      onMapChange(updatedMap);
      toast({ title: "Path created! (Save to persist)" });
    },
    [setEdges, edges, toast, map, onMapChange]
  );

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

      for (const node of deleted) {
        toast({ title: `Node "${node.data.title}" deleted (Save to persist)` });
      }
    },
    [toast, map, onMapChange]
  );

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

  const handleAddNode = () => {
    const tempId = `temp_node_${Date.now()}_${Math.random()}`;
    const newNodeData: MapNode = {
      id: tempId,
      map_id: map.id,
      title: "New Node",
      instructions: "Add instructions...",
      difficulty: 1,
      sprite_url: null,
      metadata: { position: { x: 100, y: 100 } },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
  };

  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const node = params.nodes[0];
    if (node) {
      setSelectedNode(node as AppNode);
    } else {
      setSelectedNode(null);
    }
  }, []);

  const handleNodeDataChange = (nodeId: string, data: Partial<MapNode>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const newData = { ...node.data, ...data };
          return { ...node, data: newData };
        }
        return node;
      })
    );

    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev) =>
        prev ? { ...prev, data: { ...prev.data, ...data } } : null
      );
    }

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
  };

  const nodeTypes = {
    default: ({ data, selected }: { data: MapNode; selected?: boolean }) => {
      const spriteUrl = data.sprite_url || "/islands/crystal.png";

      return (
        <>
          <Handle
            type="target"
            position={Position.Top}
            className="w-5 h-5 bg-blue-500 border-2 border-white shadow-md "
          />
          <Handle
            type="source"
            position={Position.Bottom}
            className="w-3 h-3 bg-green-500 border-2 border-white shadow-md"
          />
          <Handle
            type="target"
            position={Position.Left}
            className="w-3 h-3 bg-blue-500 border-2 border-white shadow-md "
          />
          <Handle
            type="source"
            position={Position.Right}
            className="w-3 h-3 bg-green-500 border-2 border-white shadow-md"
          />

          <div
            className={`relative ${selected ? "scale-110" : ""} transition-transform duration-200`}
          >
            {selected && (
              <div className="absolute -inset-2 rounded-full border-4 border-blue-400 animate-pulse" />
            )}

            <img
              src={spriteUrl}
              alt={data.title}
              className="w-max h-max object-contain drop-shadow-lg hover:drop-shadow-xl transition-all duration-200"
              style={{
                filter: selected
                  ? "brightness(1.1) saturate(1.2)"
                  : "brightness(1)",
              }}
            />

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
    },
  };

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
            edgeTypes={edgeTypes}
            fitView
          >
            {/* <Controls /> */}
            {/* <MiniMap /> */}
            <Background />
          </ReactFlow>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
        <NodeEditorPanel
          selectedNode={selectedNode}
          onNodeDataChange={handleNodeDataChange}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
