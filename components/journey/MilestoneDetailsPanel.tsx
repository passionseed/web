/**
 * MilestoneDetailsPanel - Orchestrator for milestone creation and viewing
 * Refactored into small, focused components with inline editing and auto-save
 */

"use client";

import { ProjectMilestone, ProjectWithMilestones, MilestoneWithJournals } from "@/types/journey";
import { MilestoneCreationMode } from "./milestone-details/MilestoneCreationMode";
import { MilestoneViewMode } from "./milestone-details/MilestoneViewMode";
import { ProjectOverviewPanel } from "./milestone-details/ProjectOverviewPanel";

interface MilestoneDetailsPanelProps {
  milestone: ProjectMilestone | null;
  projectId: string;
  project?: ProjectWithMilestones;
  allMilestones: MilestoneWithJournals[];
  onMilestoneUpdated: () => void;
  onMilestoneSelect?: (milestone: ProjectMilestone) => void;
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
      />
    );
  }

  // Show creation form if no milestone but no project data (fallback)
  if (!milestone) {
    return (
      <MilestoneCreationMode
        projectId={projectId}
        allMilestones={allMilestones}
        onMilestoneCreated={onMilestoneUpdated}
      />
    );
  }

  // Show milestone details when a milestone is selected
  return (
    <MilestoneViewMode
      milestone={milestone}
      allMilestones={allMilestones}
      onMilestoneUpdated={onMilestoneUpdated}
    />
  );
}
