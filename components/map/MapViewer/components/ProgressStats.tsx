/**
 * ProgressStats - Display progress statistics and counts
 */

import React from "react";
import { ProgressStatsProps } from "../types";
import { filterProgressByStatus } from "../utils/mapProgressUtils";

export function ProgressStats({
  stats,
  progressMap,
  isTeamMap,
  isInstructorOrTA,
}: ProgressStatsProps) {
  return (
    <div className="mb-4 bg-muted/30 rounded-lg p-3">
      <div className="text-xs text-muted-foreground mb-2 font-medium">
        {isTeamMap && isInstructorOrTA
          ? "Team Progress Overview"
          : "Progress Overview"}
      </div>

      {isTeamMap && (
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <span className="text-blue-500">👤</span>
              Single requirement
            </span>
            <span className="font-medium">
              {stats.singleRequirement.completed}/
              {stats.singleRequirement.total}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <span className="text-purple-500">👥</span>
              All requirement
            </span>
            <span className="font-medium">
              {stats.allRequirement.completed}/
              {stats.allRequirement.total}
            </span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              style={{
                width: `${(stats.totalCompleted / stats.totalNodes) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>{stats.totalCompleted} Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span>
            {filterProgressByStatus(progressMap, "submitted")} Submitted
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          <span>
            {filterProgressByStatus(progressMap, "in_progress")} In Progress
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
          <span className="text-muted-foreground">
            {stats.totalNodes} Total
          </span>
        </div>
      </div>
    </div>
  );
}