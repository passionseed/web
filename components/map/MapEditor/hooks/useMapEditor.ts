import { useState, useCallback, useEffect } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  OnNodesDelete,
  OnEdgesDelete,
  OnSelectionChangeParams,
  MarkerType,
} from "@xyflow/react";
import { useToast } from "@/components/ui/use-toast";
import { FullLearningMap } from "@/lib/supabase/maps";
import { MapNode } from "@/types/map";
import { AppNode, AppEdge, ExtendedMapNode } from "../types";
import {
  transformMapToReactFlow,
  createNewNode,
  createNewTextNode,
  validateConnection,
  updateMapWithNewEdge,
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
  const [selectedNodes, setSelectedNodes] = useState<AppNode[]>([]);
  const { toast } = useToast();

  // Transform map data to React Flow format
  useEffect(() => {
    const { transformedNodes, transformedEdges } = transformMapToReactFlow(map);
    setNodes(transformedNodes);
    setEdges(transformedEdges);
  }, [map, setNodes, setEdges]);

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
        markerEnd: { type: MarkerType.ArrowClosed },
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
      const updatedMap = updateMapWithDeletedNodes(map, deleted as AppNode[]);
      onMapChange(updatedMap);

      deleted.forEach((node: any) => {
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
  const onNodeDragStop = useCallback(
    (_: any, node: any) => {
      const updatedMap = updateMapWithNodePosition(map, node);
      onMapChange(updatedMap);
    },
    [map, onMapChange]
  );

  // Selection change handler
  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    setSelectedNodes(params.nodes as AppNode[]);
  }, []);

  // Add node handler
  const handleAddNode = useCallback(() => {
    const { newNode, updatedMap } = createNewNode(map);
    setNodes((nds) => [...nds, newNode]);
    onMapChange(updatedMap);
    toast({ title: "Node Added! (Save to persist)" });
  }, [map, onMapChange, setNodes, toast]);

  // Add text node handler
  const handleAddTextNode = useCallback(() => {
    const { newNode, updatedMap } = createNewTextNode(map);
    setNodes((nds) => [...nds, newNode]);
    onMapChange(updatedMap);
    toast({ title: "Text Added! (Save to persist)" });
  }, [map, onMapChange, setNodes, toast]);

  // Node data change handler
  const handleNodeDataChange = useCallback(
    (nodeId: string, data: Partial<ExtendedMapNode>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            const newData = { ...node.data, ...data };
            return { ...node, data: newData };
          }
          return node;
        })
      );

      // Update selectedNodes if this node is currently selected
      setSelectedNodes((prevSelected) =>
        prevSelected.map((selectedNode) =>
          selectedNode.id === nodeId
            ? { ...selectedNode, data: { ...selectedNode.data, ...data } }
            : selectedNode
        )
      );

      const updatedMap = {
        ...map,
        map_nodes: map.map_nodes.map((node) => {
          if (node.id === nodeId) {
            return { ...node, ...data } as any;
          }
          return node;
        }),
      };
      onMapChange(updatedMap as FullLearningMap);
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

      // Remove from selectedNodes if currently selected
      setSelectedNodes((prevSelected) =>
        prevSelected.filter((selectedNode) => selectedNode.id !== nodeId)
      );

      toast({
        title: `Node "${nodeToDelete.data.title}" deleted (Save to persist)`,
      });
    },
    [nodes, setNodes, setEdges, map, onMapChange, toast]
  );

  return {
    nodes,
    edges,
    selectedNodes,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodesDelete,
    onEdgesDelete,
    onNodeDragStop,
    onSelectionChange,
    handleAddNode,
    handleAddTextNode,
    handleNodeDataChange,
    handleDeleteNode,
  };
}
