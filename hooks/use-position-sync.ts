/**
 * usePositionSync Hook
 *
 * Manages position synchronization for journey map nodes.
 * Handles immediate saves with retry logic for reliability.
 */

import { useState, useCallback, useRef } from "react";
import { Node } from "@xyflow/react";
import { toast } from "sonner";
import { updateNorthStarPosition } from "@/lib/supabase/north-star";
import { updateProjectPosition } from "@/lib/supabase/journey";

export type SyncStatus = "idle" | "saving" | "saved" | "error";

export interface UsePositionSyncReturn {
  syncStatus: SyncStatus;
  syncMessage: string | undefined;
  handleNodeDragStop: (_event: any, node: Node) => void;
  flush: () => void;
}

/**
 * Hook for managing position synchronization with the backend
 * Implements immediate save with exponential backoff retry
 */
export function usePositionSync(): UsePositionSyncReturn {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState<string | undefined>(undefined);

  // Track pending saves to prevent duplicate requests
  const pendingSaves = useRef<Set<string>>(new Set());

  // Track saved indicator timeout
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Save position with retry logic
   * Implements exponential backoff: 1s, 2s, 4s
   */
  const savePositionWithRetry = useCallback(
    async (
      nodeId: string,
      x: number,
      y: number,
      nodeType: string | undefined,
      attempt: number = 1
    ): Promise<void> => {
      const maxAttempts = 3;
      const baseDelay = 1000; // 1 second

      try {
        if (nodeType === "northStarEntity") {
          await updateNorthStarPosition(nodeId, x, y);
        } else {
          await updateProjectPosition(nodeId, x, y);
        }

        // Success - clear saved indicator after 2 seconds
        if (savedTimeoutRef.current) {
          clearTimeout(savedTimeoutRef.current);
        }
        setSyncStatus("saved");
        setSyncMessage("Position saved");
        savedTimeoutRef.current = setTimeout(() => {
          setSyncStatus("idle");
          setSyncMessage(undefined);
        }, 2000);

        // Remove from pending saves
        pendingSaves.current.delete(nodeId);
      } catch (error) {
        console.error(
          `Position save attempt ${attempt}/${maxAttempts} failed:`,
          error
        );

        // Retry with exponential backoff if attempts remaining
        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          setSyncMessage(`Retrying save (${attempt}/${maxAttempts})...`);

          await new Promise((resolve) => setTimeout(resolve, delay));
          return savePositionWithRetry(nodeId, x, y, nodeType, attempt + 1);
        } else {
          // All retries exhausted
          setSyncStatus("error");
          setSyncMessage("Failed to save position");
          toast.error("Failed to save node position after 3 attempts");
          pendingSaves.current.delete(nodeId);

          // Clear error status after 5 seconds
          setTimeout(() => {
            setSyncStatus("idle");
            setSyncMessage(undefined);
          }, 5000);
        }
      }
    },
    []
  );

  const handleNodeDragStop = useCallback(
    (_event: any, node: Node) => {
      // Don't save position for user-center node
      if (node.id === "user-center") return;

      // Skip if already saving this node
      if (pendingSaves.current.has(node.id)) {
        return;
      }

      // Mark as pending and start save
      pendingSaves.current.add(node.id);
      setSyncStatus("saving");
      setSyncMessage("Saving position...");

      // Save immediately with retry logic
      savePositionWithRetry(
        node.id,
        node.position.x,
        node.position.y,
        node.type
      );
    },
    [savePositionWithRetry]
  );

  // Flush is now a no-op since we save immediately
  // Kept for backwards compatibility
  const flush = useCallback(() => {
    // No-op: immediate saves mean nothing to flush
  }, []);

  return {
    syncStatus,
    syncMessage,
    handleNodeDragStop,
    flush,
  };
}
