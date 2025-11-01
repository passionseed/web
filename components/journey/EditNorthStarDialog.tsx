/**
 * EditNorthStarDialog - Dialog for editing North Star details
 * Allows editing title, vision, action, status, progress, SDG goals, career path, and star customization
 */

"use client";

import { useState, useEffect } from "react";
import { Loader2, Star } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

import { updateNorthStar } from "@/lib/supabase/north-star";
import { NorthStar, NorthStarStatus } from "@/types/journey";
import { StarGenerator } from "@/components/ui/star-generator";
import {
  StarConfig,
  createDefaultStarConfig,
  validateStarConfig,
} from "@/lib/utils/svg-star";
import {
  SDG_GOALS,
  CAREER_PATHS,
  NORTH_STAR_COLORS,
} from "@/constants/sdg";

interface EditNorthStarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  northStar: NorthStar | null;
  onSuccess?: () => void;
}

export function EditNorthStarDialog({
  open,
  onOpenChange,
  northStar,
  onSuccess,
}: EditNorthStarDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [starConfig, setStarConfig] = useState<StarConfig>(
    createDefaultStarConfig()
  );
  const [formData, setFormData] = useState({
    title: "",
    visionQuestion: "",
    actionQuestion: "",
    status: "active" as NorthStarStatus,
    progressPercentage: 0,
    sdgGoals: [] as number[],
    careerPath: "",
    northStarColor: "golden",
  });

  // Update form data when northStar changes
  useEffect(() => {
    if (northStar) {
      setFormData({
        title: northStar.title || "",
        visionQuestion: northStar.description || "",
        actionQuestion: northStar.why || "",
        status: northStar.status || "active",
        progressPercentage: northStar.progress_percentage || 0,
        sdgGoals: northStar.sdg_goals || [],
        careerPath: northStar.career_path || "",
        northStarColor: northStar.north_star_color || "golden",
      });

      // Extract star config from metadata
      if (northStar.metadata?.starConfig) {
        setStarConfig(validateStarConfig(northStar.metadata.starConfig));
      } else {
        setStarConfig(createDefaultStarConfig());
      }
    }
  }, [northStar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!northStar) return;

    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const validatedStarConfig = validateStarConfig(starConfig);

      await updateNorthStar(northStar.id, {
        title: formData.title.trim(),
        description: formData.visionQuestion.trim() || undefined,
        why: formData.actionQuestion.trim() || undefined,
        status: formData.status,
        progress_percentage: formData.progressPercentage,
        sdg_goals: formData.sdgGoals.length > 0 ? formData.sdgGoals : undefined,
        career_path: formData.careerPath || undefined,
        north_star_color: formData.northStarColor,
        metadata: {
          starConfig: validatedStarConfig,
        },
      });

      toast.success("North Star updated successfully!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error updating North Star:", error);
      toast.error("Failed to update North Star");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedColor = NORTH_STAR_COLORS.find(
    (c) => c.value === formData.northStarColor
  ) || NORTH_STAR_COLORS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            Edit North Star
          </DialogTitle>
          <DialogDescription>
            Update your North Star details, vision, and customization
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-6 overflow-y-auto flex-1 pr-2 -mr-2 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="North Star title"
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

            {/* Vision Question */}
            <div className="space-y-2">
              <Label htmlFor="vision">Vision</Label>
              <p className="text-sm text-muted-foreground">
                What do you want to see happening in the next 3 years?
              </p>
              <Textarea
                id="vision"
                placeholder="Describe your vision for the future..."
                value={formData.visionQuestion}
                onChange={(e) =>
                  setFormData({ ...formData, visionQuestion: e.target.value })
                }
                rows={5}
                disabled={isSubmitting}
                className="resize-none"
              />
            </div>

            {/* Action Question */}
            <div className="space-y-2">
              <Label htmlFor="action">Action Plan</Label>
              <p className="text-sm text-muted-foreground">
                What needs to happen for that image to be real?
              </p>
              <Textarea
                id="action"
                placeholder="Outline the steps and actions needed..."
                value={formData.actionQuestion}
                onChange={(e) =>
                  setFormData({ ...formData, actionQuestion: e.target.value })
                }
                rows={5}
                disabled={isSubmitting}
                className="resize-none"
              />
            </div>

            <div className="border-t pt-4" />

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, status: value })
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="achieved">Achieved</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="progress">Progress</Label>
                <span className="text-sm font-medium text-amber-600">
                  {formData.progressPercentage}%
                </span>
              </div>
              <Slider
                id="progress"
                min={0}
                max={100}
                step={1}
                value={[formData.progressPercentage]}
                onValueChange={(values) =>
                  setFormData({ ...formData, progressPercentage: values[0] })
                }
                disabled={isSubmitting}
                className="w-full"
              />
            </div>

            <div className="border-t pt-4" />

            {/* SDG Goals */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                UN Sustainable Development Goals (Optional)
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select SDGs that align with your North Star
              </p>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2 border rounded-lg p-3 bg-muted/20">
                {SDG_GOALS.map((sdg) => (
                  <div
                    key={sdg.number}
                    className="flex items-start space-x-2 p-2 rounded hover:bg-background/50"
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
                      disabled={isSubmitting}
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

            {/* Career Path */}
            <div className="space-y-2">
              <Label htmlFor="career-path" className="text-base font-semibold">
                Career Path (Optional)
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
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
                disabled={isSubmitting}
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

            <div className="border-t pt-4" />

            {/* Star Customization */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">
                Star Customization
              </Label>

              {/* Star Generator */}
              <div className="space-y-2">
                <StarGenerator
                  config={starConfig}
                  onConfigChange={setStarConfig}
                  color={selectedColor.color}
                  glowColor={selectedColor.glow}
                />
              </div>

              {/* Color Theme Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Color Theme</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select a color theme for your star
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
                      disabled={isSubmitting}
                      className={`p-3 rounded-lg border-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                        formData.northStarColor === colorTheme.value
                          ? "border-amber-500 scale-105 ring-2 ring-amber-300"
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
