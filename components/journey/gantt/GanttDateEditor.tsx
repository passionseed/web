"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ProjectMilestone } from "@/types/journey";
import { getDefaultMilestoneDates } from "@/lib/utils/gantt";

interface GanttDateEditorProps {
  milestone: ProjectMilestone;
  onUpdate: (milestoneId: string, updates: Partial<ProjectMilestone>) => Promise<void>;
  onClose: () => void;
}

export function GanttDateEditor({
  milestone,
  onUpdate,
  onClose,
}: GanttDateEditorProps) {
  const { startDate, endDate } = getDefaultMilestoneDates(milestone);

  const [startDateValue, setStartDateValue] = useState(
    format(startDate, "yyyy-MM-dd")
  );
  const [endDateValue, setEndDateValue] = useState(format(endDate, "yyyy-MM-dd"));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(milestone.id, {
        start_date: new Date(startDateValue).toISOString(),
        due_date: new Date(endDateValue).toISOString(),
      });
      onClose();
    } catch (error) {
      console.error("Failed to update dates:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">
          Edit Milestone Dates
        </h3>

        <div className="space-y-4">
          {/* Milestone Title */}
          <div className="text-sm text-slate-400 border-b border-slate-700 pb-2">
            {milestone.title}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDateValue}
              onChange={(e) => setStartDateValue(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              End Date (Due Date)
            </label>
            <input
              type="date"
              value={endDateValue}
              onChange={(e) => setEndDateValue(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Duration Display */}
          <div className="text-xs text-slate-400">
            Duration:{" "}
            {Math.ceil(
              (new Date(endDateValue).getTime() -
                new Date(startDateValue).getTime()) /
                (1000 * 60 * 60 * 24)
            )}{" "}
            days
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
