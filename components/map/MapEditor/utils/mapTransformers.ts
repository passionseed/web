import { Connection, MarkerType } from "@xyflow/react";
import { FullLearningMap } from "@/lib/supabase/maps";
import { MapNode } from "@/types/map";
import { AppNode, AppEdge } from "../types";
import { NODE_STYLE, EDGE_STYLE } from "../constants";
import { generateTempId, getRandomPosition } from "./helpers";

export function transformMapToReactFlow(
  map: FullLearningMap,
  selectedNode: AppNode | null
): { transformedNodes: AppNode[]; transformedEdges: AppEdge[] } {
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

  return { transformedNodes, transformedEdges };
}

export function createNewNode(map: FullLearningMap): {
  newNode: AppNode;
  updatedMap: FullLearningMap;
} {
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
    metadata: { position: { x: 100, y: 100 } },
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

  const updatedMap = {
    ...map,
    map_nodes: [...map.map_nodes, newNodeData],
  };

  return { newNode, updatedMap };
}

export function validateConnection(
  params: Connection,
  edges: AppEdge[]
): string | null {
  if (!params.source || !params.target) return "Invalid connection parameters";

  if (params.source === params.target) {
    return "Cannot connect node to itself";
  }

  const existingConnection = edges.find(
    (edge) => edge.source === params.source && edge.target === params.target
  );
  if (existingConnection) {
    return "Connection already exists";
  }

  return null;
}

export function updateMapWithNewEdge(
  map: FullLearningMap,
  params: Connection,
  tempId: string
): FullLearningMap {
  return {
    ...map,
    map_nodes: map.map_nodes.map((node) => {
      if (node.id === params.source) {
        return {
          ...node,
          node_paths_source: [
            ...(Array.isArray(node.node_paths_source)
              ? node.node_paths_source
              : []),
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
}

export function updateMapWithDeletedNodes(
  map: FullLearningMap,
  deleted: AppNode[]
): FullLearningMap {
  const deletedIds = deleted.map((node) => node.id);

  return {
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
}

export function updateMapWithDeletedEdges(
  map: FullLearningMap,
  deleted: AppEdge[]
): FullLearningMap {
  const deletedIds = deleted.map((edge) => edge.id);

  return {
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
}

export function updateMapWithNodePosition(
  map: FullLearningMap,
  node: AppNode
): FullLearningMap {
  return {
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
}
