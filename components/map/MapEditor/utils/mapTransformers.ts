import { Connection, MarkerType } from "@xyflow/react";
import { FullLearningMap } from "@/lib/supabase/maps";
import { MapNode } from "@/types/map";
import { AppNode, AppEdge, ExtendedMapNode } from "../types";
import { NODE_STYLE, EDGE_STYLE } from "../constants";
import { generateTempId, getRandomPosition } from "./helpers";

export function transformMapToReactFlow(map: FullLearningMap): {
  transformedNodes: AppNode[];
  transformedEdges: AppEdge[];
} {
  const transformedNodes: AppNode[] = map.map_nodes.map((node) => {
    const extendedNode: ExtendedMapNode = {
      ...node,
      node_type: (node as any).node_type || "learning", // Default to learning if not specified
    };

    return {
      id: node.id,
      type: extendedNode.node_type === "text" ? "text" : "default",
      data: extendedNode,
      position: (node.metadata as any)?.position || getRandomPosition(),
      draggable: true,
      connectable: extendedNode.node_type !== "text", // Text nodes can't be connected
      selectable: true,
      style: NODE_STYLE,
    };
  });

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
  const newNodeData: ExtendedMapNode & {
    node_paths_source: any[];
    node_paths_destination: any[];
    node_content: any[];
    node_assessments: any[];
  } = {
    id: tempId,
    map_id: map.id,
    title: "New Node",
    instructions: "",
    difficulty: 1,
    sprite_url: null,
    metadata: { position: { x: 100, y: 100 } },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    node_type: "learning",
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

export function createNewTextNode(map: FullLearningMap): {
  newNode: AppNode;
  updatedMap: FullLearningMap;
} {
  const tempId = generateTempId("temp_text");
  const newTextData: ExtendedMapNode & {
    node_paths_source: any[];
    node_paths_destination: any[];
    node_content: any[];
    node_assessments: any[];
  } = {
    id: tempId,
    map_id: map.id,
    title: "Double-click to edit",
    instructions: null,
    difficulty: 1,
    sprite_url: null,
    metadata: {
      position: { x: 150, y: 150 },
      fontSize: "16px",
      textColor: "#d5e5ff",
      backgroundColor: "transparent",
      fontWeight: "normal",
      textAlign: "center",
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    node_type: "text",
    node_paths_source: [],
    node_paths_destination: [],
    node_content: [],
    node_assessments: [],
  };

  const newNode: AppNode = {
    id: tempId,
    position: { x: 150, y: 150 },
    data: newTextData,
    type: "text",
    draggable: true,
    connectable: false, // Text nodes shouldn't connect
    selectable: true,
  };

  const updatedMap = {
    ...map,
    map_nodes: [...map.map_nodes, newTextData],
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
