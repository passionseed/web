/**
 * MilestoneMetadata - Display milestone dates and journal count
 */

"use client";

import React from "react";
import { format } from "date-fns";
import { ProjectMilestone } from "@/types/journey";

interface MilestoneMetadataProps {
  milestone: ProjectMilestone;
  journalCount: number;
}

export function MilestoneMetadata({
  milestone,
  journalCount,
}: MilestoneMetadataProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-200 mb-2">
        Information
      </h3>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-slate-400">
          <span>Created</span>
          <span>{format(new Date(milestone.created_at), "MMM d, yyyy")}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Last updated</span>
          <span>{format(new Date(milestone.updated_at), "MMM d, yyyy")}</span>
        </div>
        {milestone.completed_at && (
          <div className="flex justify-between text-slate-400">
            <span>Completed</span>
            <span>
              {format(new Date(milestone.completed_at), "MMM d, yyyy")}
            </span>
          </div>
        )}
        <div className="flex justify-between text-slate-400">
          <span>Journal entries</span>
          <span>{journalCount}</span>
        </div>
      </div>
    </div>
  );
}
