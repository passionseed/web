/**
 * MilestoneMetadata - Display milestone dates and journal count
 */

"use client";

import React from "react";
import { format } from "date-fns";
import { ProjectMilestone } from "@/types/journey";
import { getDefaultMilestoneDates, formatDuration, calculateDuration } from "@/lib/utils/gantt";

interface MilestoneMetadataProps {
  milestone: ProjectMilestone;
  journalCount: number;
}

export function MilestoneMetadata({
  milestone,
  journalCount,
}: MilestoneMetadataProps) {
  const { startDate, endDate } = getDefaultMilestoneDates(milestone);
  const duration = calculateDuration(startDate, endDate);

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-200 mb-2">
        Information
      </h3>
      <div className="space-y-2 text-xs">
        {/* Timeline Information */}
        <div className="pb-2 border-b border-slate-700">
          <div className="flex justify-between text-slate-400 mb-1">
            <span>Start date</span>
            <span className="text-blue-400 font-medium">
              {format(startDate, "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span>Due date</span>
            <span className="text-red-400 font-medium">
              {format(endDate, "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Duration</span>
            <span className="font-medium">{formatDuration(duration)}</span>
          </div>
        </div>

        {/* System Timestamps */}
        <div className="pt-1">
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
    </div>
  );
}
