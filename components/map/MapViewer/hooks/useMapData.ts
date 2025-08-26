/**
 * Hook for transforming and managing ReactFlow map data
 */

import { useMemo } from "react";
import { FullLearningMap } from "@/lib/supabase/maps";
import { 
  ProgressMap, 
  UseMapDataReturn, 
  MapViewerNode, 
  MapViewerEdge,
  UserRole 
} from "../types";
import { transformMapNodes, transformMapEdges } from "../utils/nodeTransformers";

export function useMapData(
  map: FullLearningMap,
  progressMap: ProgressMap,
  selectedNode: MapViewerNode | null,
  nodeTypes: any
): UseMapDataReturn {
  const nodes = useMemo(() => {
    // Only recreate nodes when meaningful data changes, not on every render
    const mapId = map.id;
    const selectedId = selectedNode?.id || null;
    const progressKeys = Object.keys(progressMap).sort().join(',');
    const progressValues = Object.values(progressMap).map(p => 
      `${p.status || (p as any)?.status || 'none'}`
    ).join(',');
    
    return transformMapNodes(map, progressMap, selectedId, nodeTypes);
  }, [map.id, progressMap, selectedNode?.id, nodeTypes]);

  const edges = useMemo(() => {
    // Similarly for edges, only recreate when progress actually changes
    const progressKeys = Object.keys(progressMap).sort().join(',');
    const progressStatuses = Object.values(progressMap).map(p => 
      p.status || (p as any)?.status || 'none'
    ).join(',');
    
    return transformMapEdges(map, progressMap);
  }, [map.id, progressMap]);

  return useMemo(() => ({
    nodes,
    edges,
    nodeTypes,
  }), [nodes, edges, nodeTypes]);
}