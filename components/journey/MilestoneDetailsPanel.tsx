/**
 * MilestoneDetailsPanel - Orchestrator for milestone creation and viewing
 * Refactored into small, focused components with inline editing and auto-save
 */

"use client";

import { ProjectMilestone } from "@/types/journey";
import { MilestoneCreationMode } from "./milestone-details/MilestoneCreationMode";
import { MilestoneViewMode } from "./milestone-details/MilestoneViewMode";

interface MilestoneDetailsPanelProps {
  milestone: ProjectMilestone | null;
  projectId: string;
  allMilestones: ProjectMilestone[];
  onMilestoneUpdated: () => void;
}

export function MilestoneDetailsPanel({
  milestone,
  projectId,
  allMilestones,
  onMilestoneUpdated,
}: MilestoneDetailsPanelProps) {
  // Simple mode routing: creation vs viewing
  if (!milestone) {
    return (
      <MilestoneCreationMode
        projectId={projectId}
        allMilestones={allMilestones}
        onMilestoneCreated={onMilestoneUpdated}
      />
    );
  }

  return (
    <MilestoneViewMode
      milestone={milestone}
      allMilestones={allMilestones}
      onMilestoneUpdated={onMilestoneUpdated}
    />
  );
}
