/**
 * EditProjectDialog - Dialog for editing project details
 * Allows editing title, goal, why, and description
 */

"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

import { updateProjectDetails } from "@/lib/supabase/journey";
import { JourneyProject } from "@/types/journey";
import { EmojiPicker } from "@/components/ui/EmojiPicker";

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: JourneyProject | null;
  onSuccess?: (updatedProject?: Partial<JourneyProject>) => void;
}

export function EditProjectDialog({
  open,
  onOpenChange,
  project,
  onSuccess,
}: EditProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [icon, setIcon] = useState("🎯");
  const [formData, setFormData] = useState({
    title: "",
    goal: "",
    why: "",
    description: "",
  });

  // Update form data when project changes
  useEffect(() => {
    if (project) {
      setIcon((project as any).icon || "🎯");
      setFormData({
        title: project.title || "",
        goal: project.goal || "",
        why: project.why || "",
        description: project.description || "",
      });
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!project) return;

    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedData = {
        title: formData.title.trim(),
        goal: formData.goal.trim() || undefined,
        why: formData.why.trim() || undefined,
        description: formData.description.trim() || undefined,
        icon: icon,
      };

      // Always update in database first
      await updateProjectDetails(project.id, updatedData);

      // Then call onSuccess if provided (e.g. to refresh the list)
      if (onSuccess) {
        onSuccess(updatedData);
      }
      
      toast.success("Project updated successfully!");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update your project details, goals, and motivation
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-2 -mr-2">
            {/* Icon Picker */}
            <div className="space-y-2">
              <Label htmlFor="icon">Project Icon</Label>
              <p className="text-sm text-slate-500">
                Choose an emoji that represents your project
              </p>
              <EmojiPicker value={icon} onSelect={setIcon} disabled={isSubmitting} />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Project title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                maxLength={500}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                {formData.title.length}/500 characters
              </p>
            </div>

            {/* Goal */}
            <div className="space-y-2">
              <Label htmlFor="goal">Goal</Label>
              <Textarea
                id="goal"
                placeholder="What do you want to achieve with this project?"
                value={formData.goal}
                onChange={(e) =>
                  setFormData({ ...formData, goal: e.target.value })
                }
                rows={3}
                maxLength={2000}
                disabled={isSubmitting}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {formData.goal.length}/2000 characters
              </p>
            </div>

            {/* Why */}
            <div className="space-y-2">
              <Label htmlFor="why">Why</Label>
              <Textarea
                id="why"
                placeholder="Why is this project important to you?"
                value={formData.why}
                onChange={(e) =>
                  setFormData({ ...formData, why: e.target.value })
                }
                rows={3}
                maxLength={2000}
                disabled={isSubmitting}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {formData.why.length}/2000 characters
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Additional details about your project"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                maxLength={5000}
                disabled={isSubmitting}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/5000 characters
              </p>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
