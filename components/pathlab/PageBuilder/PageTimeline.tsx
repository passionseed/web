"use client";

import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Edit, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FullPathActivity } from '@/types/pathlab';

interface PageTimelineProps {
  activities: FullPathActivity[];
  onReorder: (newOrder: FullPathActivity[]) => void;
  onEdit: (activity: FullPathActivity) => void;
  onDelete: (activityId: string) => void;
  onMoveUp?: (activityId: string) => void;
  onMoveDown?: (activityId: string) => void;
  disabled?: boolean;
}

function SortableActivityCard({
  activity,
  index,
  totalCount,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  disabled,
}: {
  activity: FullPathActivity;
  index: number;
  totalCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  disabled?: boolean;
}) {
  // Debug logging
  console.log('[SortableActivityCard] Rendering:', {
    activityId: activity.id,
    title: activity.title,
    index,
    orderNumber: index + 1,
    totalCount,
    hasOnMoveUp: !!onMoveUp,
    hasOnMoveDown: !!onMoveDown,
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const contentCount = activity.path_content?.length || 0;
  const hasAssessment = !!activity.path_assessment;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'border-neutral-800 bg-neutral-900/50',
        isDragging && 'opacity-50',
        disabled && 'opacity-50'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Order Number and Reorder Buttons */}
          <div
            className="flex flex-col items-center gap-1 pt-1 shrink-0"
            data-order-controls={`activity-${index + 1}`}
          >
            <div
              className="text-xs text-neutral-400 font-semibold min-w-[2rem] text-center"
              data-order-number={index + 1}
            >
              #{index + 1}
            </div>
            <div className="flex flex-col gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-neutral-400 hover:text-white disabled:opacity-30"
                onClick={onMoveUp}
                disabled={disabled || index === 0}
                title="Move up"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-neutral-400 hover:text-white disabled:opacity-30"
                onClick={onMoveDown}
                disabled={disabled || index === totalCount - 1}
                title="Move down"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Drag Handle */}
          <button
            type="button"
            className="cursor-grab touch-none text-neutral-400 hover:text-white active:cursor-grabbing mt-1 shrink-0"
            {...attributes}
            {...listeners}
            disabled={disabled}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          {/* Activity Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white mb-1">{activity.title}</h4>
                {activity.instructions && (
                  <p className="text-xs text-neutral-400 line-clamp-2">
                    {activity.instructions}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onEdit}
                  disabled={disabled}
                  className="h-8 w-8 p-0 text-neutral-400 hover:text-white"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDelete}
                  disabled={disabled}
                  className="h-8 w-8 p-0 text-neutral-400 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs border-neutral-700 text-neutral-400">
                {activity.activity_type}
              </Badge>

              {contentCount > 0 && (
                <Badge variant="outline" className="text-xs border-blue-700 text-blue-400">
                  {contentCount} content {contentCount !== 1 ? 'items' : 'item'}
                </Badge>
              )}

              {hasAssessment && (
                <Badge variant="outline" className="text-xs border-green-700 text-green-400">
                  Has assessment
                </Badge>
              )}

              {activity.estimated_minutes && (
                <div className="flex items-center gap-1 text-xs text-neutral-500">
                  <Clock className="h-3 w-3" />
                  {activity.estimated_minutes} min
                </div>
              )}

              {activity.is_required && (
                <Badge variant="outline" className="text-xs border-amber-700 text-amber-400">
                  Required
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PageTimeline({
  activities,
  onReorder,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  disabled = false,
}: PageTimelineProps) {
  // Debug logging
  console.log('[PageTimeline] Rendering with activities:', {
    count: activities.length,
    activities: activities.map((a, idx) => ({
      index: idx,
      id: a.id,
      title: a.title,
      display_order: a.display_order,
    })),
    hasOnMoveUp: !!onMoveUp,
    hasOnMoveDown: !!onMoveDown,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activityIds = useMemo(() => activities.map(a => a.id), [activities]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || disabled) return;

    const oldIndex = activities.findIndex(a => a.id === active.id);
    const newIndex = activities.findIndex(a => a.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(activities, oldIndex, newIndex);
      onReorder(newOrder);
    }
  };

  // Empty state
  if (activities.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">📚</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            No activities yet
          </h3>
          <p className="text-sm text-neutral-400 max-w-sm">
            Select a template from the library or click "Add Activity" to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={activityIds} strategy={verticalListSortingStrategy}>
        {/* DEBUG: Visible debug info */}
        <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded text-xs text-red-300">
          <div>DEBUG PageTimeline:</div>
          <div>Activities count: {activities.length}</div>
          <div>Has onMoveUp: {onMoveUp ? 'YES' : 'NO'}</div>
          <div>Has onMoveDown: {onMoveDown ? 'YES' : 'NO'}</div>
        </div>

        <div className="space-y-3">
          {activities.map((activity, index) => (
            <SortableActivityCard
              key={activity.id}
              activity={activity}
              index={index}
              totalCount={activities.length}
              onEdit={() => onEdit(activity)}
              onDelete={() => onDelete(activity.id)}
              onMoveUp={onMoveUp ? () => onMoveUp(activity.id) : undefined}
              onMoveDown={onMoveDown ? () => onMoveDown(activity.id) : undefined}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
