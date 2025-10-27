/**
 * MilestoneCreationMode - Form for creating new milestones
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Loader2 } from "lucide-react";
import { useMilestoneForm } from "@/hooks/useMilestoneForm";
import {
  TitleField,
  DescriptionField,
  DetailsField,
  ProgressSlider,
  StatusSelector,
} from "../forms/MilestoneFormFields";
import { ProjectMilestone } from "@/types/journey";

interface MilestoneCreationModeProps {
  projectId: string;
  allMilestones: ProjectMilestone[];
  onMilestoneCreated: () => void;
}

export function MilestoneCreationMode({
  projectId,
  allMilestones,
  onMilestoneCreated,
}: MilestoneCreationModeProps) {
  const createForm = useMilestoneForm({
    projectId,
    milestone: null,
    onSuccess: onMilestoneCreated,
    existingMilestones: allMilestones,
  });

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
          disabled={
            createForm.isSubmitting || !createForm.formData.title.trim()
          }
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
