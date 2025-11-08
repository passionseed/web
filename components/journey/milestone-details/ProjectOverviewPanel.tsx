/**
 * ProjectOverviewPanel - Gantt chart timeline view for project milestones
 * Shows project goal and milestones in a timeline format
 */

"use client";

import React from "react";
import {
  ProjectWithMilestones,
  MilestoneWithJournals,
  ProjectMilestone,
} from "@/types/journey";
import { GanttChart } from "../gantt/GanttChart";
import { updateMilestone } from "@/lib/supabase/journey";

interface ProjectOverviewPanelProps {
  project: ProjectWithMilestones;
  milestones: MilestoneWithJournals[];
  onMilestoneSelect: (milestone: ProjectMilestone) => void;
  onMilestoneUpdated: (updatedMilestone?: ProjectMilestone) => void;
}

export function ProjectOverviewPanel({
  project,
  milestones,
  onMilestoneSelect,
  onMilestoneUpdated,
}: ProjectOverviewPanelProps) {
  const handleMilestoneUpdate = async (
    milestoneId: string,
    updates: Partial<ProjectMilestone>
  ) => {
    try {
      const updatedMilestone = await updateMilestone(milestoneId, updates);
      // Trigger refresh to reload data
      onMilestoneUpdated(updatedMilestone);
    } catch (error) {
      console.error("Failed to update milestone:", error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <GanttChart
        milestones={milestones}
        projectGoal={project.goal}
        onMilestoneUpdate={handleMilestoneUpdate}
        onMilestoneClick={onMilestoneSelect}
        onProgressUpdate={onMilestoneUpdated}
      />
    </div>
  );
}
