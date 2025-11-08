"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ProjectMilestone } from "@/types/journey";
import { updateMilestone } from "@/lib/supabase/journey";
import { Calendar, Clock } from "lucide-react";
import { getDefaultMilestoneDates, formatDuration, calculateDuration } from "@/lib/utils/gantt";

interface InlineEditableDatesProps {
  milestone: ProjectMilestone;
  onUpdate: (updatedMilestone?: ProjectMilestone) => void;
}

export function InlineEditableDates({
  milestone,
  onUpdate,
}: InlineEditableDatesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { startDate, endDate } = getDefaultMilestoneDates(milestone);

  const [startDateValue, setStartDateValue] = useState(
    format(startDate, "yyyy-MM-dd")
  );
  const [endDateValue, setEndDateValue] = useState(
    format(endDate, "yyyy-MM-dd")
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMilestone(milestone.id, {
        start_date: new Date(startDateValue).toISOString(),
        due_date: new Date(endDateValue).toISOString(),
      });
      onUpdate?.();
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update dates:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setStartDateValue(format(startDate, "yyyy-MM-dd"));
    setEndDateValue(format(endDate, "yyyy-MM-dd"));
    setIsEditing(false);
  };

  const duration = calculateDuration(
    new Date(startDateValue),
    new Date(endDateValue)
  );

  if (isEditing) {
    return (
      <div className="space-y-3">
        {/* Start Date */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Start Date
          </label>
          <input
            type="date"
            value={startDateValue}
            onChange={(e) => setStartDateValue(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            End Date (Due Date)
          </label>
          <input
            type="date"
            value={endDateValue}
            onChange={(e) => setEndDateValue(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Duration Display */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          <span>Duration: {formatDuration(duration)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="w-full text-left p-3 rounded border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 transition-colors group"
    >
      <div className="space-y-2">
        {/* Start Date */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span className="text-slate-400">Start:</span>
          <span className="text-slate-200 font-medium">
            {format(startDate, "MMM d, yyyy")}
          </span>
        </div>

        {/* End Date */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-red-400" />
          <span className="text-slate-400">Due:</span>
          <span className="text-slate-200 font-medium">
            {format(endDate, "MMM d, yyyy")}
          </span>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock className="w-3 h-3" />
          <span>Duration: {formatDuration(calculateDuration(startDate, endDate))}</span>
        </div>

        <div className="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
          Click to edit dates
        </div>
      </div>
    </button>
  );
}
