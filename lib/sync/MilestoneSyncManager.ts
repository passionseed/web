/**
 * MilestoneSyncManager - Debounced Milestone Field Updates
 *
 * Manages batched, debounced field updates for journey milestones.
 * Instead of writing to the database on every keystroke or change,
 * this manager collects dirty fields and syncs them after a configurable delay.
 *
 * Key Features:
 * - Debounced writes (default: 2 seconds after last change)
 * - Per-milestone field tracking
 * - Sync status notifications for UI feedback
 * - Error recovery with retry logic
 * - Idempotent writes
 *
 * Usage:
 * ```typescript
 * const syncManager = MilestoneSyncManager.getInstance();
 *
 * // Mark a field as dirty (needs sync)
 * syncManager.markFieldDirty(milestoneId, 'title', 'New Title');
 * syncManager.markFieldDirty(milestoneId, 'description', 'Updated description');
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

import { updateMilestone } from "@/lib/supabase/journey";
import { ProjectMilestone } from "@/types/journey";

export type SyncStatus = "idle" | "saving" | "saved" | "error";

export interface SyncStatusEvent {
  status: SyncStatus;
  message?: string;
  error?: Error;
}

type StatusChangeListener = (event: SyncStatusEvent) => void;
type MilestoneFieldUpdate = Partial<ProjectMilestone>;

/**
 * Singleton manager for batched milestone field synchronization
 */
export class MilestoneSyncManager {
  private static instance: MilestoneSyncManager | null = null;

  // Dirty fields tracking - Map<milestoneId, fieldsToUpdate>
  private dirtyMilestones: Map<string, MilestoneFieldUpdate> = new Map();

  // Sync state
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private currentStatus: SyncStatus = "idle";

  // Configuration
  private readonly debounceInterval: number = 2000; // 2 seconds
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
  public static getInstance(): MilestoneSyncManager {
    if (!MilestoneSyncManager.instance) {
      MilestoneSyncManager.instance = new MilestoneSyncManager();
    }
    return MilestoneSyncManager.instance;
  }

  /**
   * Mark a field as dirty (needs sync)
   */
  public markFieldDirty(
    milestoneId: string,
    field: keyof ProjectMilestone,
    value: any
  ): void {
    // Get existing dirty fields for this milestone or create new entry
    const existingFields = this.dirtyMilestones.get(milestoneId) || {};

    // Merge the new field update
    this.dirtyMilestones.set(milestoneId, {
      ...existingFields,
      [field]: value,
    });

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
    return this.dirtyMilestones.size > 0;
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
      // Collect all update promises
      const updatePromises: Promise<void>[] = [];

      for (const [milestoneId, fields] of this.dirtyMilestones.entries()) {
        updatePromises.push(
          updateMilestone(milestoneId, fields).then(() => {
            // Update completed successfully
          })
        );
      }

      // Execute all updates in parallel
      await Promise.all(updatePromises);

      // Success - clear dirty items
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
      console.error("Error syncing milestone fields:", error);

      // Retry logic
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(
          `Retrying milestone sync (attempt ${this.retryCount}/${this.maxRetries})...`
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
   * Get count of dirty milestones waiting to sync
   */
  public getDirtyCount(): number {
    return this.dirtyMilestones.size;
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
    MilestoneSyncManager.instance = null;
  }
}

// Export singleton instance getter
export const getMilestoneSyncManager = () => MilestoneSyncManager.getInstance();
