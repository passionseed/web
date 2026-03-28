/**
 * PageBuilder State Management Hook
 *
 * Manages the state for the entire page builder:
 * - Page metadata (title, context, reflection prompts)
 * - Activities list
 * - Dirty state tracking
 * - Activity operations (add, edit, delete, reorder)
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { FullPathActivity } from '@/types/pathlab';
import { toast } from 'sonner';

export interface PageBuilderPage {
  id?: string;
  title: string | null;
  context_text: string;
  reflection_prompts: string[];
  activities: FullPathActivity[];
}

export interface UsePageBuilderOptions {
  initialPage: PageBuilderPage;
  onSave: (page: PageBuilderPage) => Promise<void>;
  maxActivities?: number;
}

export function usePageBuilder({
  initialPage,
  onSave,
  maxActivities = 20,
}: UsePageBuilderOptions) {
  const [page, setPage] = useState<PageBuilderPage>(initialPage);
  const [isSaving, setIsSaving] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);

  // Snapshot for dirty tracking
  const snapshotRef = useRef(JSON.stringify(initialPage));

  // Sync state when initialPage changes (e.g., on page navigation or data refresh)
  useEffect(() => {
    setPage(initialPage);
    snapshotRef.current = JSON.stringify(initialPage);
  }, [initialPage.id]); // Only sync when page ID changes to avoid overwriting user edits

  // Dirty state
  const isDirty = useMemo(() => {
    return JSON.stringify(page) !== snapshotRef.current;
  }, [page]);

  // Activity count
  const activityCount = page.activities.length;
  const canAddActivity = activityCount < maxActivities;

  // Update page metadata
  const updatePage = useCallback(
    (updates: Partial<Omit<PageBuilderPage, 'activities'>>) => {
      setPage(prev => ({ ...prev, ...updates }));
    },
    []
  );

  // Add activity
  const addActivity = useCallback(
    (activity: FullPathActivity) => {
      if (!canAddActivity) {
        toast.error(`Maximum ${maxActivities} activities per page`);
        return false;
      }

      setPage(prev => ({
        ...prev,
        activities: [...prev.activities, activity],
      }));

      return true;
    },
    [canAddActivity, maxActivities]
  );

  // Update activity
  const updateActivity = useCallback((activityId: string, updates: Partial<FullPathActivity>) => {
    setPage(prev => ({
      ...prev,
      activities: prev.activities.map(a =>
        a.id === activityId ? { ...a, ...updates } : a
      ),
    }));
  }, []);

  // Remove activity
  const removeActivity = useCallback((activityId: string) => {
    setPage(prev => ({
      ...prev,
      activities: prev.activities.filter(a => a.id !== activityId),
    }));
  }, []);

  // Reorder activities
  const reorderActivities = useCallback((newOrder: FullPathActivity[]) => {
    // Update display_order based on array position
    const reordered = newOrder.map((activity, index) => ({
      ...activity,
      display_order: index,
    }));

    setPage(prev => ({
      ...prev,
      activities: reordered,
    }));
  }, []);

  // Initialize activities (client-side load) — updates state + snapshot so no dirty flag
  const initActivities = useCallback((activities: FullPathActivity[]) => {
    setPage(prev => {
      const next = { ...prev, activities };
      snapshotRef.current = JSON.stringify(next);
      return next;
    });
  }, []);

  // Save page
  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(page);
      snapshotRef.current = JSON.stringify(page);
      toast.success('Page saved');
    } catch (error) {
      console.error('[usePageBuilder] Save failed:', error);
      toast.error('Failed to save page');
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [page, onSave]);

  // Get activity by ID
  const getActivity = useCallback(
    (activityId: string) => {
      return page.activities.find(a => a.id === activityId);
    },
    [page.activities]
  );

  // Calculate total estimated time
  const totalEstimatedMinutes = useMemo(() => {
    return page.activities.reduce((sum, activity) => {
      return sum + (activity.estimated_minutes || 0);
    }, 0);
  }, [page.activities]);

  // Check if activity can be moved
  const canMoveActivity = useCallback(
    (activityId: string, direction: 'up' | 'down') => {
      const index = page.activities.findIndex(a => a.id === activityId);
      if (index === -1) return false;

      if (direction === 'up') return index > 0;
      if (direction === 'down') return index < page.activities.length - 1;

      return false;
    },
    [page.activities]
  );

  // Move activity up/down
  const moveActivity = useCallback(
    (activityId: string, direction: 'up' | 'down') => {
      const index = page.activities.findIndex(a => a.id === activityId);
      if (index === -1 || !canMoveActivity(activityId, direction)) return;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      const newActivities = [...page.activities];
      const [removed] = newActivities.splice(index, 1);
      newActivities.splice(newIndex, 0, removed);

      reorderActivities(newActivities);
    },
    [page.activities, canMoveActivity, reorderActivities]
  );

  return {
    // State
    page,
    isDirty,
    isSaving,
    activityCount,
    canAddActivity,
    totalEstimatedMinutes,
    editingActivityId,

    // Page operations
    updatePage,
    save,

    // Activity operations
    addActivity,
    updateActivity,
    removeActivity,
    reorderActivities,
    initActivities,
    getActivity,
    moveActivity,
    canMoveActivity,

    // UI state
    setEditingActivityId,
  };
}
