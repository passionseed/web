/**
 * MapSidebar - Right panel with node details and controls
 */

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { NodeViewPanel } from "@/components/map/NodeViewPanel";
import { MapViewerNode, UserRole } from "../types";

interface MapSidebarProps {
  selectedNode: MapViewerNode | null;
  mapId: string;
  onProgressUpdate: () => Promise<void>;
  isNodeUnlocked: boolean;
  userRole: UserRole;
  isInstructorOrTA: boolean;
  isPanelMinimized: boolean;
  onTogglePanelSize: () => void;
}

export function MapSidebar({
  selectedNode,
  mapId,
  onProgressUpdate,
  isNodeUnlocked,
  userRole,
  isInstructorOrTA,
  isPanelMinimized,
  onTogglePanelSize,
}: MapSidebarProps) {
  return (
    <>
      {/* Panel Minimize/Maximize Button */}
      <button
        onClick={onTogglePanelSize}
        className="absolute top-2 right-2 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-2 shadow-lg hover:bg-muted/50 transition-colors"
        title={isPanelMinimized ? "Maximize panel" : "Minimize panel"}
        aria-label={isPanelMinimized ? "Maximize panel" : "Minimize panel"}
      >
        {isPanelMinimized ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      <div className="h-full flex flex-col overflow-hidden">
        {!isPanelMinimized && (
          <NodeViewPanel
            key={selectedNode?.id || "no-selection"} // Force remount on node change
            selectedNode={selectedNode}
            mapId={mapId}
            onProgressUpdate={onProgressUpdate}
            isNodeUnlocked={isNodeUnlocked}
            userRole={userRole}
            isInstructorOrTA={isInstructorOrTA}
          />
        )}
      </div>
    </>
  );
}