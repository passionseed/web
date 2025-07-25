"use client";

import React, { useEffect, useCallback, useState } from 'react';
import ReactFlow, {
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { FullLearningMap, updateNode, createNode, createPath, deleteNode, deletePath } from '@/lib/supabase/maps';
import { MapNode } from '@/types/map';
import { Plus } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { NodeEditorPanel } from './NodeEditorPanel';

interface MapEditorProps {
  map: FullLearningMap;
}

const initialNodes: Node<MapNode>[] = [];
const initialEdges: Edge[] = [];

export function MapEditor({ map }: MapEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<MapNode> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const transformedNodes: Node<MapNode>[] = map.map_nodes.map(node => ({
      id: node.id,
      type: 'default',
      data: node, // Pass the full node object here
      position: (node.metadata as any)?.position || { x: Math.random() * 400, y: Math.random() * 400 },
    }));

    const transformedEdges: Edge[] = [];
    map.map_nodes.forEach(node => {
        node.node_paths_source.forEach(path => {
            transformedEdges.push({
                id: path.id,
                source: path.source_node_id,
                target: path.destination_node_id,
            });
        });
    });

    setNodes(transformedNodes);
    setEdges(transformedEdges);
  }, [map, setNodes, setEdges]);

  const onConnect = useCallback(async (params: Connection) => {
    if (!params.source || !params.target) return;
    try {
        const newPath = await createPath(params.source, params.target);
        const newEdge = { id: newPath.id, ...params } as Edge;
        setEdges((eds) => addEdge(newEdge, eds));
        toast({ title: "Path created!" });
    } catch (error) {
        toast({ title: "Error creating path", variant: "destructive" });
    }
  }, [setEdges, toast]);

  const onNodesDelete: OnNodesDelete = useCallback(async (deleted) => {
    for (const node of deleted) {
        try {
            await deleteNode(node.id);
            toast({ title: `Node "${node.data.title}" deleted` });
        } catch (error) {
            toast({ title: `Error deleting node "${node.data.title}"`, variant: "destructive" });
        }
    }
  }, [toast]);

  const onEdgesDelete: OnEdgesDelete = useCallback(async (deleted) => {
    for (const edge of deleted) {
        try {
            await deletePath(edge.id);
            toast({ title: "Path deleted" });
        } catch (error) {
            toast({ title: "Error deleting path", variant: "destructive" });
        }
    }
  }, [toast]);

  const onNodeDragStop: NodeDragHandler = useCallback(async (_, node) => {
    try {
        await updateNode(node.id, {
            metadata: { ...node.data.metadata, position: node.position },
        });
    } catch (error) {
        toast({ title: "Error saving position", description: "Could not save node position.", variant: "destructive" });
    }
  }, [toast]);

  const handleAddNode = async () => {
    try {
        const newNodeData = await createNode({
            map_id: map.id,
            title: 'New Node',
            instructions: 'Add instructions...',
            difficulty: 1,
        });
        const newNode: Node<MapNode> = {
            id: newNodeData.id,
            position: { x: 100, y: 100 },
            data: newNodeData,
        };
        setNodes((nds) => nds.concat(newNode));
        toast({ title: "Node Added!" });
    } catch (error) {
        toast({ title: "Error adding node", variant: "destructive" });
    }
  };

  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const node = params.nodes[0];
    if (node) {
        setSelectedNode(node as Node<MapNode>);
    } else {
        setSelectedNode(null);
    }
  }, []);

  const handleNodeDataChange = (nodeId: string, data: Partial<MapNode>) => {
      setNodes((nds) =>
        nds.map((node) => {
            if (node.id === nodeId) {
                // Create a new data object to ensure React re-renders
                const newData = { ...node.data, ...data };
                return { ...node, data: newData };
            }
            return node;
        })
      );
      // Also update the selected node to reflect changes instantly in the panel
      if (selectedNode?.id === nodeId) {
          setSelectedNode(prev => prev ? ({ ...prev, data: { ...prev.data, ...data } }) : null);
      }
  };

  // Custom node component to render the title from `data.title`
  const nodeTypes = {
      default: ({ data }: { data: MapNode }) => {
          return (
              <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400">
                  <div className="font-bold">{data.title}</div>
                  <div className="text-sm text-gray-500">Difficulty: {data.difficulty}</div>
              </div>
          );
      }
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="border rounded-lg bg-background">
        <ResizablePanel defaultSize={75}>
            <div className="h-full relative">
                <Button onClick={handleAddNode} className="absolute top-4 right-4 z-10" size="sm">
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
                    fitView
                >
                    <Controls />
                    <MiniMap />
                    <Background />
                </ReactFlow>
            </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <NodeEditorPanel selectedNode={selectedNode} onNodeDataChange={handleNodeDataChange} />
        </ResizablePanel>
    </ResizablePanelGroup>
  );
}
