/**
 * ProjectDetailsPanel - Inline panel for viewing AND editing project details
 * Includes tabs for overview, milestones, journals, and reflections
 * Now supports inline editing instead of modal
 */

"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  X,
  Save,
} from "lucide-react";
import {
  getProjectById,
  getProjectMilestones,
  getProjectJournals,
  getProjectReflections,
  updateProjectDetails,
} from "@/lib/supabase/journey";
import {
  ProjectWithMilestones,
  MilestoneWithJournals,
  MilestoneJournal,
  ProjectReflection,
} from "@/types/journey";
import { format } from "date-fns";
import { toast } from "sonner";

interface ProjectDetailsPanelProps {
  projectId: string | null;
  onAddReflection: () => void;
  onAddMilestone: () => void;
  onProjectUpdated?: () => void;
}

export function ProjectDetailsPanel({
  projectId,
  onAddReflection,
  onAddMilestone,
  onProjectUpdated,
}: ProjectDetailsPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [project, setProject] = useState<ProjectWithMilestones | null>(null);
  const [milestones, setMilestones] = useState<MilestoneWithJournals[]>([]);
  const [journals, setJournals] = useState<Record<string, MilestoneJournal[]>>(
    {}
  );
  const [reflections, setReflections] = useState<ProjectReflection[]>([]);

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    short_title: "",
    goal: "",
    why: "",
    description: "",
    icon: "🎯",
  });

  useEffect(() => {
    if (projectId) {
      loadProjectData();
      setIsEditing(false); // Reset edit mode when project changes
    }
  }, [projectId]);

  // Initialize edit form when project loads
  useEffect(() => {
    if (project) {
      setEditForm({
        title: project.title || "",
        short_title: project.short_title || "",
        goal: project.goal || "",
        why: project.why || "",
        description: project.description || "",
        icon: project.icon || "🎯",
      });
    }
  }, [project]);

  const loadProjectData = async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      // Check if this is a university example project (starts with "milestone-")
      if (projectId.startsWith('milestone-')) {
        setProject(null);
        setMilestones([]);
        setJournals({});
        setReflections([]);
        setIsLoading(false);
        return;
      }

      const projectData = await getProjectById(projectId);
      if (!projectData) {
        console.warn(`Project with ID ${projectId} not found`);
        setProject(null);
        setMilestones([]);
        setJournals({});
        setReflections([]);
        setIsLoading(false);
        return;
      }
      
      setProject(projectData);

      const [milestonesData, journalsData] = await Promise.all([
        getProjectMilestones(projectId),
        getProjectJournals(projectId),
      ]);

      setMilestones(milestonesData);
      setJournals(journalsData);

      try {
        const reflectionsData = await getProjectReflections(projectId);
        setReflections(reflectionsData);
      } catch (reflectionError) {
        console.warn("Could not load reflections:", reflectionError);
        setReflections([]);
      }
    } catch (error) {
      console.error("Error loading project data:", error);
      toast.error("Failed to load project details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!project || !editForm.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSaving(true);
    try {
      await updateProjectDetails(project.id, {
        title: editForm.title.trim(),
        short_title: editForm.short_title.trim() || undefined,
        goal: editForm.goal.trim() || undefined,
        why: editForm.why.trim() || undefined,
        description: editForm.description.trim() || undefined,
        icon: editForm.icon,
      });
      
      toast.success("Project updated!");
      setIsEditing(false);
      loadProjectData();
      onProjectUpdated?.();
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (project) {
      setEditForm({
        title: project.title || "",
        short_title: project.short_title || "",
        goal: project.goal || "",
        why: project.why || "",
        description: project.description || "",
        icon: project.icon || "🎯",
      });
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!project) {
    if (projectId?.startsWith('milestone-')) {
      return (
        <div className="h-full flex flex-col bg-slate-900">
          <div className="p-6 flex flex-col items-center justify-center h-full text-center">
            <div className="bg-slate-800 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              University Example Milestone
            </h3>
            <p className="text-slate-400 text-sm max-w-sm">
              This is a sample milestone for demonstrating university pathway planning.
            </p>
          </div>
        </div>
      );
    }
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
      {/* Header - View Mode */}
      {!isEditing && (
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <EmojiPicker
                  value={project.icon || "🎯"}
                  onSelect={async (emoji) => {
                    try {
                      await updateProjectDetails(project.id, { icon: emoji });
                      toast.success("Icon updated");
                      loadProjectData();
                      onProjectUpdated?.();
                    } catch (error) {
                      console.error("Error updating icon:", error);
                      toast.error("Failed to update icon");
                    }
                  }}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-3xl p-1 h-auto hover:bg-slate-800 rounded-lg transition-colors"
                      title="Click to change icon"
                    >
                      {project.icon || "🎯"}
                    </Button>
                  }
                />
                <h2 className="text-lg font-bold text-slate-100">
                  {project.title}
                </h2>
              </div>
              {project.short_title && (
                <p className="text-xs text-slate-400 mb-2">({project.short_title})</p>
              )}
              <Badge className={statusStyle}>{project.status}</Badge>
            </div>
            <Button
              onClick={() => setIsEditing(true)}
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
      )}

      {/* Header - Edit Mode */}
      {isEditing && (
        <div className="p-4 border-b border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100">Edit Project</h2>
            <div className="flex gap-2">
              <Button
                onClick={handleCancelEdit}
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-200"
                disabled={isSaving}
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleSaveEdit}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {/* Icon */}
            <div className="flex items-center gap-3">
              <EmojiPicker
                value={editForm.icon}
                onSelect={(emoji) => setEditForm({ ...editForm, icon: emoji })}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-2xl p-2 h-auto"
                  >
                    {editForm.icon}
                  </Button>
                }
              />
              <span className="text-xs text-slate-400">Click to change icon</span>
            </div>

            {/* Title */}
            <div>
              <Label className="text-xs text-slate-400">Title *</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Project title"
                className="mt-1 bg-slate-800 border-slate-700"
                maxLength={500}
              />
            </div>

            {/* Short Title */}
            <div>
              <Label className="text-xs text-slate-400">Short Title</Label>
              <Input
                value={editForm.short_title}
                onChange={(e) => setEditForm({ ...editForm, short_title: e.target.value })}
                placeholder="Short display name for map"
                className="mt-1 bg-slate-800 border-slate-700"
                maxLength={50}
              />
            </div>

            {/* Goal */}
            <div>
              <Label className="text-xs text-slate-400">Goal</Label>
              <Textarea
                value={editForm.goal}
                onChange={(e) => setEditForm({ ...editForm, goal: e.target.value })}
                placeholder="What do you want to achieve?"
                className="mt-1 bg-slate-800 border-slate-700 resize-none"
                rows={2}
              />
            </div>

            {/* Why */}
            <div>
              <Label className="text-xs text-slate-400">Why</Label>
              <Textarea
                value={editForm.why}
                onChange={(e) => setEditForm({ ...editForm, why: e.target.value })}
                placeholder="Why is this important?"
                className="mt-1 bg-slate-800 border-slate-700 resize-none"
                rows={2}
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs text-slate-400">Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Additional details"
                className="mt-1 bg-slate-800 border-slate-700 resize-none"
                rows={3}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabs Content - Hide when editing */}
      {!isEditing && (
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
            {/* Goal and Why Section */}
            {(project.goal || project.why) && (
              <>
                {project.goal && (
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <h3 className="text-sm font-semibold text-slate-200 mb-2">
                      Goal
                    </h3>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">
                      {project.goal}
                    </p>
                  </div>
                )}

                {project.why && (
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <h3 className="text-sm font-semibold text-slate-200 mb-2">
                      Why
                    </h3>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">
                      {project.why}
                    </p>
                  </div>
                )}

                <Separator className="bg-slate-800" />
              </>
            )}

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
      )}
    </div>
  );
}
