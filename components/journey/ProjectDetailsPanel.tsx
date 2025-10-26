/**
 * ProjectDetailsPanel - Inline panel for viewing project details in sidebar
 * Includes tabs for overview, milestones, journals, and reflections
 */

"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Target,
  Calendar,
  MessageSquare,
  Edit,
  Plus,
  Loader2,
  TrendingUp,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";
import {
  getProjectById,
  getProjectMilestones,
  getProjectJournals,
  getProjectReflections,
} from "@/lib/supabase/journey";
import {
  ProjectWithMilestones,
  MilestoneWithJournals,
  MilestoneJournal,
  ProjectReflection,
} from "@/types/journey";
import { format } from "date-fns";

interface ProjectDetailsPanelProps {
  projectId: string | null;
  onEdit: () => void;
  onAddReflection: () => void;
  onAddMilestone: () => void;
}

export function ProjectDetailsPanel({
  projectId,
  onEdit,
  onAddReflection,
  onAddMilestone,
}: ProjectDetailsPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [project, setProject] = useState<ProjectWithMilestones | null>(null);
  const [milestones, setMilestones] = useState<MilestoneWithJournals[]>([]);
  const [journals, setJournals] = useState<Record<string, MilestoneJournal[]>>(
    {}
  );
  const [reflections, setReflections] = useState<ProjectReflection[]>([]);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const [projectData, milestonesData, journalsData, reflectionsData] =
        await Promise.all([
          getProjectById(projectId),
          getProjectMilestones(projectId),
          getProjectJournals(projectId),
          getProjectReflections(projectId),
        ]);

      setProject(projectData);
      setMilestones(milestonesData);
      setJournals(journalsData);
      setReflections(reflectionsData);
    } catch (error) {
      console.error("Error loading project data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const statusStyle =
    {
      not_started: "bg-slate-700 text-slate-200",
      planning: "bg-slate-700 text-slate-200",
      in_progress: "bg-blue-700 text-blue-200",
      completed: "bg-green-700 text-green-200",
      on_hold: "bg-yellow-700 text-yellow-200",
      archived: "bg-gray-700 text-gray-200",
    }[project.status] || "bg-slate-700 text-slate-200";

  const completedMilestones = milestones.filter(
    (m) => m.status === "completed"
  ).length;
  const totalMilestones = milestones.length;
  const progressPercentage =
    totalMilestones > 0
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : 0;

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {project.metadata?.is_north_star ? (
                <Target className="w-5 h-5 text-amber-400" />
              ) : (
                <Target className="w-5 h-5 text-blue-400" />
              )}
              <h2 className="text-lg font-bold text-slate-100">
                {project.title}
              </h2>
            </div>
            <Badge className={statusStyle}>{project.status}</Badge>
          </div>
          <Button
            onClick={onEdit}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-200"
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>

        {project.description && (
          <p className="text-sm text-slate-400 mb-3">{project.description}</p>
        )}

        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Overall Progress</span>
            <span className="text-slate-300 font-medium">
              {progressPercentage}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </div>

      {/* Tabs Content */}
      <ScrollArea className="flex-1">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full grid grid-cols-4 bg-slate-800/50 m-4">
            <TabsTrigger value="overview" className="text-xs">
              Overview
            </TabsTrigger>
            <TabsTrigger value="milestones" className="text-xs">
              Milestones
            </TabsTrigger>
            <TabsTrigger value="journals" className="text-xs">
              Journals
            </TabsTrigger>
            <TabsTrigger value="reflections" className="text-xs">
              Reflect
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-slate-400">Milestones</span>
                </div>
                <p className="text-2xl font-bold text-slate-100">
                  {completedMilestones}/{totalMilestones}
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-slate-400">Progress</span>
                </div>
                <p className="text-2xl font-bold text-slate-100">
                  {progressPercentage}%
                </p>
              </div>
            </div>

            <Separator className="bg-slate-800" />

            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Timeline
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Created</span>
                  <span>
                    {format(new Date(project.created_at), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Last updated</span>
                  <span>
                    {format(new Date(project.updated_at), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>

            <Separator className="bg-slate-800" />

            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Activity
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Journal entries</span>
                  <span>{Object.values(journals).flat().length}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Reflections</span>
                  <span>{reflections.length}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones" className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-200">
                {milestones.length} Milestone
                {milestones.length !== 1 ? "s" : ""}
              </h3>
              <Button
                onClick={onAddMilestone}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>

            {milestones.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No milestones yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="bg-slate-800/50 rounded-lg p-3 hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      {milestone.status === "completed" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                      ) : milestone.status === "in_progress" ? (
                        <Clock className="w-4 h-4 text-blue-400 mt-0.5" />
                      ) : milestone.status === "skipped" ? (
                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-600 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-slate-200 mb-1">
                          {milestone.title}
                        </h4>
                        {milestone.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {milestone.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {milestone.status}
                          </Badge>
                          {(milestone.journal_count ?? 0) > 0 && (
                            <span className="text-xs text-slate-500">
                              {milestone.journal_count} journal
                              {milestone.journal_count !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Journals Tab */}
          <TabsContent value="journals" className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">
              Recent Journals
            </h3>

            {Object.values(journals).flat().length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No journal entries yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(journals)
                  .flatMap(([milestoneId, entries]) =>
                    entries.map((entry) => ({
                      ...entry,
                      milestoneId,
                      milestoneTitle: milestones.find(
                        (m) => m.id === milestoneId
                      )?.title,
                    }))
                  )
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                  )
                  .slice(0, 10)
                  .map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-slate-800/50 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-medium text-blue-400">
                          {entry.milestoneTitle}
                        </span>
                        <span className="text-xs text-slate-500">
                          {format(new Date(entry.created_at), "MMM d")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{entry.content}</p>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          {/* Reflections Tab */}
          <TabsContent value="reflections" className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-200">
                Reflections
              </h3>
              <Button
                onClick={onAddReflection}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>

            {reflections.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No reflections yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reflections.map((reflection) => (
                  <div
                    key={reflection.id}
                    className="bg-slate-800/50 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {reflection.reflection_type}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {format(new Date(reflection.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">
                      {reflection.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}
