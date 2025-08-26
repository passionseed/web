/**
 * Hook for managing resizable panels
 */

import { useState, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { MapViewerNode, UsePanelManagementReturn, PanelRefs } from "../types";
import { PANEL_SIZES, ANIMATIONS } from "../constants";

export function usePanelManagement(
  panelRefs: PanelRefs
): UsePanelManagementReturn & { isPanelMinimized: boolean } {
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const reactFlowInstance = useReactFlow();

  // Toggle panel minimize/maximize
  const togglePanelSize = useCallback(() => {
    if (!panelRefs.right.current || !panelRefs.left.current) return;

    if (isPanelMinimized) {
      // Maximize: restore to default size
      panelRefs.right.current.resize(PANEL_SIZES.RIGHT_DEFAULT);
      panelRefs.left.current.resize(PANEL_SIZES.LEFT_DEFAULT);
      setIsPanelMinimized(false);
    } else {
      // Minimize: shrink right panel to minimal size
      panelRefs.right.current.resize(PANEL_SIZES.RIGHT_MINIMIZED);
      panelRefs.left.current.resize(PANEL_SIZES.LEFT_MINIMIZED);
      setIsPanelMinimized(true);
    }
  }, [isPanelMinimized, panelRefs]);

  const handleSelectionChange = useCallback((selectedNode: MapViewerNode | null) => {
    // Don't resize panels if currently minimized - let user control that
    if (isPanelMinimized || !panelRefs.right.current || !panelRefs.left.current) return;

    if (selectedNode) {
      // Node selected: expand right panel, shrink left
      panelRefs.right.current.resize(PANEL_SIZES.RIGHT_WITH_SELECTION);
      panelRefs.left.current.resize(PANEL_SIZES.LEFT_WITH_SELECTION);

      // Center the selected node accounting for the expanded panel
      setTimeout(() => {
        if (reactFlowInstance && selectedNode) {
          // Get the current viewport
          const viewport = reactFlowInstance.getViewport();

          // Calculate the center position accounting for the panel split
          const containerRect = document
            .querySelector(".react-flow")
            ?.getBoundingClientRect();
          
          if (containerRect) {
            const leftPanelWidth = containerRect.width * (PANEL_SIZES.LEFT_WITH_SELECTION / 100);
            const targetX = leftPanelWidth * 0.5; // Center in the left panel
            const targetY = containerRect.height * 0.5; // Center vertically

            // Use fitView to center on the selected node with padding
            reactFlowInstance.fitView({
              nodes: [{ id: selectedNode.id }],
              duration: ANIMATIONS.NODE_CENTER_DURATION,
              padding: 0.15,
              minZoom: viewport.zoom * 0.9, // Slightly zoom out for better view
              maxZoom: viewport.zoom * 1.1, // Allow slight zoom in
            });
          }
        }
      }, ANIMATIONS.PANEL_RESIZE_DURATION + 50); // Wait for panel animation to complete
    } else {
      // Node deselected: restore default sizes
      panelRefs.left.current.resize(PANEL_SIZES.LEFT_DEFAULT);
      panelRefs.right.current.resize(PANEL_SIZES.RIGHT_DEFAULT);
    }
  }, [isPanelMinimized, panelRefs, reactFlowInstance]);

  return {
    isPanelMinimized,
    togglePanelSize,
    handleSelectionChange,
  };
}