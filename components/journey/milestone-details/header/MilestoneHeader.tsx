/**
 * MilestoneHeader - Milestone title, status, and progress overview
 * No project context (removed as requested)
 */

"use client";

import React from "react";
import { ProjectMilestone } from "@/types/journey";
import { InlineEditableTitle } from "../details/InlineEditableTitle";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getMilestoneStatusConfig } from "@/components/journey/utils/milestoneStatusConfig";
import { AutoSaveIndicator } from "../common/AutoSaveIndicator";
import { useMilestoneAutoSave } from "@/hooks/milestone-details/useMilestoneAutoSave";

interface MilestoneHeaderProps {
  milestone: ProjectMilestone;
  onUpdate: () => void;
}

export function MilestoneHeader({
  milestone,
  onUpdate,
}: MilestoneHeaderProps) {
  const { saveField, status } = useMilestoneAutoSave();
  const statusConfig = getMilestoneStatusConfig(milestone.status);
  const StatusIcon = statusConfig.icon;

  const handleTitleSave = async (newTitle: string) => {
    await saveField(milestone.id, "title", newTitle.trim());
    onUpdate();
  };

  return (
    <div className="p-4 border-b border-slate-800">
      {/* Header with auto-save indicator */}
      <div className="flex items-start gap-3 mb-3">
        <StatusIcon className={`w-5 h-5 mt-1 shrink-0 ${statusConfig.iconClassName}`} />
        <div className="flex-1 min-w-0">
          <InlineEditableTitle milestone={milestone} onUpdate={onUpdate} />
          <div className="flex items-center gap-2 mt-2">
            <Badge className={statusConfig.style}>
              {statusConfig.label}
            </Badge>
            <AutoSaveIndicator status={status} />
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Progress</span>
          <span className="text-slate-300 font-medium">
            {milestone.progress_percentage}%
          </span>
        </div>
        <Progress value={milestone.progress_percentage} className="h-2" />
      </div>
    </div>
  );
}
