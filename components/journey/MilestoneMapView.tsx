/**
 * MilestoneMapView - Gantt chart timeline view for project milestones
 * Simplified view without React Flow nodes
 */

"use client";

import React, { useState, useEffect, useCallback, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import { MilestoneDetailsPanel } from "./MilestoneDetailsPanel";
import { AddMilestoneModal } from "./milestone-details/AddMilestoneModal";
import { CreateMilestoneNorthStarDialog } from "./CreateMilestoneNorthStarDialog";

import {
  getProjectById,
  getProjectMilestones,
  getMilestoneJournals,
} from "@/lib/supabase/journey";
import {
  ProjectWithMilestones,
  MilestoneWithJournals,
  ProjectMilestone,
} from "@/types/journey";
import { MilestoneBreadcrumbContext } from "@/app/me/journey/journey-page-client";

interface MilestoneMapViewProps {
  projectId: string;
  onBack: () => void;
}

export function MilestoneMapView({ projectId, onBack }: MilestoneMapViewProps) {
  const breadcrumbContext = useContext(MilestoneBreadcrumbContext);

  // State
  const [project, setProject] = useState<ProjectWithMilestones | null>(null);
  const [milestones, setMilestones] = useState<MilestoneWithJournals[]>([]);
  const [selectedMilestone, setSelectedMilestone] =
    useState<ProjectMilestone | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNorthStarDialogOpen, setIsNorthStarDialogOpen] = useState(false);

  // Load project and milestones
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [projectData, milestonesData] = await Promise.all([
        getProjectById(projectId),
        getProjectMilestones(projectId),
      ]);

      if (projectData) {
        setProject(projectData);
        // Update breadcrumb
        breadcrumbContext?.setMilestoneTitle(projectData.title);
      }

      // Load journals for each milestone
      const milestonesWithJournals = await Promise.all(
        milestonesData.map(async (milestone) => {
          const journals = await getMilestoneJournals(milestone.id);
          return {
            ...milestone,
            journals,
            journal_count: journals.length,
            total_time_spent: journals.reduce(
              (sum, j) => sum + (j.time_spent_minutes || 0),
              0
            ),
          };
        })
      );

      setMilestones(milestonesWithJournals);
    } catch (error) {
      console.error("Error loading milestone data:", error);
      toast.error("Failed to load project data");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, breadcrumbContext]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle milestone updates
  const handleMilestoneUpdated = useCallback(() => {
    loadData();
    setSelectedMilestone(null);
  }, [loadData]);

  // Handle milestone selection
  const handleMilestoneSelect = useCallback((milestone: ProjectMilestone) => {
    setSelectedMilestone(milestone);
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    breadcrumbContext?.setMilestoneTitle(null);
    onBack();
  }, [onBack, breadcrumbContext]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <p className="text-slate-400">Project not found</p>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const completedCount = milestones.filter(
    (m) => m.status === "completed"
  ).length;
  const totalCount = milestones.length;
  const progressPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-slate-400 hover:text-slate-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="h-6 w-px bg-slate-700" />

            <div className="flex items-center gap-3">
              {project.icon && <span className="text-2xl">{project.icon}</span>}
              <div>
                <h1 className="text-xl font-semibold text-slate-100">
                  {project.title}
                </h1>
                {project.description && (
                  <p className="text-sm text-slate-400 mt-0.5">
                    {project.description}
                  </p>
                )}
              </div>
            </div>

            <Badge
              variant="outline"
              className="bg-blue-900/30 text-blue-400 border-blue-700/50"
            >
              {completedCount} / {totalCount} completed ({progressPercentage}%)
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {project.metadata?.milestone_north_star && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNorthStarDialogOpen(true)}
                className="border-amber-700/50 bg-amber-900/20 text-amber-400 hover:bg-amber-900/30"
              >
                <Star className="w-4 h-4 mr-2 fill-amber-400" />
                North Star
              </Button>
            )}

            <Button
              onClick={() => setIsAddModalOpen(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Milestone
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Gantt Chart */}
      <div className="flex-1 overflow-hidden">
        <MilestoneDetailsPanel
          milestone={selectedMilestone}
          projectId={projectId}
          project={project}
          allMilestones={milestones}
          onMilestoneUpdated={handleMilestoneUpdated}
          onMilestoneSelect={handleMilestoneSelect}
        />
      </div>

      {/* Modals */}
      <AddMilestoneModal
        projectId={projectId}
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        allMilestones={milestones}
        onMilestoneCreated={handleMilestoneUpdated}
      />

      {project.metadata?.milestone_north_star && (
        <CreateMilestoneNorthStarDialog
          isOpen={isNorthStarDialogOpen}
          onClose={() => setIsNorthStarDialogOpen(false)}
          existingNorthStar={project.metadata.milestone_north_star}
          onSave={async (northStar) => {
            try {
              await loadData();
              toast.success("North Star updated");
            } catch (error) {
              console.error("Error updating north star:", error);
              toast.error("Failed to update North Star");
            }
          }}
        />
      )}
    </div>
  );
}
