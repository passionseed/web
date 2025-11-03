/**
 * CreateProjectDialog - Dialog for creating new journey projects
 * Supports both short-term and North Star projects
 */

"use client";

import React, { useState, useEffect } from "react";
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
import { Star, Target, Loader2, Link2 } from "lucide-react";
import { createJourneyProject } from "@/lib/supabase/journey";
import { createNorthStar } from "@/lib/supabase/north-star";
import { ProjectType } from "@/types/journey";
import { toast } from "sonner";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SDG_GOALS,
  CAREER_PATHS,
  NORTH_STAR_SHAPES,
  NORTH_STAR_COLORS,
} from "@/constants/sdg";
import { useNorthStars } from "@/hooks/use-north-stars";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preSelectedNorthStarId?: string;
  highlightNorthStarLink?: boolean;
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
  onSuccess,
  preSelectedNorthStarId,
  highlightNorthStarLink = false,
}: CreateProjectDialogProps) {
  // Load North Stars for linking
  const { northStars, isLoading: northStarsLoading } = useNorthStars();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [icon, setIcon] = useState("🎯");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    projectType: "learning" as ProjectType,
    isNorthStar: false,
    northStarId: "",
    color: PROJECT_COLORS[0].value,
    isMainQuest: false,
    // North Star enhancements
    sdgGoals: [] as number[],
    careerPath: "",
    northStarShape: "classic",
    northStarColor: "golden",
  });

  // Handle pre-selection of North Star
  useEffect(() => {
    if (open && preSelectedNorthStarId) {
      setFormData((prev) => ({
        ...prev,
        northStarId: preSelectedNorthStarId,
        isNorthStar: false, // Force short-term project mode
      }));
    }
  }, [open, preSelectedNorthStarId]);

  // Get pre-selected North Star details for display
  const preSelectedNorthStar = preSelectedNorthStarId
    ? northStars.find((ns) => ns.id === preSelectedNorthStarId)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter a project title");
      return;
    }

    setIsSubmitting(true);

    try {
      if (formData.isNorthStar) {
        // Create North Star instead of project
        const northStarData = {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          why: formData.why || null,
          icon: icon,
          sdg_goals: formData.sdgGoals.length > 0 ? formData.sdgGoals : [],
          career_path: formData.careerPath || null,
          north_star_shape: formData.northStarShape,
          north_star_color: formData.northStarColor,
          metadata: {},
        };

        await createNorthStar(northStarData);
        toast.success(`North Star "${formData.title}" created successfully!`);
      } else {
        // Create regular project
        const projectData: any = {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          project_type: formData.projectType,
          color: formData.color,
          icon: icon,
          status: "planning",
          metadata: {
            is_main_quest: formData.isMainQuest,
          },
        };

        // Add North Star link if selected
        if (formData.northStarId) {
          projectData.linked_north_star_id = formData.northStarId;
        }

        await createJourneyProject(projectData);
        toast.success(`Project "${formData.title}" created successfully!`);
      }

      // Reset form
      setIcon("🎯");
      setFormData({
        title: "",
        description: "",
        projectType: "learning",
        isNorthStar: false,
        northStarId: "",
        color: PROJECT_COLORS[0].value,
        isMainQuest: false,
        sdgGoals: [],
        careerPath: "",
        northStarShape: "classic",
        northStarColor: "golden",
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
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
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

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 overflow-y-auto flex-1 pr-2 -mr-2">
            {/* Pre-selected North Star Badge */}
            {preSelectedNorthStar && (
              <div className="bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-300 dark:border-purple-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-semibold text-purple-900 dark:text-purple-100">
                    Leading To: {preSelectedNorthStar.title}
                  </span>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  This project will be linked to the North Star above
                </p>
              </div>
            )}

            {/* North Star toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="north-star" className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  North Star Project
                </Label>
                <p className="text-sm text-gray-600">
                  {preSelectedNorthStarId
                    ? "Disabled - creating project linked to existing North Star"
                    : "Long-term guiding project for your journey"}
                </p>
              </div>
              <Switch
                id="north-star"
                checked={formData.isNorthStar}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isNorthStar: checked }))
                }
                disabled={!!preSelectedNorthStarId}
              />
            </div>

            {/* North Star Customization (only show if North Star is enabled) */}
            {formData.isNorthStar && (
              <>
                {/* SDG Goals Multi-select */}
                <div className="space-y-2 border rounded-lg p-4 bg-amber-50/50 dark:bg-amber-950/20">
                  <Label className="text-base font-semibold">
                    🌍 Sustainable Development Goals (Optional)
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select UN SDGs that align with your North Star
                  </p>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2">
                    {SDG_GOALS.map((sdg) => (
                      <div
                        key={sdg.number}
                        className="flex items-start space-x-2 p-2 rounded hover:bg-white/50 dark:hover:bg-background/50"
                      >
                        <Checkbox
                          id={`sdg-${sdg.number}`}
                          checked={formData.sdgGoals.includes(sdg.number)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData((prev) => ({
                                ...prev,
                                sdgGoals: [...prev.sdgGoals, sdg.number],
                              }));
                            } else {
                              setFormData((prev) => ({
                                ...prev,
                                sdgGoals: prev.sdgGoals.filter(
                                  (n) => n !== sdg.number
                                ),
                              }));
                            }
                          }}
                        />
                        <label
                          htmlFor={`sdg-${sdg.number}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: sdg.color }}
                            >
                              {sdg.number}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">
                                {sdg.title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {sdg.description}
                              </div>
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                  {formData.sdgGoals.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Selected: {formData.sdgGoals.length} SDG
                      {formData.sdgGoals.length > 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                {/* Career Path Selection */}
                <div className="space-y-2">
                  <Label htmlFor="career-path">💼 Career Path (Optional)</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose a career direction that aligns with your North Star
                  </p>
                  <Select
                    value={formData.careerPath || "none"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        careerPath: value === "none" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger id="career-path">
                      <SelectValue placeholder="Select a career path..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific path</SelectItem>
                      {CAREER_PATHS.map((path) => (
                        <SelectItem key={path.value} value={path.value}>
                          {path.icon} {path.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* North Star Shape */}
                <div className="space-y-2">
                  <Label>✨ Star Icon</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose an icon that represents your North Star
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {NORTH_STAR_SHAPES.map((shape) => (
                      <button
                        key={shape.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            northStarShape: shape.value,
                          }))
                        }
                        className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                          formData.northStarShape === shape.value
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20 scale-105"
                            : "border-gray-300 dark:border-gray-700"
                        }`}
                        title={shape.label}
                      >
                        <div className="text-2xl text-center">{shape.icon}</div>
                        <div className="text-xs text-center mt-1 truncate">
                          {shape.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* North Star Color */}
                <div className="space-y-2">
                  <Label>🎨 Star Color Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Select a color theme for your North Star
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {NORTH_STAR_COLORS.map((colorTheme) => (
                      <button
                        key={colorTheme.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            northStarColor: colorTheme.value,
                          }))
                        }
                        className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                          formData.northStarColor === colorTheme.value
                            ? "border-amber-500 scale-105"
                            : "border-gray-300 dark:border-gray-700"
                        }`}
                        title={colorTheme.label}
                      >
                        <div
                          className="w-full h-8 rounded"
                          style={{
                            background: `linear-gradient(135deg, ${colorTheme.color} 0%, ${colorTheme.glow} 100%)`,
                          }}
                        />
                        <div className="text-xs text-center mt-1 truncate">
                          {colorTheme.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Icon Picker */}
            <div className="space-y-2">
              <Label htmlFor="icon">Project Icon</Label>
              <p className="text-sm text-slate-500">
                Choose an emoji that represents your project
              </p>
              <EmojiPicker
                value={icon}
                onSelect={setIcon}
                disabled={isSubmitting}
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
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
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
                  setFormData((prev) => ({
                    ...prev,
                    projectType: value as ProjectType,
                  }))
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
            {!formData.isNorthStar && (
              <div
                className={`space-y-2 ${
                  highlightNorthStarLink && preSelectedNorthStarId
                    ? "rounded-lg border-2 border-purple-300 dark:border-purple-700 p-4 bg-purple-50/50 dark:bg-purple-950/10"
                    : ""
                }`}
              >
                <Label htmlFor="north-star-link" className="flex items-center gap-2">
                  Link to North Star (Optional)
                  {preSelectedNorthStarId && (
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-normal">
                      (Pre-selected from North Star node)
                    </span>
                  )}
                </Label>
                {northStarsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 p-3 border rounded-md">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading North Stars...
                  </div>
                ) : northStars.length === 0 ? (
                  <div className="text-sm text-gray-500 p-3 border rounded-md bg-gray-50">
                    No North Stars yet. Create a North Star first to link
                    projects to it!
                  </div>
                ) : (
                  <>
                    <Select
                      value={formData.northStarId || "none"}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          northStarId: value === "none" ? "" : value,
                        }))
                      }
                    >
                      <SelectTrigger id="north-star-link">
                        <SelectValue placeholder="Select a North Star..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-gray-500">None</span>
                        </SelectItem>
                        {northStars.map((northStar) => {
                          const shapeData = NORTH_STAR_SHAPES.find(
                            (s) => s.value === northStar.north_star_shape
                          );
                          return (
                            <SelectItem key={northStar.id} value={northStar.id}>
                              <span className="flex items-center gap-2">
                                <span>{shapeData?.icon || "⭐"}</span>
                                <span>{northStar.title}</span>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Connect this project to your long-term North Star goal
                    </p>
                  </>
                )}
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
