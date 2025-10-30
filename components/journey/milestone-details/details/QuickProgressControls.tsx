/**
 * QuickProgressControls - Inline progress slider and status selector
 * Instant auto-save on change
 */

"use client";

import React, { useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectMilestone, MilestoneStatus } from "@/types/journey";
import { updateMilestone } from "@/lib/supabase/journey";
import { toast } from "sonner";
import { useDebouncedProgress } from "@/hooks/milestone-details/useDebouncedProgress";
import { Loader2 } from "lucide-react";

interface QuickProgressControlsProps {
  milestone: ProjectMilestone;
  onUpdate: (updatedMilestone?: ProjectMilestone) => void;
}

export function QuickProgressControls({
  milestone,
  onUpdate,
}: QuickProgressControlsProps) {
  const { currentProgress, isSaving, updateProgress } = useDebouncedProgress({
    milestone,
    onUpdate,
    debounceMs: 500, // 500ms debounce for smooth interaction
  });

  const handleProgressChange = useCallback(
    (value: number[]) => {
      const newProgress = value[0];
      updateProgress(newProgress);
    },
    [updateProgress]
  );

  const handleStatusChange = useCallback(
    async (newStatus: MilestoneStatus) => {
      try {
        const updateData: Partial<ProjectMilestone> = {
          status: newStatus,
        };

        // Handle completion logic to satisfy database constraint
        if (newStatus === "completed") {
          updateData.completed_at = new Date().toISOString();
        } else if (milestone.status === "completed" && newStatus !== "completed") {
          // If changing from completed to another status, clear completed_at
          updateData.completed_at = null;
        }

        const updatedMilestone = await updateMilestone(milestone.id, updateData);
        onUpdate(updatedMilestone);
        toast.success("Status updated");
      } catch (error) {
        console.error("Error updating status:", error);
        toast.error("Failed to update status");
      }
    },
    [milestone.id, milestone.status, onUpdate]
  );

  return (
    <div className="space-y-4">
      {/* Progress Slider */}
      <div className="bg-slate-800/30 rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-semibold text-slate-200">
            Update Progress
          </Label>
          {isSaving && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Slider
            value={[currentProgress]}
            onValueChange={handleProgressChange}
            max={100}
            step={5}
            className="flex-1"
          />
          <span className="text-sm font-medium text-slate-300 min-w-[3rem] text-right">
            {currentProgress}%
          </span>
        </div>
      </div>

      {/* Status Selector */}
      <div className="bg-slate-800/30 rounded-lg p-3">
        <Label className="text-sm font-semibold text-slate-200 mb-3 block">
          Status
        </Label>
        <Select value={milestone.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="bg-slate-900 border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
