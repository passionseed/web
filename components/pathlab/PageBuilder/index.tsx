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
  } = usePageBuilder({
    initialPage: {
      id: pageId,
      title: initialTitle,
      context_text: initialContextText,
      reflection_prompts: initialReflectionPrompts,
      activities: initialActivities,
    },
    onSave: async (pageData) => {
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
    },
    maxActivities: 20,
  });

  // Auto-save
  const { manualSave } = useAutoSave({
    pageId,
    data: page,
    onSave: save,
    debounceMs: 2000,
    enabled: true,
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

  // Handle activity creation
  const handleActivityCreate = useCallback(
    async (activityData: any) => {
      try {
        // Create activity via API
        const response = await fetch(`/api/pathlab/pages/${pageId}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activities: [
              {
                path_day_id: pageId,
                title: activityData.title,
                instructions: activityData.instructions,
                activity_type: activityData.activity_type || 'learning',
                display_order: activityCount,
                estimated_minutes: activityData.estimated_minutes,
                is_required: activityData.is_required ?? true,
              },
            ],
            content: activityData.content ? [activityData.content] : undefined,
            assessments: activityData.assessment ? [activityData.assessment] : undefined,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create activity');
        }

        const result = await response.json();
        const newActivities = result.activities || [];

        if (newActivities.length > 0) {
          addActivity(newActivities[0]);
          toast.success('Activity created');
          setShowActivityEditor(false);
        }
      } catch (error) {
        console.error('[PageBuilder] Failed to create activity:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to create activity');
      }
    },
    [pageId, activityCount, addActivity]
  );

  // Handle activity edit
  const handleActivityEdit = useCallback((activity: FullPathActivity) => {
    setEditingActivity(activity);
    setShowActivityEditor(true);
  }, []);

  // Handle activity update
  const handleActivityUpdate = useCallback(
    async (activityData: any) => {
      if (!editingActivity) return;

      try {
        // Update activity via API
        const response = await fetch(`/api/pathlab/activities`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityId: editingActivity.id,
            updates: {
              title: activityData.title,
              instructions: activityData.instructions,
              activity_type: activityData.activity_type,
              estimated_minutes: activityData.estimated_minutes,
              is_required: activityData.is_required,
            },
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update activity');
        }

        const result = await response.json();
        updateActivity(editingActivity.id, result.activity);

        toast.success('Activity updated');
        setShowActivityEditor(false);
        setEditingActivity(undefined);
      } catch (error) {
        console.error('[PageBuilder] Failed to update activity:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to update activity');
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
              onClick={manualSave}
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
                  onSave={editingActivity ? handleActivityUpdate : handleActivityCreate}
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
              onReorder={reorderActivities}
              onEdit={handleActivityEdit}
              onDelete={handleActivityDelete}
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
