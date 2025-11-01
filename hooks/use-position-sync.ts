/**
 * usePositionSync Hook
 *
 * Manages position synchronization for journey map nodes.
 * Handles batched updates and sync status tracking.
 */

import { useEffect, useState, useCallback } from "react";
import { Node } from "@xyflow/react";
import { toast } from "sonner";
import {
  getPositionSyncManager,
  SyncStatus,
} from "@/lib/sync/PositionSyncManager";
import { updateNorthStarPosition } from "@/lib/supabase/north-star";

export interface UsePositionSyncReturn {
  syncStatus: SyncStatus;
  syncMessage: string | undefined;
  handleNodeDragStop: (_event: any, node: Node) => void;
  flush: () => void;
}

/**
 * Hook for managing position synchronization with the backend
 */
export function usePositionSync(): UsePositionSyncReturn {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState<string | undefined>(undefined);
  const syncManager = getPositionSyncManager();

  // Subscribe to sync status changes
  useEffect(() => {
    const unsubscribe = syncManager.onStatusChange((event) => {
      setSyncStatus(event.status);
      setSyncMessage(event.message);

      // Show error toast if sync fails
      if (event.status === "error") {
        toast.error(event.message || "Failed to save position changes");
      }
    });

    // Cleanup: flush pending changes and unsubscribe
    return () => {
      syncManager.flush();
      unsubscribe();
    };
  }, [syncManager]);

  const handleNodeDragStop = useCallback(
    (_event: any, node: Node) => {
      // Don't save position for user-center node
      if (node.id === "user-center") return;

      // Check if this is a North Star entity node
      if (node.type === "northStarEntity") {
        // Save North Star position directly (not batched)
        updateNorthStarPosition(node.id, node.position.x, node.position.y)
          .catch((error) => {
            toast.error("Failed to save North Star position");
            console.error("North Star position sync error:", error);
          });
        return;
      }

      // Mark project as dirty for batched sync
      syncManager.markProjectDirty(node.id, node.position.x, node.position.y);
    },
    [syncManager]
  );

  const flush = useCallback(() => {
    syncManager.flush();
  }, [syncManager]);

  return {
    syncStatus,
    syncMessage,
    handleNodeDragStop,
    flush,
  };
}
