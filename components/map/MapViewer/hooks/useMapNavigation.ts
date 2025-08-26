/**
 * Hook for managing map navigation and keyboard shortcuts
 */

import { useEffect, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { FullLearningMap } from "@/lib/supabase/maps";
import { 
  MapViewerNode, 
  ProgressMap, 
  UseMapNavigationReturn,
  UserRole,
  PanelRefs 
} from "../types";
import { 
  shouldHandleKeyboardEvent,
  isNavigationKey,
  isDeselectKey,
  isToggleNavigationKey,
  isPlainCharacterKey,
  getNavigationDirection
} from "../utils/mapKeyboard";
import { getUnlockedLearningNodes } from "../utils/mapProgressUtils";

export function useMapNavigation(
  map: FullLearningMap,
  progressMap: ProgressMap,
  selectedNode: MapViewerNode | null,
  isTeamMap: boolean,
  userRole: UserRole,
  panelRefs: PanelRefs,
  onNodeSelect: (node: MapViewerNode | null) => void,
  onToggleNavigation: () => void
): UseMapNavigationReturn {
  const reactFlowInstance = useReactFlow();

  // Function to navigate to adjacent unlocked nodes
  const navigateToAdjacentNode = useCallback((direction: 1 | -1) => {
    const unlockedNodes = getUnlockedLearningNodes(
      map, 
      progressMap, 
      isTeamMap, 
      userRole
    );
    
    if (unlockedNodes.length === 0) return;

    const currentIndex = selectedNode
      ? unlockedNodes.findIndex((node) => node.id === selectedNode.id)
      : -1;

    let nextIndex;
    if (currentIndex === -1) {
      nextIndex = direction === 1 ? 0 : unlockedNodes.length - 1;
    } else {
      nextIndex =
        (currentIndex + direction + unlockedNodes.length) %
        unlockedNodes.length;
    }

    const nextNode = unlockedNodes[nextIndex];
    if (nextNode && reactFlowInstance) {
      // Center the node
      reactFlowInstance.setCenter(
        (nextNode.metadata as any)?.position?.x || 0,
        (nextNode.metadata as any)?.position?.y || 0,
        { zoom: 1.2, duration: 600 }
      );

      // Update selection - create a MapViewerNode structure
      const mapViewerNode: MapViewerNode = {
        id: nextNode.id,
        type: "default",
        data: { ...nextNode, progress: progressMap[nextNode.id] },
        position: (nextNode.metadata as any)?.position || { x: 0, y: 0 },
        draggable: false,
        connectable: false,
        selectable: true,
        selected: true,
        style: {},
      };

      onNodeSelect(mapViewerNode);
    }
  }, [
    map, 
    progressMap, 
    isTeamMap, 
    userRole, 
    selectedNode, 
    reactFlowInstance, 
    onNodeSelect
  ]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!reactFlowInstance || !shouldHandleKeyboardEvent(event)) return;

    // Do not intercept plain character keys
    if (isPlainCharacterKey(event)) return;

    // Escape to clear selection
    if (isDeselectKey(event)) {
      onNodeSelect(null);
      if (panelRefs.right.current && panelRefs.left.current) {
        panelRefs.left.current.resize(70);
        panelRefs.right.current.resize(30);
      }
      return;
    }

    // Tab-based map navigation
    if (isNavigationKey(event)) {
      event.preventDefault();
      navigateToAdjacentNode(getNavigationDirection(event));
      return;
    }

    // Toggle navigation guide with Cmd/Ctrl+K
    if (isToggleNavigationKey(event)) {
      event.preventDefault();
      onToggleNavigation();
      return;
    }
  }, [
    reactFlowInstance, 
    navigateToAdjacentNode, 
    onNodeSelect, 
    onToggleNavigation, 
    panelRefs
  ]);

  // Set up keyboard event listeners
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return {
    navigateToAdjacentNode,
    handleKeyDown,
  };
}