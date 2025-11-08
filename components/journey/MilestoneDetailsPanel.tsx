/**
 * MilestoneDetailsPanel - Orchestrator for milestone creation and viewing
 * Refactored into small, focused components with inline editing and auto-save
 */

"use client";

import {
  ProjectMilestone,
  ProjectWithMilestones,
  MilestoneWithJournals,
} from "@/types/journey";
import { MilestoneViewMode } from "./milestone-details/MilestoneViewMode";
import { ProjectOverviewPanel } from "./milestone-details/ProjectOverviewPanel";

interface MilestoneDetailsPanelProps {
  milestone: ProjectMilestone | null;
  projectId: string;
  project?: ProjectWithMilestones;
  allMilestones: MilestoneWithJournals[];
  onMilestoneUpdated: (updatedMilestone?: ProjectMilestone) => void;
  onMilestoneSelect?: (milestone: ProjectMilestone | null) => void;
}

export function MilestoneDetailsPanel({
  milestone,
  projectId,
  project,
  allMilestones,
  onMilestoneUpdated,
  onMilestoneSelect,
}: MilestoneDetailsPanelProps) {
  // Show project overview when no milestone is selected and we have project data
  if (!milestone && project) {
    return (
      <ProjectOverviewPanel
        project={project}
        milestones={allMilestones}
        onMilestoneSelect={onMilestoneSelect || (() => {})}
        onMilestoneUpdated={onMilestoneUpdated}
      />
    );
  }

  // Empty state if no milestone and no project data (shouldn't occur in normal flow)
  if (!milestone) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No milestone or project data available</p>
      </div>
    );
  }

  // Show milestone details when a milestone is selected
  return (
    <MilestoneViewMode
      milestone={milestone}
      allMilestones={allMilestones}
      onMilestoneUpdated={onMilestoneUpdated}
      onBack={() => onMilestoneSelect?.(null)}
    />
  );
}
