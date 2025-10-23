/**
 * CreateProjectDialog - Dialog for creating new journey projects
 * Supports both short-term and North Star projects
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, Target, Loader2 } from "lucide-react";
import { createJourneyProject } from "@/lib/supabase/journey";
import { ProjectType } from "@/types/journey";
import { toast } from "sonner";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  northStarProjects: Array<{ id: string; title: string }>;
  onSuccess: () => void;
}

const PROJECT_COLORS = [
  { label: "Blue", value: "#dbeafe" },
  { label: "Green", value: "#d1fae5" },
  { label: "Purple", value: "#e9d5ff" },
  { label: "Pink", value: "#fce7f3" },
  { label: "Yellow", value: "#fef3c7" },
  { label: "Orange", value: "#fed7aa" },
  { label: "Red", value: "#fee2e2" },
  { label: "Gray", value: "#f3f4f6" },
];

export function CreateProjectDialog({
  open,
  onOpenChange,
  northStarProjects,
  onSuccess,
}: CreateProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    projectType: "learning" as ProjectType,
    isNorthStar: false,
    northStarId: "",
    color: PROJECT_COLORS[0].value,
    isMainQuest: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter a project title");
      return;
    }

    setIsSubmitting(true);

    try {
      const projectData: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        project_type: formData.projectType,
        color: formData.color,
        status: "planning",
        metadata: {
          is_north_star: formData.isNorthStar,
          is_main_quest: formData.isMainQuest,
        },
      };

      // Add North Star link if selected
      if (!formData.isNorthStar && formData.northStarId) {
        projectData.metadata.north_star_id = formData.northStarId;
      }

      await createJourneyProject(projectData);

      toast.success(`Project "${formData.title}" created successfully!`);

      // Reset form
      setFormData({
        title: "",
        description: "",
        projectType: "learning",
        isNorthStar: false,
        northStarId: "",
        color: PROJECT_COLORS[0].value,
        isMainQuest: false,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {formData.isNorthStar ? (
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            ) : (
              <Target className="w-5 h-5 text-blue-500" />
            )}
            Create New Project
          </DialogTitle>
          <DialogDescription>
            {formData.isNorthStar
              ? "Create a long-term North Star project to guide your journey."
              : "Create a short-term project to work towards your goals."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* North Star toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="north-star" className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                North Star Project
              </Label>
              <p className="text-sm text-gray-600">
                Long-term guiding project for your journey
              </p>
            </div>
            <Switch
              id="north-star"
              checked={formData.isNorthStar}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isNorthStar: checked }))
              }
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Project Title *</Label>
            <Input
              id="title"
              placeholder="Enter project title..."
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What is this project about?"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
            />
          </div>

          {/* Project Type */}
          <div className="space-y-2">
            <Label htmlFor="project-type">Project Type</Label>
            <Select
              value={formData.projectType}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, projectType: value as ProjectType }))
              }
            >
              <SelectTrigger id="project-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="learning">Learning</SelectItem>
                <SelectItem value="career">Career</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="community">Community</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Link to North Star (if not North Star itself) */}
          {!formData.isNorthStar && northStarProjects.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="north-star-link">Link to North Star (Optional)</Label>
              <Select
                value={formData.northStarId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, northStarId: value }))
                }
              >
                <SelectTrigger id="north-star-link">
                  <SelectValue placeholder="Select a North Star project..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {northStarProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Color picker */}
          <div className="space-y-2">
            <Label>Theme Color</Label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, color: color.value }))
                  }
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    formData.color === color.value
                      ? "border-blue-500 scale-110"
                      : "border-gray-300 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.value }}
                  aria-label={color.label}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Main Quest toggle */}
          {!formData.isNorthStar && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="main-quest">Main Quest</Label>
                <p className="text-sm text-gray-600">
                  Mark as primary focus project
                </p>
              </div>
              <Switch
                id="main-quest"
                checked={formData.isMainQuest}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isMainQuest: checked }))
                }
              />
            </div>
          )}

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
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
