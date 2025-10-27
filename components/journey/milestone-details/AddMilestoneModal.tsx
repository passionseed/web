/**
 * AddMilestoneModal - Modal dialog for creating new milestones
 * Provides a focused, clean interface for milestone creation
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus } from "lucide-react";
import { useMilestoneForm } from "@/hooks/useMilestoneForm";
import {
  TitleField,
  DescriptionField,
  DetailsField,
  ProgressSlider,
  StatusSelector,
} from "../forms/MilestoneFormFields";
import { ProjectMilestone } from "@/types/journey";

interface AddMilestoneModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  allMilestones: ProjectMilestone[];
  onMilestoneCreated: () => void;
}

export function AddMilestoneModal({
  isOpen,
  onOpenChange,
  projectId,
  allMilestones,
  onMilestoneCreated,
}: AddMilestoneModalProps) {
  const createForm = useMilestoneForm({
    projectId,
    milestone: null,
    onSuccess: () => {
      onMilestoneCreated();
      // Close modal after successful creation
      onOpenChange(false);
    },
    existingMilestones: allMilestones,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <Plus className="w-5 h-5 text-blue-400" />
            Create New Milestone
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Add a milestone to track progress on your project. Break down your
            goals into manageable steps.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            <TitleField
              value={createForm.formData.title}
              onChange={(value: string) => createForm.updateField("title", value)}
              disabled={createForm.isSubmitting}
              error={createForm.errors.title}
            />

            <DescriptionField
              value={createForm.formData.description}
              onChange={(value: string) => createForm.updateField("description", value)}
              disabled={createForm.isSubmitting}
            />

            <DetailsField
              value={createForm.formData.details}
              onChange={(value: string) => createForm.updateField("details", value)}
              disabled={createForm.isSubmitting}
            />

            <ProgressSlider
              value={createForm.formData.progress}
              onChange={(value: number) => createForm.updateField("progress", value)}
              disabled={createForm.isSubmitting}
            />

            <StatusSelector
              value={createForm.formData.status}
              onChange={(value: any) => createForm.updateField("status", value)}
              disabled={createForm.isSubmitting}
            />
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createForm.isSubmitting}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={createForm.handleSubmit}
            disabled={
              createForm.isSubmitting || !createForm.formData.title.trim()
            }
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            {createForm.isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Create Milestone
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
