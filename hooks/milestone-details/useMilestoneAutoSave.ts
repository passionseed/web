/**
 * useMilestoneAutoSave - React hook for auto-saving milestone fields
 *
 * Provides a simple interface for marking milestone fields as dirty
 * and auto-syncing them to the database with debouncing.
 *
 * Features:
 * - Automatic cleanup on unmount (flushes pending changes)
 * - Status tracking for UI feedback
 * - Manual flush capability
 * - Error handling with retry logic
 *
 * Usage:
 * ```typescript
 * const { saveField, status, flush, error } = useMilestoneAutoSave();
 *
 * // Mark a field for auto-save
 * saveField(milestoneId, 'title', 'New Title');
 * saveField(milestoneId, 'description', 'Updated description');
 *
 * // Manually flush (optional - happens automatically on unmount)
 * await flush();
 * ```
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  MilestoneSyncManager,
  SyncStatus,
  SyncStatusEvent,
} from "@/lib/sync/MilestoneSyncManager";
import { ProjectMilestone } from "@/types/journey";

export interface UseMilestoneAutoSaveReturn {
  /**
   * Mark a field as dirty and schedule auto-save
   */
  saveField: (
    milestoneId: string,
    field: keyof ProjectMilestone,
    value: any
  ) => void;

  /**
   * Current sync status
   */
  status: SyncStatus;

  /**
   * Force immediate save of all pending changes
   */
  flush: () => Promise<void>;

  /**
   * Last error if sync failed
   */
  error: Error | null;
}

export function useMilestoneAutoSave(): UseMilestoneAutoSaveReturn {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const syncManagerRef = useRef<MilestoneSyncManager | null>(null);
  const lastErrorToastRef = useRef<string | number | null>(null);

  // Initialize sync manager on mount
  useEffect(() => {
    syncManagerRef.current = MilestoneSyncManager.getInstance();

    // Subscribe to status changes
    const unsubscribe = syncManagerRef.current.onStatusChange(
      (event: SyncStatusEvent) => {
        setStatus(event.status);

        if (event.error) {
          setError(event.error);

          // Show error toast (only once per error)
          if (event.message) {
            // Dismiss previous error toast if exists
            if (lastErrorToastRef.current) {
              toast.dismiss(lastErrorToastRef.current);
            }

            // Show new error toast
            lastErrorToastRef.current = toast.error(event.message, {
              description: event.error.message,
              duration: 5000,
            });
          }
        } else {
          setError(null);
        }
      }
    );

    // Cleanup on unmount - flush pending changes
    return () => {
      unsubscribe();

      // Flush any pending changes before unmounting
      if (syncManagerRef.current) {
        syncManagerRef.current.flush().catch((err) => {
          console.error("Error flushing milestone changes on unmount:", err);
        });
      }
    };
  }, []);

  /**
   * Mark a field as dirty and schedule auto-save
   */
  const saveField = useCallback(
    (milestoneId: string, field: keyof ProjectMilestone, value: any) => {
      if (!syncManagerRef.current) {
        console.error("MilestoneSyncManager not initialized");
        return;
      }

      syncManagerRef.current.markFieldDirty(milestoneId, field, value);
    },
    []
  );

  /**
   * Force immediate save of all pending changes
   */
  const flush = useCallback(async () => {
    if (!syncManagerRef.current) {
      console.error("MilestoneSyncManager not initialized");
      return;
    }

    await syncManagerRef.current.flush();
  }, []);

  return {
    saveField,
    status,
    flush,
    error,
  };
}
