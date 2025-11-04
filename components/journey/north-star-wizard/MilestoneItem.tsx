/**
 * Milestone List Item Component
 * Displays a single milestone with edit/delete actions
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { GripVertical, Pencil, X, Calendar } from "lucide-react";
import { SMARTMilestone } from "./types";
import { translations } from "./translations";
import type { Language } from "./types";
import { format } from "date-fns";

interface MilestoneItemProps {
  milestone: SMARTMilestone;
  index: number;
  language: Language;
  isDragging: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export function MilestoneItem({
  milestone,
  index,
  language,
  isDragging,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: MilestoneItemProps) {
  const t = translations[language];

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex items-start gap-2 p-3 bg-white/60 dark:bg-black/20 rounded-lg border transition-all ${
        isDragging
          ? "opacity-50 border-blue-400 dark:border-blue-500"
          : "border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500"
      } group cursor-move`}
    >
      {/* Drag Handle */}
      <div className="mt-1 text-blue-400 dark:text-blue-500 cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Number */}
      <span className="text-blue-600 dark:text-blue-400 font-semibold min-w-[24px] mt-1">
        {index + 1}.
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-base text-blue-900 dark:text-blue-100 font-medium">
          {milestone.title}
        </p>

        {/* Dates */}
        {(milestone.startDate || milestone.dueDate) && (
          <div className="flex items-center gap-3 mt-1 text-xs text-blue-700 dark:text-blue-300">
            {milestone.startDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(milestone.startDate)}
              </span>
            )}
            {milestone.startDate && milestone.dueDate && <span>→</span>}
            {milestone.dueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(milestone.dueDate)}
              </span>
            )}
          </div>
        )}

        {/* Measurable */}
        {milestone.measurable && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
            📊 {milestone.measurable}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20"
          title={t.editMilestone}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
          title={t.removeMilestone}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
