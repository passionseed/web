"use client";

import { useState, useCallback } from 'react';
import { Plus, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { ActivityLibrary } from './ActivityLibrary';
import { PageTimeline } from './PageTimeline';
import { PageSettings } from './PageSettings';
import { PathActivityEditor } from '../PathActivityEditor';

import { usePageBuilder } from './hooks/usePageBuilder';
import { useAutoSave } from './hooks/useAutoSave';
import { useUnsavedChanges } from './hooks/useUnsavedChanges';

import type { FullPathActivity } from '@/types/pathlab';

interface PageBuilderProps {
  pageId: string;
  pathId: string;
  initialTitle: string | null;
  initialContextText: string;
  initialReflectionPrompts: string[];
  initialActivities: FullPathActivity[];
}

export function PageBuilder({
  pageId,
  pathId,
  initialTitle,
  initialContextText,
  initialReflectionPrompts,
  initialActivities,
}: PageBuilderProps) {
  // Debug logging
  console.log('[PageBuilder] Rendering with initial activities:', {
    pageId,
    count: initialActivities.length,
    activities: initialActivities.map((a, idx) => ({
      index: idx,
      id: a.id,
      title: a.title,
      display_order: a.display_order,
    })),
  });

  const [showActivityEditor, setShowActivityEditor] = useState(false);
  const [editingActivity, setEditingActivity] = useState<FullPathActivity | undefined>(undefined);

  // Page builder state
  const {
    page,
    isDirty,
    isSaving,
    activityCount,
    canAddActivity,
    totalEstimatedMinutes,
    updatePage,
    save,
    addActivity,
    updateActivity,
    removeActivity,
    reorderActivities,
    moveActivity,
  } = usePageBuilder({
    initialPage: {
      id: pageId,
      title: initialTitle,
      context_text: initialContextText,
      reflection_prompts: initialReflectionPrompts,
      activities: initialActivities,
    },
    onSave: async (pageData) => {
      console.log('[PageBuilder onSave] Saving page data:', {
        pageId,
        title: pageData.title,
        activityCount: pageData.activities.length,
        activities: pageData.activities.map((a, idx) => ({
          index: idx,
          id: a.id,
          title: a.title,
          display_order: a.display_order,
        })),
      });

      // Save page metadata
      const response = await fetch(`/api/pathlab/days`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pathId,
          totalDays: 1, // Single page
          days: [
            {
              day_number: 1,
              title: pageData.title,
              context_text: pageData.context_text,
              reflection_prompts: pageData.reflection_prompts,
              node_ids: [], // Legacy field
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save page');
      }

      console.log('[PageBuilder onSave] Page metadata saved, now saving activity order');

      // ALSO save the activity order
      if (pageData.activities && pageData.activities.length > 0) {
        const activityIds = pageData.activities.map(a => a.id);
        console.log('[PageBuilder onSave] Saving activity order:', {
          dayId: pageId,
          activityIds,
        });

        const orderResponse = await fetch('/api/pathlab/activities', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dayId: pageId,
            activityIds,
          }),
        });

        if (!orderResponse.ok) {
          const error = await orderResponse.json();
          console.error('[PageBuilder onSave] Failed to save activity order:', error);
          throw new Error(error.error || 'Failed to save activity order');
        }

        console.log('[PageBuilder onSave] Activity order saved successfully');
      }
    },
    maxActivities: 20,
  });

  // Auto-save DISABLED - manual save only
  const { manualSave } = useAutoSave({
    pageId,
    data: page,
    onSave: save,
    debounceMs: 2000,
    enabled: false, // DISABLED auto-save
  });

  // Unsaved changes warning
  useUnsavedChanges(isDirty);

  // Handle template selection from library
  const handleTemplateSelect = useCallback(
    async (template: any) => {
      if (!canAddActivity) {
        toast.error('Maximum 20 activities per page');
        return;
      }

      setShowActivityEditor(true);
      setEditingActivity(undefined);

      // Pre-fill editor with template data (will be handled by PathActivityEditor)
      toast.success(`Selected: ${template.title}`);
    },
    [canAddActivity]
  );

  // Handle activity creation refresh (PathActivityEditor handles the actual creation)
  const handleActivityCreateRefresh = useCallback(
    async () => {
      try {
        // Fetch all activities for this page to get the newly created one
        const response = await fetch(`/api/pathlab/activities?dayId=${pageId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch activities');
        }

        const result = await response.json();
        const fetchedActivities = result.activities || [];

        // Find the new activity (the one not in our current list)
        const currentIds = new Set(page.activities.map(a => a.id));
        const newActivity = fetchedActivities.find((a: FullPathActivity) => !currentIds.has(a.id));

        if (newActivity) {
          addActivity(newActivity);
        }

        setShowActivityEditor(false);
        setEditingActivity(undefined);
      } catch (error) {
        console.error('[PageBuilder] Failed to refresh activities:', error);
        toast.error('Failed to refresh activity data');
      }
    },
    [pageId, page.activities, addActivity]
  );

  // Handle activity edit
  const handleActivityEdit = useCallback((activity: FullPathActivity) => {
    setEditingActivity(activity);
    setShowActivityEditor(true);
  }, []);

  // Handle activity update (refresh callback for PathActivityEditor)
  const handleActivityUpdateRefresh = useCallback(
    async () => {
      if (!editingActivity) return;

      try {
        // Fetch the updated activity with all nested data
        const response = await fetch(`/api/pathlab/activities?activityId=${editingActivity.id}`);

        if (!response.ok) {
          throw new Error('Failed to fetch updated activity');
        }

        const result = await response.json();
        updateActivity(editingActivity.id, result.activity);

        setShowActivityEditor(false);
        setEditingActivity(undefined);
      } catch (error) {
        console.error('[PageBuilder] Failed to refresh activity:', error);
        toast.error('Failed to refresh activity data');
      }
    },
    [editingActivity, updateActivity]
  );

  // Handle activity delete
  const handleActivityDelete = useCallback(
    async (activityId: string) => {
      if (!confirm('Delete this activity? This cannot be undone.')) return;

      try {
        const response = await fetch(`/api/pathlab/activities?activityId=${activityId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete activity');
        }

        removeActivity(activityId);
        toast.success('Activity deleted');
      } catch (error) {
        console.error('[PageBuilder] Failed to delete activity:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to delete activity');
      }
    },
    [removeActivity]
  );

  // Handle activity reorder (save to backend)
  const handleActivityReorder = useCallback(
    async (newOrder: FullPathActivity[]) => {
      console.log('[PageBuilder] handleActivityReorder called:', {
        pageId,
        newOrderCount: newOrder.length,
        newOrder: newOrder.map((a, idx) => ({
          index: idx,
          id: a.id,
          title: a.title,
          display_order: a.display_order,
        })),
      });

      // Update local state immediately for better UX
      reorderActivities(newOrder);

      // Save to backend
      try {
        const activityIds = newOrder.map(a => a.id);
        console.log('[PageBuilder] Sending reorder request to API:', {
          dayId: pageId,
          activityIds,
        });

        const response = await fetch('/api/pathlab/activities', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dayId: pageId,
            activityIds,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save activity order');
        }

        const result = await response.json();
        console.log('[PageBuilder] Reorder API response:', result);
        toast.success('Activity order saved');
      } catch (error) {
        console.error('[PageBuilder] Failed to save reorder:', error);
        toast.error('Failed to save activity order');
      }
    },
    [pageId, reorderActivities]
  );

  // Handle move activity up
  const handleMoveActivityUp = useCallback(
    async (activityId: string) => {
      console.log('[PageBuilder] handleMoveActivityUp called:', { activityId, pageId });

      moveActivity(activityId, 'up');

      // Save to backend
      try {
        const activityIds = page.activities.map(a => a.id);
        const currentIndex = activityIds.indexOf(activityId);
        if (currentIndex > 0) {
          [activityIds[currentIndex - 1], activityIds[currentIndex]] =
            [activityIds[currentIndex], activityIds[currentIndex - 1]];
        }

        console.log('[PageBuilder] Sending move up request:', {
          dayId: pageId,
          activityIds,
        });

        const response = await fetch('/api/pathlab/activities', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dayId: pageId,
            activityIds,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save activity order');
        }

        const result = await response.json();
        console.log('[PageBuilder] Move up API response:', result);
      } catch (error) {
        console.error('[PageBuilder] Failed to save move:', error);
      }
    },
    [pageId, page.activities, moveActivity]
  );

  // Handle move activity down
  const handleMoveActivityDown = useCallback(
    async (activityId: string) => {
      console.log('[PageBuilder] handleMoveActivityDown called:', { activityId, pageId });

      moveActivity(activityId, 'down');

      // Save to backend
      try {
        const activityIds = page.activities.map(a => a.id);
        const currentIndex = activityIds.indexOf(activityId);
        if (currentIndex < activityIds.length - 1) {
          [activityIds[currentIndex], activityIds[currentIndex + 1]] =
            [activityIds[currentIndex + 1], activityIds[currentIndex]];
        }

        console.log('[PageBuilder] Sending move down request:', {
          dayId: pageId,
          activityIds,
        });

        const response = await fetch('/api/pathlab/activities', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dayId: pageId,
            activityIds,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save activity order');
        }

        const result = await response.json();
        console.log('[PageBuilder] Move down API response:', result);
      } catch (error) {
        console.error('[PageBuilder] Failed to save move:', error);
      }
    },
    [pageId, page.activities, moveActivity]
  );

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900/80 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              {page.title || 'Page Builder'}
            </h1>
            <p className="text-sm text-neutral-400">
              {activityCount} {activityCount !== 1 ? 'activities' : 'activity'} • {totalEstimatedMinutes} min
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isDirty && (
              <span className="text-xs text-amber-400">Unsaved changes</span>
            )}

            <Button
              onClick={() => {
                console.log('========================================');
                console.log('[PageBuilder] SAVE BUTTON CLICKED');
                console.log('========================================');
                save();
              }}
              disabled={isSaving || !isDirty}
              className={cn(
                'transition-colors',
                isDirty
                  ? 'bg-white text-black hover:bg-neutral-200'
                  : 'bg-neutral-800 text-neutral-400'
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isDirty ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Page
                </>
              ) : (
                'Saved'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Three-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Activity Library */}
        <div className="w-80 border-r border-neutral-800 bg-neutral-900/50">
          <ActivityLibrary
            onSelectTemplate={handleTemplateSelect}
            disabled={!canAddActivity}
          />
        </div>

        {/* Center: Page Timeline */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Activities</h2>
              <Button
                onClick={() => {
                  setEditingActivity(undefined);
                  setShowActivityEditor(true);
                }}
                disabled={!canAddActivity}
                variant="outline"
                className="border-dashed border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Activity
              </Button>
            </div>

            {showActivityEditor ? (
              <Card className="border-2 border-primary/20 mb-6">
                <PathActivityEditor
                  dayId={pageId}
                  activity={editingActivity}
                  onSave={editingActivity ? handleActivityUpdateRefresh : handleActivityCreateRefresh}
                  onCancel={() => {
                    setShowActivityEditor(false);
                    setEditingActivity(undefined);
                  }}
                  isInline
                  displayOrder={activityCount}
                />
              </Card>
            ) : null}

            <PageTimeline
              activities={page.activities}
              onReorder={handleActivityReorder}
              onEdit={handleActivityEdit}
              onDelete={handleActivityDelete}
              onMoveUp={handleMoveActivityUp}
              onMoveDown={handleMoveActivityDown}
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Right: Page Settings */}
        <div className="w-96 border-l border-neutral-800 bg-neutral-900/50">
          <PageSettings
            title={page.title}
            contextText={page.context_text}
            reflectionPrompts={page.reflection_prompts}
            activityCount={activityCount}
            totalEstimatedMinutes={totalEstimatedMinutes}
            onUpdateTitle={title => updatePage({ title })}
            onUpdateContextText={context_text => updatePage({ context_text })}
            onUpdateReflectionPrompts={reflection_prompts =>
              updatePage({ reflection_prompts })
            }
            disabled={isSaving}
          />
        </div>
      </div>
    </div>
  );
}
