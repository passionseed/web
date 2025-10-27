/**
 * DependenciesSection - Display milestone dependencies (prerequisites and blockers)
 */

"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { GitBranch } from "lucide-react";
import { MilestoneWithPaths, ProjectMilestone } from "@/types/journey";

interface DependenciesSectionProps {
  milestoneDetails: MilestoneWithPaths;
  allMilestones: ProjectMilestone[];
}

export function DependenciesSection({
  milestoneDetails,
  allMilestones,
}: DependenciesSectionProps) {
  const hasPrerequisites =
    milestoneDetails.paths_destination &&
    milestoneDetails.paths_destination.length > 0;
  const hasBlockers =
    milestoneDetails.paths_source && milestoneDetails.paths_source.length > 0;

  if (!hasPrerequisites && !hasBlockers) {
    return null;
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
        <GitBranch className="w-4 h-4" />
        Dependencies
      </h3>

      {/* Prerequisites (incoming connections) */}
      {hasPrerequisites && (
        <div className="mb-3">
          <p className="text-xs text-slate-400 mb-2">
            Depends on ({milestoneDetails.paths_destination!.length}):
          </p>
          <div className="space-y-1">
            {milestoneDetails.paths_destination!.map((path) => {
              const sourceMilestone = allMilestones.find(
                (m) => m.id === path.source_milestone_id
              );
              return (
                <div
                  key={path.id}
                  className="bg-slate-800/30 rounded px-2 py-1 text-xs text-slate-300 flex items-center justify-between"
                >
                  <span className="truncate">
                    {sourceMilestone?.title || "Unknown milestone"}
                  </span>
                  <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                    {path.path_type}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Blockers (outgoing connections) */}
      {hasBlockers && (
        <div>
          <p className="text-xs text-slate-400 mb-2">
            Blocks ({milestoneDetails.paths_source!.length}):
          </p>
          <div className="space-y-1">
            {milestoneDetails.paths_source!.map((path) => {
              const destMilestone = allMilestones.find(
                (m) => m.id === path.destination_milestone_id
              );
              return (
                <div
                  key={path.id}
                  className="bg-slate-800/30 rounded px-2 py-1 text-xs text-slate-300 flex items-center justify-between"
                >
                  <span className="truncate">
                    {destMilestone?.title || "Unknown milestone"}
                  </span>
                  <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                    {path.path_type}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
