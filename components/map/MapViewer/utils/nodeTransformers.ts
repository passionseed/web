/**
 * Utility functions for transforming map data to ReactFlow nodes and edges
 */

import { FullLearningMap } from "@/lib/supabase/maps";
import { PROGRESS_COLORS } from "../constants";
import { ProgressMap, MapViewerNode, MapViewerEdge, EnhancedProgress } from "../types";

/**
 * Transform map nodes to ReactFlow nodes
 */
export function transformMapNodes(
  map: FullLearningMap,
  progressMap: ProgressMap,
  selectedNodeId: string | null,
  nodeTypes: any
): MapViewerNode[] {
  return map.map_nodes.map((node) => {
    // Determine node type - check for node_type property
    let nodeType = "default"; // learning node
    if ((node as any)?.node_type === "text") {
      nodeType = "text";
    } else if ((node as any)?.node_type === "comment") {
      nodeType = "comment";
    }

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
      selected: selectedNodeId === node.id,
      style: {
        backgroundColor: "#ffffff00",
        border: "2px solid #cccccc00",
        flexGrow: 1,
        aspectRatio: "1 / 1",
      },
    } as MapViewerNode;
  });
}

/**
 * Transform map paths to ReactFlow edges
 */
export function transformMapEdges(
  map: FullLearningMap,
  progressMap: ProgressMap
): MapViewerEdge[] {
  const transformedEdges: MapViewerEdge[] = [];
  
  map.map_nodes.forEach((node) => {
    node.node_paths_source.forEach((path) => {
      // Add visual indicators for path states
      const sourceProgress = progressMap[path.source_node_id];
      const sourceStatus = sourceProgress?.status || (sourceProgress as any)?.status;
      const isPathActive =
        sourceStatus === "passed" ||
        sourceStatus === "in_progress" ||
        sourceStatus === "submitted";

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

  return transformedEdges;
}

/**
 * Get minimap node color based on progress
 */
export function getMiniMapNodeColor(node: any): string {
  const progress = node.data?.progress;
  if (!progress) return PROGRESS_COLORS.default;

  const status = progress.status || (progress as any)?.status;
  return PROGRESS_COLORS[status as keyof typeof PROGRESS_COLORS] || PROGRESS_COLORS.default;
}

/**
 * Create minimap configuration with dynamic node coloring
 */
export function createMiniMapConfig() {
  return {
    nodeColor: getMiniMapNodeColor,
    // other config properties are imported from constants
  };
}