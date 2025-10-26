/**
 * ProjectReflectionPanel - Slide-out panel for viewing project details
 * Includes tabs for overview, milestones, journals, and reflections
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

interface ProjectReflectionPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  onEdit: () => void;
  onAddReflection: () => void;
  onAddMilestone: () => void;
}

export function ProjectReflectionPanel({
  open,
  onOpenChange,
  projectId,
  onEdit,
  onAddReflection,
  onAddMilestone,
}: ProjectReflectionPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [project, setProject] = useState<ProjectWithMilestones | null>(null);
  const [milestones, setMilestones] = useState<MilestoneWithJournals[]>([]);
  const [journals, setJournals] = useState<Record<string, MilestoneJournal[]>>(
    {}
  );
  const [reflections, setReflections] = useState<ProjectReflection[]>([]);

  useEffect(() => {
    if (open && projectId) {
      loadProjectData();
    }
  }, [open, projectId]);

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

  if (!project && !isLoading) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-hidden flex flex-col"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            {project?.title || "Loading..."}
          </SheetTitle>
          <SheetDescription>
            {project?.description || "Project details and progress"}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : project ? (
          <Tabs
            defaultValue="overview"
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
              <TabsTrigger value="journals">Journals</TabsTrigger>
              <TabsTrigger value="reflections">Reflections</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 m-0">
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-blue-700 mb-1">
                        <Target className="w-4 h-4" />
                        <span className="text-sm font-medium">Milestones</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-900">
                        {project.completed_milestone_count || 0} /{" "}
                        {project.milestone_count || 0}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-700 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-medium">Progress</span>
                      </div>
                      <div className="text-2xl font-bold text-green-900">
                        {project.progress_percentage || 0}%
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Overall Progress
                    </Label>
                    <Progress
                      value={project.progress_percentage || 0}
                      className="h-3"
                    />
                  </div>

                  {/* Status and type */}
                  <div className="flex gap-2">
                    <Badge variant="secondary">{project.status}</Badge>
                    <Badge variant="outline">{project.project_type}</Badge>
                  </div>

                  {/* Dates */}
                  {(project.start_date || project.target_end_date) && (
                    <div className="space-y-2">
                      {project.start_date && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Started:{" "}
                            {format(
                              new Date(project.start_date),
                              "MMM d, yyyy"
                            )}
                          </span>
                        </div>
                      )}
                      {project.target_end_date && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>
                            Target:{" "}
                            {format(
                              new Date(project.target_end_date),
                              "MMM d, yyyy"
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={onEdit}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Project
                    </Button>
                    <Button
                      onClick={onAddReflection}
                      size="sm"
                      className="flex-1"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Reflection
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Milestones Tab */}
              <TabsContent value="milestones" className="space-y-3 m-0">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold">
                    {milestones.length} Milestone
                    {milestones.length !== 1 ? "s" : ""}
                  </h3>
                  <Button onClick={onAddMilestone} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
                {milestones.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Target className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No milestones yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        className="bg-gray-50 rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-gray-900">
                            {milestone.title}
                          </h4>
                          <Badge variant="secondary">{milestone.status}</Badge>
                        </div>
                        {milestone.description && (
                          <p className="text-sm text-gray-600">
                            {milestone.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            {milestone.journal_count || 0} journal entries
                          </span>
                          {milestone.estimated_hours && (
                            <span>{milestone.estimated_hours}h estimated</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Journals Tab */}
              <TabsContent value="journals" className="space-y-3 m-0">
                {Object.keys(journals).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No journal entries yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(journals).map(([milestoneId, entries]) => {
                      const milestone = milestones.find(
                        (m) => m.id === milestoneId
                      );
                      return (
                        <div key={milestoneId} className="space-y-2">
                          <h4 className="font-semibold text-sm text-gray-900">
                            {milestone?.title}
                          </h4>
                          {entries.map((entry) => (
                            <div
                              key={entry.id}
                              className="bg-gray-50 rounded-lg p-3 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                  {format(
                                    new Date(entry.created_at),
                                    "MMM d, yyyy"
                                  )}
                                </span>
                                {entry.progress_percentage !== undefined && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {entry.progress_percentage}%
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {entry.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Reflections Tab */}
              <TabsContent value="reflections" className="space-y-3 m-0">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold">
                    {reflections.length} Reflection
                    {reflections.length !== 1 ? "s" : ""}
                  </h3>
                  <Button onClick={onAddReflection} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
                {reflections.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No reflections yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reflections.map((reflection) => (
                      <div
                        key={reflection.id}
                        className="bg-gray-50 rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {format(
                              new Date(reflection.reflection_date),
                              "MMM d, yyyy"
                            )}
                          </span>
                          <Badge variant="secondary">
                            {reflection.reflection_type}
                          </Badge>
                        </div>
                        {reflection.title && (
                          <h4 className="font-semibold text-gray-900">
                            {reflection.title}
                          </h4>
                        )}
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {reflection.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Label({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={className}>{children}</div>;
}
