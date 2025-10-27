/**
 * PositionSyncManager - Batched Position Synchronization
 *
 * Manages batched, debounced position updates for journey projects and milestones.
 * Instead of writing to the database on every drag event, this manager collects
 * dirty nodes and syncs them in batches after a configurable delay.
 *
 * Key Features:
 * - Debounced writes (default: 10 seconds after last change)
 * - Separate tracking for projects and milestones
 * - Sync status notifications for UI feedback
 * - Error recovery with retry logic
 * - Idempotent writes
 *
 * Usage:
 * ```typescript
 * const syncManager = PositionSyncManager.getInstance();
 *
 * // Mark a node as dirty (needs sync)
 * syncManager.markProjectDirty(projectId, x, y);
 * syncManager.markMilestoneDirty(milestoneId, x, y);
 *
 * // Listen to sync status changes
 * syncManager.onStatusChange((status) => {
 *   console.log('Sync status:', status);
 * });
 *
 * // Force immediate sync (e.g., on component unmount)
 * await syncManager.flush();
 * ```
 */

import {
  batchUpdateProjectPositions,
  batchUpdateMilestonePositions,
  PositionUpdateItem,
} from "@/lib/supabase/position-sync";

export type SyncStatus = "idle" | "saving" | "saved" | "error";

export interface SyncStatusEvent {
  status: SyncStatus;
  message?: string;
  error?: Error;
}

type StatusChangeListener = (event: SyncStatusEvent) => void;

/**
 * Singleton manager for batched position synchronization
 */
export class PositionSyncManager {
  private static instance: PositionSyncManager | null = null;

  // Dirty nodes tracking
  private dirtyProjects: Map<string, { x: number; y: number }> = new Map();
  private dirtyMilestones: Map<string, { x: number; y: number }> = new Map();

  // Sync state
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private currentStatus: SyncStatus = "idle";

  // Configuration
  private readonly debounceInterval: number = 10000; // 10 seconds
  private readonly maxRetries: number = 3;
  private retryCount: number = 0;

  // Event listeners
  private statusChangeListeners: Set<StatusChangeListener> = new Set();

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): PositionSyncManager {
    if (!PositionSyncManager.instance) {
      PositionSyncManager.instance = new PositionSyncManager();
    }
    return PositionSyncManager.instance;
  }

  /**
   * Mark a project as dirty (needs position sync)
   */
  public markProjectDirty(id: string, x: number, y: number): void {
    this.dirtyProjects.set(id, { x, y });
    this.scheduleSync();
  }

  /**
   * Mark a milestone as dirty (needs position sync)
   */
  public markMilestoneDirty(id: string, x: number, y: number): void {
    this.dirtyMilestones.set(id, { x, y });
    this.scheduleSync();
  }

  /**
   * Schedule a debounced sync
   * Resets the timer on each call (last write wins)
   */
  private scheduleSync(): void {
    // Clear existing timer
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    // Schedule new sync after debounce interval
    this.syncTimer = setTimeout(() => {
      this.syncToDatabase();
    }, this.debounceInterval);
  }

  /**
   * Force immediate sync without debounce
   * Useful for cleanup on component unmount
   */
  public async flush(): Promise<void> {
    // Clear any pending timer
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }

    // Sync immediately if there are dirty items
    if (this.hasDirtyItems()) {
      await this.syncToDatabase();
    }
  }

  /**
   * Check if there are any dirty items to sync
   */
  private hasDirtyItems(): boolean {
    return this.dirtyProjects.size > 0 || this.dirtyMilestones.size > 0;
  }

  /**
   * Sync dirty items to database
   */
  private async syncToDatabase(): Promise<void> {
    // Prevent concurrent syncs
    if (this.isSyncing) {
      return;
    }

    // Nothing to sync
    if (!this.hasDirtyItems()) {
      return;
    }

    this.isSyncing = true;
    this.updateStatus("saving");

    try {
      // Collect dirty items into arrays
      const projectItems: PositionUpdateItem[] = Array.from(
        this.dirtyProjects.entries()
      ).map(([id, pos]) => ({ id, x: pos.x, y: pos.y }));

      const milestoneItems: PositionUpdateItem[] = Array.from(
        this.dirtyMilestones.entries()
      ).map(([id, pos]) => ({ id, x: pos.x, y: pos.y }));

      // Execute batch updates in parallel
      const promises: Promise<void>[] = [];

      if (projectItems.length > 0) {
        promises.push(batchUpdateProjectPositions(projectItems));
      }

      if (milestoneItems.length > 0) {
        promises.push(batchUpdateMilestonePositions(milestoneItems));
      }

      await Promise.all(promises);

      // Success - clear dirty items
      this.dirtyProjects.clear();
      this.dirtyMilestones.clear();
      this.retryCount = 0;

      this.updateStatus("saved", "All changes saved");

      // Auto-transition back to idle after 2 seconds
      setTimeout(() => {
        if (this.currentStatus === "saved") {
          this.updateStatus("idle");
        }
      }, 2000);
    } catch (error) {
      console.error("Error syncing positions:", error);

      // Retry logic
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(
          `Retrying sync (attempt ${this.retryCount}/${this.maxRetries})...`
        );

        // Exponential backoff: 1s, 2s, 4s
        const retryDelay = Math.pow(2, this.retryCount - 1) * 1000;

        setTimeout(() => {
          this.syncToDatabase();
        }, retryDelay);
      } else {
        // Max retries exceeded
        this.retryCount = 0;
        this.updateStatus(
          "error",
          "Failed to save changes",
          error instanceof Error ? error : new Error("Unknown error")
        );

        // Clear error status after 5 seconds
        setTimeout(() => {
          if (this.currentStatus === "error") {
            this.updateStatus("idle");
          }
        }, 5000);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Update sync status and notify listeners
   */
  private updateStatus(
    status: SyncStatus,
    message?: string,
    error?: Error
  ): void {
    this.currentStatus = status;

    const event: SyncStatusEvent = { status, message, error };

    // Notify all listeners
    this.statusChangeListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error("Error in status change listener:", err);
      }
    });
  }

  /**
   * Subscribe to sync status changes
   * Returns an unsubscribe function
   */
  public onStatusChange(listener: StatusChangeListener): () => void {
    this.statusChangeListeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.statusChangeListeners.delete(listener);
    };
  }

  /**
   * Get current sync status
   */
  public getStatus(): SyncStatus {
    return this.currentStatus;
  }

  /**
   * Get count of dirty items waiting to sync
   */
  public getDirtyCount(): { projects: number; milestones: number } {
    return {
      projects: this.dirtyProjects.size,
      milestones: this.dirtyMilestones.size,
    };
  }

  /**
   * Clean up resources (call on app shutdown)
   */
  public async dispose(): Promise<void> {
    // Flush pending changes
    await this.flush();

    // Clear all listeners
    this.statusChangeListeners.clear();

    // Clear timer
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }

    // Reset singleton instance
    PositionSyncManager.instance = null;
  }
}

// Export singleton instance getter
export const getPositionSyncManager = () => PositionSyncManager.getInstance();
