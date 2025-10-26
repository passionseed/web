/**
 * MainQuestPanel - Shows main quest project stats and milestones
 * Displayed in the right panel when no project is selected
 */

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Target,
  Star,
  Circle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import {
  getProjectById,
  getProjectMilestones,
  updateProject,
} from "@/lib/supabase/journey";
import { ProjectWithMilestones, MilestoneWithJournals } from "@/types/journey";

interface MainQuestPanelProps {
  projects: ProjectWithMilestones[];
  onProjectSelect: (projectId: string) => void;
  onRefresh: () => void;
}

export function MainQuestPanel({
  projects,
  onProjectSelect,
  onRefresh,
}: MainQuestPanelProps) {
  const [mainQuest, setMainQuest] = useState<ProjectWithMilestones | null>(null);
  const [milestones, setMilestones] = useState<MilestoneWithJournals[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMainQuest();
  }, [projects]);

  const loadMainQuest = async () => {
    setIsLoading(true);
    try {
      // Find project with is_main_quest = true
      const mainQuestProject = projects.find(
        (p) => p.metadata?.is_main_quest === true
      );

      if (mainQuestProject) {
        setMainQuest(mainQuestProject);
        // Load milestones
        const milestonesData = await getProjectMilestones(mainQuestProject.id);
        setMilestones(milestonesData);
      } else {
        setMainQuest(null);
        setMilestones([]);
      }
    } catch (error) {
      console.error("Error loading main quest:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetMainQuest = async (projectId: string) => {
    try {
      // First, unset any existing main quest
      const currentMainQuest = projects.find(
        (p) => p.metadata?.is_main_quest === true
      );
      if (currentMainQuest && currentMainQuest.id !== projectId) {
        await updateProject(currentMainQuest.id, {
          metadata: {
            ...currentMainQuest.metadata,
            is_main_quest: false,
          },
        });
      }

      // Set new main quest
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        await updateProject(projectId, {
          metadata: {
            ...project.metadata,
            is_main_quest: true,
          },
        });
        toast.success("Main quest updated!");
        onRefresh();
      }
    } catch (error) {
      console.error("Error setting main quest:", error);
      toast.error("Failed to set main quest");
    }
  };

  const getMilestoneIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "not_started":
        return <Circle className="w-4 h-4 text-slate-500" />;
      default:
        return <Circle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "in_progress":
        return "text-blue-400";
      default:
        return "text-slate-500";
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <Target className="w-12 h-12 text-slate-700 mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-slate-500">Loading main quest...</p>
        </div>
      </div>
    );
  }

  // No main quest set - show selection UI
  if (!mainQuest) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Main Quest</h2>
          </div>
          <p className="text-sm text-slate-400">
            Choose your primary focus project
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-3">
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  Create a project first to set your main quest
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500 mb-4">
                  Select a project to focus on as your main quest:
                </p>
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleSetMainQuest(project.id)}
                    className="w-full text-left p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {project.metadata?.is_north_star ? (
                            <Star className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          ) : (
                            <Target className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          )}
                          <h3 className="font-semibold text-slate-200 truncate">
                            {project.title}
                          </h3>
                        </div>
                        {project.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant="secondary"
                            className="text-xs bg-slate-700/50"
                          >
                            {project.progress_percentage || 0}% complete
                          </Badge>
                          {project.metadata?.is_north_star && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-amber-500/20 text-amber-400"
                            >
                              North Star
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-xs text-purple-400">
                          Set as Main
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Main quest is set - show stats and milestones
  const completedMilestones = milestones.filter(
    (m) => m.status === "completed"
  ).length;
  const totalMilestones = milestones.length;
  const progressPercentage = mainQuest.progress_percentage || 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-slate-100 truncate">
                {mainQuest.title}
              </h2>
              {mainQuest.metadata?.is_north_star && (
                <Star className="w-4 h-4 text-amber-400 flex-shrink-0" />
              )}
            </div>
            <Badge
              variant="secondary"
              className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30"
            >
              Main Quest
            </Badge>
          </div>
        </div>

        {mainQuest.description && (
          <p className="text-sm text-slate-400 mb-4">{mainQuest.description}</p>
        )}

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Overall Progress</span>
            <span className="font-semibold text-slate-200">
              {progressPercentage}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">Milestones</div>
            <div className="text-lg font-bold text-slate-200">
              {completedMilestones}/{totalMilestones}
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">Status</div>
            <Badge
              variant={
                mainQuest.status === "in_progress" ? "default" : "secondary"
              }
              className="text-xs"
            >
              {mainQuest.status}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            onClick={() => onProjectSelect(mainQuest.id)}
            size="sm"
            className="flex-1 bg-slate-700 hover:bg-slate-600"
          >
            View Details
          </Button>
          <Button
            onClick={() => handleSetMainQuest("")}
            size="sm"
            variant="outline"
            className="border-slate-700 text-slate-400 hover:bg-slate-800"
          >
            Change
          </Button>
        </div>
      </div>

      {/* Milestones List */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-6 py-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300">Milestones</h3>
        </div>

        <ScrollArea className="flex-1">
          {milestones.length === 0 ? (
            <div className="p-6 text-center">
              <Target className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No milestones yet</p>
              <p className="text-xs text-slate-600 mt-1">
                Click "View Details" to add milestones
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="p-3 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 rounded-lg transition-colors cursor-pointer"
                  onClick={() => onProjectSelect(mainQuest.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">
                      {getMilestoneIcon(milestone.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-sm font-medium mb-1 ${getMilestoneStatusColor(
                          milestone.status
                        )}`}
                      >
                        {milestone.title}
                      </h4>
                      {milestone.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {milestone.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="secondary"
                          className="text-xs bg-slate-700/50"
                        >
                          {milestone.status.replace("_", " ")}
                        </Badge>
                        {milestone.due_date && (
                          <span className="text-xs text-slate-600">
                            {new Date(milestone.due_date).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
