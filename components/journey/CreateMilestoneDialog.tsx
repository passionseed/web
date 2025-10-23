/**
 * CreateMilestoneDialog - Dialog for creating new milestones in a project
 * Supports linking to previous milestones and custom positioning
 */

"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Target } from "lucide-react";
import { createMilestone, createMilestonePath } from "@/lib/supabase/journey";
import { ProjectMilestone } from "@/types/journey";
import { toast } from "sonner";

interface CreateMilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  existingMilestones: ProjectMilestone[];
  onSuccess: () => void;
}

export function CreateMilestoneDialog({
  open,
  onOpenChange,
  projectId,
  existingMilestones,
  onSuccess,
}: CreateMilestoneDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    previousMilestoneId: "",
    estimatedHours: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter a milestone title");
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate position based on existing milestones
      let position = { x: 100, y: 100 };
      if (existingMilestones.length > 0) {
        // Position in a flowing pattern
        const lastMilestone = existingMilestones[existingMilestones.length - 1];
        const lastPosition = lastMilestone.position || { x: 100, y: 100 };

        // Alternate between right and down movements for a natural flow
        if (existingMilestones.length % 3 === 0) {
          position = { x: lastPosition.x - 150, y: lastPosition.y + 200 };
        } else {
          position = { x: lastPosition.x + 200, y: lastPosition.y };
        }
      }

      const milestoneData = {
        project_id: projectId,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        estimated_hours: formData.estimatedHours
          ? parseFloat(formData.estimatedHours)
          : undefined,
        position,
      };

      const newMilestone = await createMilestone(projectId, milestoneData);

      // Create path to previous milestone if selected
      if (formData.previousMilestoneId) {
        await createMilestonePath(
          formData.previousMilestoneId,
          newMilestone.id,
          "linear"
        );
      }

      toast.success(`Milestone "${formData.title}" created successfully!`);

      // Reset form
      setFormData({
        title: "",
        description: "",
        previousMilestoneId: "",
        estimatedHours: "",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating milestone:", error);
      toast.error("Failed to create milestone. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Create New Milestone
          </DialogTitle>
          <DialogDescription>
            Add a new milestone to track progress on this project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="milestone-title">Milestone Title *</Label>
            <Input
              id="milestone-title"
              placeholder="Enter milestone title..."
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="milestone-description">Description</Label>
            <Textarea
              id="milestone-description"
              placeholder="What needs to be accomplished?"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
            />
          </div>

          {/* Estimated hours */}
          <div className="space-y-2">
            <Label htmlFor="estimated-hours">Estimated Hours (Optional)</Label>
            <Input
              id="estimated-hours"
              type="number"
              min="0"
              step="0.5"
              placeholder="e.g., 10"
              value={formData.estimatedHours}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, estimatedHours: e.target.value }))
              }
            />
          </div>

          {/* Link to previous milestone */}
          {existingMilestones.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="previous-milestone">
                Link to Previous Milestone (Optional)
              </Label>
              <Select
                value={formData.previousMilestoneId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, previousMilestoneId: value }))
                }
              >
                <SelectTrigger id="previous-milestone">
                  <SelectValue placeholder="Select a milestone..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None - Start fresh</SelectItem>
                  {existingMilestones.map((milestone) => (
                    <SelectItem key={milestone.id} value={milestone.id}>
                      {milestone.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Create a path from the selected milestone to this new one.
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              The milestone will be automatically positioned on the map. You can
              adjust its location later in the milestone map view.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Milestone"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
