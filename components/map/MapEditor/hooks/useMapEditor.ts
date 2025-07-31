import { useState, useCallback, useEffect } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  OnNodesDelete,
  OnEdgesDelete,
  NodeDragHandler,
  OnSelectionChangeParams,
} from "@xyflow/react";
import { useToast } from "@/components/ui/use-toast";
import { FullLearningMap } from "@/lib/supabase/maps";
import { MapNode } from "@/types/map";
import { AppNode, AppEdge } from "../types";
import {
  transformMapToReactFlow,
  createNewNode,
  validateConnection,
  updateMapWithNewNode,
  updateMapWithDeletedNodes,
  updateMapWithDeletedEdges,
  updateMapWithNodePosition,
} from "../utils/mapTransformers";
import { generateTempId } from "../utils/helpers";

export function useMapEditor(
  map: FullLearningMap,
  onMapChange: (map: FullLearningMap) => void
) {
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AppEdge>([]);
  const [selectedNode, setSelectedNode] = useState<AppNode | null>(null);
  const { toast } = useToast();

  // Transform map data to React Flow format
  useEffect(() => {
    const { transformedNodes, transformedEdges } = transformMapToReactFlow(
      map,
      selectedNode
    );
    setNodes(transformedNodes);
    setEdges(transformedEdges);
  }, [map, selectedNode, setNodes, setEdges]);

  // Connection handler
  const onConnect = useCallback(
    (params: Connection) => {
      const validationError = validateConnection(params, edges);
      if (validationError) {
        toast({ title: validationError, variant: "destructive" });
        return;
      }

      const tempId = generateTempId("temp");
      const newEdge: AppEdge = {
        id: tempId,
        ...params,
        type: "floating",
        markerEnd: { type: "ArrowClosed" },
      };

      setEdges((eds) => addEdge(newEdge, eds));

      const updatedMap = updateMapWithNewEdge(map, params, tempId);
      onMapChange(updatedMap);
      toast({ title: "Path created! (Save to persist)" });
    },
    [setEdges, edges, toast, map, onMapChange]
  );

  // Node deletion handler
  const onNodesDelete: OnNodesDelete = useCallback(
    (deleted) => {
      const updatedMap = updateMapWithDeletedNodes(map, deleted);
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
      const updatedMap = updateMapWithDeletedEdges(map, deleted);
      onMapChange(updatedMap);
      toast({ title: "Path deleted (Save to persist)" });
    },
    [toast, map, onMapChange]
  );

  // Node drag handler
  const onNodeDragStop: NodeDragHandler = useCallback(
    (_, node) => {
      const updatedMap = updateMapWithNodePosition(map, node);
      onMapChange(updatedMap);
    },
    [map, onMapChange]
  );

  // Selection change handler
  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const node = params.nodes[0];
    setSelectedNode((node as AppNode) || null);
  }, []);

  // Add node handler
  const handleAddNode = useCallback(() => {
    const { newNode, updatedMap } = createNewNode(map);
    setNodes((nds) => [...nds, newNode]);
    onMapChange(updatedMap);
    toast({ title: "Node Added! (Save to persist)" });
  }, [map, onMapChange, setNodes, toast]);

  // Node data change handler
  const handleNodeDataChange = useCallback(
    (nodeId: string, data: Partial<MapNode>) => {
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
    },
    [map, onMapChange, selectedNode, setNodes]
  );

  // Node delete handler
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const nodeToDelete = nodes.find((node) => node.id === nodeId);
      if (!nodeToDelete) return;

      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );

      const updatedMap = updateMapWithDeletedNodes(map, [nodeToDelete]);
      onMapChange(updatedMap);

      if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
      }

      toast({
        title: `Node "${nodeToDelete.data.title}" deleted (Save to persist)`,
      });
    },
    [nodes, selectedNode, setNodes, setEdges, map, onMapChange, toast]
  );

  return {
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
  };
}
