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
import { Star, Loader2, Target } from "lucide-react";
import { updateProject } from "@/lib/supabase/journey";
import { toast } from "sonner";

interface CreateMilestoneNorthStarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  projectId: string;
  projectTitle: string;
  existingMilestoneNorthStar?: {
    title: string;
    description?: string;
    why?: string;
  }; // For editing mode
}

export function CreateMilestoneNorthStarDialog({
  open,
  onOpenChange,
  onSuccess,
  projectId,
  projectTitle,
  existingMilestoneNorthStar,
}: CreateMilestoneNorthStarDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    why: "",
  });

  const isEditMode = Boolean(existingMilestoneNorthStar);

  // Load existing milestone North Star data when in edit mode
  React.useEffect(() => {
    if (open && existingMilestoneNorthStar) {
      setFormData({
        title: existingMilestoneNorthStar.title || "",
        description: existingMilestoneNorthStar.description || "",
        why: existingMilestoneNorthStar.why || "",
      });
    } else if (open && !existingMilestoneNorthStar) {
      // Reset form for create mode
      setFormData({
        title: "",
        description: "",
        why: "",
      });
    }
  }, [open, existingMilestoneNorthStar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter a title for your North Star");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && existingMilestoneNorthStar) {
        console.log("✏️ Updating milestone North Star for project:", projectId);

        // Update milestone North Star in project metadata
        await updateProject(projectId, {
          metadata: {
            milestone_north_star: {
              title: formData.title.trim(),
              description: formData.description.trim() || undefined,
              why: formData.why.trim() || undefined,
              updated_at: new Date().toISOString(),
              created_from_milestone: true,
            },
            has_milestone_north_star: true,
          },
        });

        console.log("✅ Milestone North Star updated");
        toast.success(`North Star "${formData.title}" updated successfully!`);
      } else {
        console.log("🌟 Creating North Star for project:", projectId);

        // Store North Star data directly in project metadata (separate from journey North Stars)
        await updateProject(projectId, {
          metadata: {
            milestone_north_star: {
              title: formData.title.trim(),
              description: formData.description.trim() || undefined,
              why: formData.why.trim() || undefined,
              created_at: new Date().toISOString(),
              created_from_milestone: true,
            },
            has_milestone_north_star: true,
          },
        });

        console.log("🔗 Project linked to North Star");
        toast.success(`North Star "${formData.title}" created and linked to your project!`);
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error(`❌ Error ${isEditMode ? 'updating' : 'creating'} North Star:`, error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} North Star: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            {isEditMode ? `Edit North Star for "${projectTitle}"` : `Create North Star for "${projectTitle}"`}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Update your North Star to better reflect your current vision and goals."
              : "A North Star is your long-term vision that guides this project's direction. It helps you stay focused on what truly matters."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span className="ml-2 text-sm text-muted-foreground">Loading North Star data...</span>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl p-4 border-2 border-amber-200 dark:border-amber-800">
                <div className="text-center mb-3">
                  <div className="text-2xl mb-1">🌟</div>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {isEditMode 
                      ? "Update your vision and goals to keep your North Star aligned."
                      : "Think big picture - what's the ultimate goal this project serves?"
                    }
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-base font-semibold">
                      North Star Title *
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g., Become a skilled software developer"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                      }
                      required
                      className="text-base"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-base font-semibold">
                      Vision Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your long-term vision in more detail..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, description: e.target.value }))
                      }
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="why" className="text-base font-semibold">
                      Why does this matter to you?
                    </Label>
                    <Textarea
                      id="why"
                      placeholder="What drives you? What impact do you want to make?"
                      value={formData.why}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, why: e.target.value }))
                      }
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      This will help guide your project
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Once created, your North Star will appear in the journey map and 
                      help you make decisions about your project's direction.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || isLoading}
            >
              {isEditMode ? "Cancel" : "Skip for now"}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 mr-2" />
                  {isEditMode ? "Update North Star" : "Create North Star"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}