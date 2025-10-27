/**
 * MilestoneDetailsPanel - Inline panel for viewing and editing milestone details
 * Includes tabs for details, journal entries, and inline editing
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Target,
  BookOpen,
  Edit,
  Loader2,
  CheckCircle2,
  Clock,
  Circle,
  AlertCircle,
  Plus,
  Save,
  GitBranch,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useMilestoneForm } from "@/hooks/useMilestoneForm";
import {
  TitleField,
  DescriptionField,
  DetailsField,
  ProgressSlider,
  StatusSelector,
} from "./forms/MilestoneFormFields";
import { InlineEditableDescription } from "./milestone-details/details/InlineEditableDescription";

import {
  getProjectById,
  getMilestoneJournals,
  addMilestoneJournal,
  updateMilestone,
  getMilestoneById,
  getProjectMilestones,
} from "@/lib/supabase/journey";
import {
  ProjectWithMilestones,
  ProjectMilestone,
  MilestoneJournal,
  MilestoneStatus,
  MilestoneWithPaths,
} from "@/types/journey";

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
  const [isLoading, setIsLoading] = useState(false);
  const [project, setProject] = useState<ProjectWithMilestones | null>(null);
  const [milestoneDetails, setMilestoneDetails] = useState<MilestoneWithPaths | null>(null);
  const [journals, setJournals] = useState<MilestoneJournal[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [editProgress, setEditProgress] = useState(0);
  const [editStatus, setEditStatus] = useState<MilestoneStatus>("not_started");

  // Journal form state
  const [newJournalContent, setNewJournalContent] = useState("");
  const [isAddingJournal, setIsAddingJournal] = useState(false);

  // Form hook for creation mode (when milestone === null)
  const createForm = useMilestoneForm({
    projectId,
    milestone: null,
    onSuccess: onMilestoneUpdated,
    existingMilestones: allMilestones,
  });

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  useEffect(() => {
    if (milestone) {
      loadMilestoneDetails();
      setEditTitle(milestone.title);
      setEditDescription(milestone.description || "");
      setEditDetails(milestone.details || "");
      setEditProgress(milestone.progress_percentage);
      setEditStatus(milestone.status);
    }
  }, [milestone]);

  const loadProjectData = async () => {
    setIsLoading(true);
    try {
      const projectData = await getProjectById(projectId);
      setProject(projectData);
    } catch (error) {
      console.error("Error loading project:", error);
      toast.error("Failed to load project");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMilestoneDetails = async () => {
    if (!milestone) return;

    setIsLoading(true);
    try {
      // Load full milestone data with paths
      const milestoneData = await getMilestoneById(milestone.id);
      setMilestoneDetails(milestoneData);

      // Load journals
      const journalData = await getMilestoneJournals(milestone.id);
      setJournals(journalData);
    } catch (error) {
      console.error("Error loading milestone details:", error);
      toast.error("Failed to load milestone details");
    } finally {
      setIsLoading(false);
    }
  };


  const handleProgressChange = useCallback(
    async (value: number[]) => {
      if (!milestone) return;

      const newProgress = value[0];
      setEditProgress(newProgress);

      try {
        await updateMilestone(milestone.id, {
          progress_percentage: newProgress,
          status: newProgress === 100 ? "completed" : newProgress > 0 ? "in_progress" : "not_started",
        });
        onMilestoneUpdated();
        toast.success("Progress updated");
      } catch (error) {
        console.error("Error updating progress:", error);
        toast.error("Failed to update progress");
      }
    },
    [milestone, onMilestoneUpdated]
  );

  const handleStatusChange = useCallback(
    async (newStatus: MilestoneStatus) => {
      if (!milestone) return;

      setEditStatus(newStatus);

      try {
        await updateMilestone(milestone.id, {
          status: newStatus,
        });
        onMilestoneUpdated();
        toast.success("Status updated");
      } catch (error) {
        console.error("Error updating status:", error);
        toast.error("Failed to update status");
      }
    },
    [milestone, onMilestoneUpdated]
  );

  const handleSaveDetails = useCallback(async () => {
    if (!milestone) return;

    setIsSaving(true);
    try {
      await updateMilestone(milestone.id, {
        title: editTitle,
        description: editDescription,
        details: editDetails,
        progress_percentage: editProgress,
        status: editStatus,
      });
      onMilestoneUpdated();
      toast.success("Milestone updated");
    } catch (error) {
      console.error("Error saving milestone:", error);
      toast.error("Failed to save milestone");
    } finally {
      setIsSaving(false);
    }
  }, [milestone, editTitle, editDescription, editDetails, editProgress, editStatus, onMilestoneUpdated]);

  const handleAddJournal = useCallback(async () => {
    if (!milestone || !newJournalContent.trim()) return;

    setIsAddingJournal(true);
    try {
      await addMilestoneJournal(milestone.id, newJournalContent, milestone.progress_percentage);
      setNewJournalContent("");
      // Reload journals only
      const journalData = await getMilestoneJournals(milestone.id);
      setJournals(journalData);
      toast.success("Journal entry added");
    } catch (error) {
      console.error("Error adding journal:", error);
      toast.error("Failed to add journal entry");
    } finally {
      setIsAddingJournal(false);
    }
  }, [milestone, newJournalContent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // CREATION MODE - Show when no milestone is selected
  if (!milestone) {
    return (
      <div className="h-full flex flex-col bg-slate-900">
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-400" />
            Create New Milestone
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Add a milestone to track progress on this project
          </p>
        </div>

        {/* Creation Form */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <TitleField
              value={createForm.formData.title}
              onChange={(value) => createForm.updateField("title", value)}
              disabled={createForm.isSubmitting}
              error={createForm.errors.title}
            />

            <DescriptionField
              value={createForm.formData.description}
              onChange={(value) => createForm.updateField("description", value)}
              disabled={createForm.isSubmitting}
            />

            <DetailsField
              value={createForm.formData.details}
              onChange={(value) => createForm.updateField("details", value)}
              disabled={createForm.isSubmitting}
            />

            <ProgressSlider
              value={createForm.formData.progress}
              onChange={(value) => createForm.updateField("progress", value)}
              disabled={createForm.isSubmitting}
            />

            <StatusSelector
              value={createForm.formData.status}
              onChange={(value) => createForm.updateField("status", value)}
              disabled={createForm.isSubmitting}
            />
          </div>
        </ScrollArea>

        {/* Footer with Create Button */}
        <div className="p-4 border-t border-slate-800">
          <Button
            onClick={createForm.handleSubmit}
            disabled={createForm.isSubmitting || !createForm.formData.title.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {createForm.isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Milestone
          </Button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const statusStyle = {
    not_started: "bg-slate-700 text-slate-200",
    in_progress: "bg-blue-700 text-blue-200",
    completed: "bg-green-700 text-green-200",
    blocked: "bg-red-700 text-red-200",
    skipped: "bg-yellow-700 text-yellow-200",
  }[milestone.status] || "bg-slate-700 text-slate-200";

  const StatusIcon = {
    completed: CheckCircle2,
    in_progress: Clock,
    blocked: AlertCircle,
    skipped: AlertCircle,
    not_started: Circle,
  }[milestone.status] || Circle;

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        {/* Project Context */}
        <div className="mb-3 pb-3 border-b border-slate-800/50">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-400">Project</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-200">
            {project.title}
          </h3>
          {project.description && (
            <p className="text-xs text-slate-500 line-clamp-1">
              {project.description}
            </p>
          )}
        </div>

        {/* Milestone Header */}
        <div className="flex items-start gap-2 mb-3">
          <StatusIcon className="w-5 h-5 text-blue-400 mt-1" />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-100 mb-2">
              {milestone.title}
            </h2>
            <Badge className={statusStyle}>{milestone.status}</Badge>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Progress</span>
            <span className="text-slate-300 font-medium">
              {milestone.progress_percentage}%
            </span>
          </div>
          <Progress value={milestone.progress_percentage} className="h-2" />
        </div>
      </div>

      {/* Tabs Content */}
      <ScrollArea className="flex-1">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-slate-800/50 m-4">
            <TabsTrigger value="details" className="text-xs">
              Details
            </TabsTrigger>
            <TabsTrigger value="journal" className="text-xs">
              Journal
            </TabsTrigger>
            <TabsTrigger value="edit" className="text-xs">
              Edit
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="p-4 space-y-4">
            <div className="bg-slate-800/30 rounded-lg p-3">
              <InlineEditableDescription
                value={editDescription}
                onChange={setEditDescription}
                onSave={handleSaveDetails}
                placeholder="Add a brief description of this milestone..."
                label="Description"
                maxLength={2000}
                rows={3}
              />
            </div>

            <div className="bg-slate-800/30 rounded-lg p-3">
              <InlineEditableDescription
                value={editDetails}
                onChange={setEditDetails}
                onSave={handleSaveDetails}
                placeholder="Add detailed notes, requirements, or context..."
                label="Detailed Notes"
                maxLength={10000}
                rows={6}
              />
            </div>

            <Separator className="bg-slate-800" />

            {/* Progress Slider */}
            <div className="bg-slate-800/30 rounded-lg p-3">
              <Label className="text-sm font-semibold text-slate-200 mb-3 block">
                Update Progress
              </Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[milestone.progress_percentage]}
                  onValueChange={handleProgressChange}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-slate-300 min-w-[3rem] text-right">
                  {milestone.progress_percentage}%
                </span>
              </div>
            </div>

            {/* Status Selector */}
            <div className="bg-slate-800/30 rounded-lg p-3">
              <Label className="text-sm font-semibold text-slate-200 mb-3 block">
                Status
              </Label>
              <Select value={milestone.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="bg-slate-900 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dependencies Section */}
            {milestoneDetails && (milestoneDetails.paths_source?.length > 0 || milestoneDetails.paths_destination?.length > 0) && (
              <>
                <Separator className="bg-slate-700" />

                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    Dependencies
                  </h3>

                  {/* Incoming connections (prerequisites) */}
                  {milestoneDetails.paths_destination && milestoneDetails.paths_destination.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-slate-400 mb-2">
                        Depends on ({milestoneDetails.paths_destination.length}):
                      </p>
                      <div className="space-y-1">
                        {milestoneDetails.paths_destination.map((path) => {
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
                              <Badge
                                variant="secondary"
                                className="text-xs ml-2 shrink-0"
                              >
                                {path.path_type}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Outgoing connections (blocks) */}
                  {milestoneDetails.paths_source && milestoneDetails.paths_source.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-2">
                        Blocks ({milestoneDetails.paths_source.length}):
                      </p>
                      <div className="space-y-1">
                        {milestoneDetails.paths_source.map((path) => {
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
                              <Badge
                                variant="secondary"
                                className="text-xs ml-2 shrink-0"
                              >
                                {path.path_type}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator className="bg-slate-800" />

            {/* Metadata */}
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-2">
                Information
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Created</span>
                  <span>
                    {format(new Date(milestone.created_at), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Last updated</span>
                  <span>
                    {format(new Date(milestone.updated_at), "MMM d, yyyy")}
                  </span>
                </div>
                {milestone.completed_at && (
                  <div className="flex justify-between text-slate-400">
                    <span>Completed</span>
                    <span>
                      {format(new Date(milestone.completed_at), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Journal entries</span>
                  <span>{journals.length}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Journal Tab */}
          <TabsContent value="journal" className="p-4 space-y-4">
            {/* Add Journal Form */}
            <div className="bg-slate-800/30 rounded-lg p-3">
              <Label className="text-sm font-semibold text-slate-200 mb-2 block">
                Add Journal Entry
              </Label>
              <Textarea
                value={newJournalContent}
                onChange={(e) => setNewJournalContent(e.target.value)}
                placeholder="What did you work on? What challenges did you face? What did you learn?"
                className="bg-slate-900 border-slate-700 mb-2 min-h-[100px]"
                maxLength={5000}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {newJournalContent.length} / 5000
                </span>
                <Button
                  onClick={handleAddJournal}
                  disabled={!newJournalContent.trim() || isAddingJournal}
                  size="sm"
                >
                  {isAddingJournal ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3 mr-2" />
                      Add Entry
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Separator className="bg-slate-800" />

            {/* Journal Entries */}
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Journal History ({journals.length})
              </h3>

              {journals.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No journal entries yet</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Add your first entry above
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {journals.map((journal) => (
                    <div
                      key={journal.id}
                      className="bg-slate-800/50 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs text-slate-500">
                          {format(new Date(journal.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">
                        {journal.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Edit Tab */}
          <TabsContent value="edit" className="p-4 space-y-4">
            <TitleField
              value={editTitle}
              onChange={setEditTitle}
              disabled={isSaving}
            />

            <DescriptionField
              value={editDescription}
              onChange={setEditDescription}
              disabled={isSaving}
            />

            <DetailsField
              value={editDetails}
              onChange={setEditDetails}
              disabled={isSaving}
            />

            <ProgressSlider
              value={editProgress}
              onChange={setEditProgress}
              disabled={isSaving}
            />

            <StatusSelector
              value={editStatus}
              onChange={setEditStatus}
              disabled={isSaving}
            />

            <Separator className="bg-slate-800" />

            <Button
              onClick={handleSaveDetails}
              disabled={isSaving || !editTitle.trim()}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}
