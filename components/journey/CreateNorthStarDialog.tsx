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
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { createNorthStar } from "@/lib/supabase/north-star";
import { toast } from "sonner";
import {
  SDG_GOALS,
  CAREER_PATHS,
  NORTH_STAR_COLORS,
} from "@/constants/sdg";
import { StarGenerator } from "@/components/ui/star-generator";
import {
  StarConfig,
  createDefaultStarConfig,
  validateStarConfig,
} from "@/lib/utils/svg-star";

interface CreateNorthStarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateNorthStarDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateNorthStarDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    visionQuestion: "", // "What do you want to see happening in the next 3 years?"
    actionQuestion: "", // "What needs to happen for that image to be real?"
    sdgGoals: [] as number[],
    careerPath: "",
    starConfig: createDefaultStarConfig(),
    northStarColor: "golden",
    title: "",
  });

  const totalSteps = 5;

  const handleNext = () => {
    // Validation is optional for reflection steps - allow moving forward
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter a title for your North Star");
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate star config
      const validatedConfig = validateStarConfig(formData.starConfig);

      await createNorthStar({
        title: formData.title.trim(),
        description: formData.visionQuestion.trim() || undefined,
        why: formData.actionQuestion.trim() || undefined,
        icon: "svg", // Marker to indicate SVG star
        sdg_goals: formData.sdgGoals.length > 0 ? formData.sdgGoals : undefined,
        career_path: formData.careerPath || undefined,
        north_star_shape: "custom_svg",
        north_star_color: formData.northStarColor,
        metadata: {
          starConfig: validatedConfig,
        },
      });

      toast.success(`North Star "${formData.title}" created successfully!`);

      // Reset form
      setFormData({
        title: "",
        visionQuestion: "",
        actionQuestion: "",
        sdgGoals: [],
        careerPath: "",
        starConfig: createDefaultStarConfig(),
        northStarColor: "golden",
      });
      setCurrentStep(1);

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating North Star:", error);
      toast.error("Failed to create North Star. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedColor = NORTH_STAR_COLORS.find(
    (c) => c.value === formData.northStarColor
  ) || NORTH_STAR_COLORS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            Create Your North Star
          </DialogTitle>
          <DialogDescription>
            Step {currentStep} of {totalSteps}: {
              currentStep === 1 ? "Envision your future" :
              currentStep === 2 ? "Define what needs to happen" :
              currentStep === 3 ? "Align with your values" :
              currentStep === 4 ? "Design your star" :
              "Name your North Star"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-6 overflow-y-auto flex-1 pr-2 -mr-2">
            {/* STEP 1: Vision Question */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl p-8 border-2 border-amber-200 dark:border-amber-800">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-3">🌟</div>
                    <p className="text-base text-amber-800 dark:text-amber-200 italic">
                      Take a moment to envision your future...
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="vision" className="text-xl font-bold text-amber-900 dark:text-amber-100 block text-center">
                      What do you want to see happening in the next 3 years?
                    </Label>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Paint a vivid picture of your ideal future
                    </p>
                    <Textarea
                      id="vision"
                      placeholder="Imagine yourself 3 years from now... What does success look like? What impact are you making? How do you feel? What are you proud of?"
                      value={formData.visionQuestion}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          visionQuestion: e.target.value,
                        }))
                      }
                      rows={8}
                      className="resize-none text-base"
                      autoFocus
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Action Question */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-8 border-2 border-blue-200 dark:border-blue-800">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-3">🎯</div>
                    <p className="text-base text-blue-800 dark:text-blue-200 italic">
                      Now, let's think about the journey...
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="action" className="text-xl font-bold text-blue-900 dark:text-blue-100 block text-center">
                      What needs to happen for that image to be real?
                    </Label>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Think about the steps, skills, and changes needed
                    </p>
                    <Textarea
                      id="action"
                      placeholder="What skills do you need to develop? What obstacles must you overcome? What resources or support do you need? What habits need to change?"
                      value={formData.actionQuestion}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          actionQuestion: e.target.value,
                        }))
                      }
                      rows={8}
                      className="resize-none text-base"
                      autoFocus
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Values Alignment (SDG + Career) */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* SDG Goals Multi-select */}
                <div className="space-y-2 border rounded-lg p-4 bg-amber-50/50 dark:bg-amber-950/20">
                  <Label className="text-base font-semibold">
                    🌍 UN Sustainable Development Goals (Optional)
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select SDGs that align with your North Star
                  </p>
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2">
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
                  <Label htmlFor="career-path" className="text-base font-semibold">
                    💼 Career Path (Optional)
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
              </div>
            )}

            {/* STEP 4: Star Design */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Star Generator */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    ⭐ Design Your Star
                  </Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a unique star that represents your North Star
                  </p>
                  <StarGenerator
                    config={formData.starConfig}
                    onConfigChange={(config) =>
                      setFormData((prev) => ({ ...prev, starConfig: config }))
                    }
                    color={selectedColor.color}
                    glowColor={selectedColor.glow}
                  />
                </div>

                {/* Color Theme Selector */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    🎨 Color Theme
                  </Label>
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
                        className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
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
            )}

            {/* STEP 5: Title (Final Step) */}
            {currentStep === 5 && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl p-8 border-2 border-purple-200 dark:border-purple-800">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-3">✨</div>
                    <p className="text-base text-purple-800 dark:text-purple-200 italic">
                      Finally, give your North Star a name
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="title" className="text-xl font-bold text-purple-900 dark:text-purple-100 block text-center">
                      What will you call your North Star? *
                    </Label>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      A clear, inspiring name for your long-term vision
                    </p>
                    <Input
                      id="title"
                      placeholder="E.g., Become a software engineer solving climate change"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                      }
                      required
                      className="text-lg text-center font-semibold"
                      autoFocus
                    />

                    {/* Show summary of what they've created */}
                    {(formData.visionQuestion || formData.actionQuestion) && (
                      <div className="mt-6 pt-6 border-t border-purple-200 dark:border-purple-800">
                        <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-3 text-center">
                          Your North Star Summary
                        </p>
                        {formData.visionQuestion && (
                          <div className="mb-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Your Vision:</p>
                            <p className="text-sm line-clamp-3">{formData.visionQuestion}</p>
                          </div>
                        )}
                        {formData.actionQuestion && (
                          <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Steps Needed:</p>
                            <p className="text-sm line-clamp-3">{formData.actionQuestion}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 mt-4 flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 mr-2" />
                      Create North Star
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
