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

interface QuickProgressControlsProps {
  milestone: ProjectMilestone;
  onUpdate: () => void;
}

export function QuickProgressControls({
  milestone,
  onUpdate,
}: QuickProgressControlsProps) {
  const handleProgressChange = useCallback(
    async (value: number[]) => {
      const newProgress = value[0];

      try {
        await updateMilestone(milestone.id, {
          progress_percentage: newProgress,
          status:
            newProgress === 100
              ? "completed"
              : newProgress > 0
              ? "in_progress"
              : "not_started",
        });
        onUpdate();
        toast.success(
          newProgress === 100
            ? "Milestone completed! Congratulations!"
            : "Progress updated"
        );
      } catch (error) {
        console.error("Error updating progress:", error);
        toast.error("Failed to update progress");
      }
    },
    [milestone.id, onUpdate]
  );

  const handleStatusChange = useCallback(
    async (newStatus: MilestoneStatus) => {
      try {
        await updateMilestone(milestone.id, {
          status: newStatus,
        });
        onUpdate();
        toast.success("Status updated");
      } catch (error) {
        console.error("Error updating status:", error);
        toast.error("Failed to update status");
      }
    },
    [milestone.id, onUpdate]
  );

  return (
    <div className="space-y-4">
      {/* Progress Slider */}
      <div className="bg-slate-800/30 rounded-lg p-3">
        <Label className="text-sm font-semibold text-slate-200 mb-3 block">
          Update Progress
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[milestone.progress_percentage]}
            onValueChange={handleProgressChange}
            max={100}
            step={5}
            className="flex-1"
          />
          <span className="text-sm font-medium text-slate-300 min-w-[3rem] text-right">
            {milestone.progress_percentage}%
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
