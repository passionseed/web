"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  createReflection,
  getUserTags,
  createTag,
  getMostUsedTags,
} from "@/lib/supabase/reflection";
import { Tag } from "@/types/reflection";
import { useMultiStepForm } from "@/lib/hooks/use-multi-step-form";
import { EmotionPicker } from "@/components/reflection/emotion-picker";
import { TagInput } from "@/components/reflection/tag-input";
import { MetricsSlider } from "@/components/reflection/metrics-slider";

type FormData = {
  content: string;
  emotion: string;
  satisfaction: number;
  engagement: number;
  challenge: number;
  tagIds: string[];
};

const STEPS = [
  { id: "content", title: "Reflect", description: "How was your day?" },
  { id: "metrics", title: "Rate", description: "Rate your experience" },
  { id: "review", title: "Review", description: "Check your reflection" },
];

export default function NewReflectionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    content: "",
    emotion: "",
    satisfaction: 5,
    engagement: 5,
    challenge: 5,
    tagIds: [],
  });

  const {
    currentStep,
    currentStepIndex,
    isFirstStep,
    isLastStep,
    next: goToNextStep,
    back: goToPreviousStep,
  } = useMultiStepForm(STEPS);

  // Load user's tags and suggested tags on mount
  useEffect(() => {
    const loadTags = async () => {
      try {
        const [tags, suggested] = await Promise.all([
          getUserTags(),
          getMostUsedTags(3).catch(() => []), // Gracefully handle if no suggestions available
        ]);
        setAvailableTags(tags);
        setSuggestedTags(suggested);
      } catch (error) {
        console.error("Error loading tags:", error);
        toast({
          title: "Error",
          description: "Failed to load your tags. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTags();
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmotionSelect = (emotion: string) => {
    setFormData((prev) => ({ ...prev, emotion }));
  };

  const handleTagToggle = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  const handleCreateTag = async (name: string) => {
    try {
      const newTag = await createTag(name);
      setAvailableTags((prev) => [...prev, newTag]);
      return newTag;
    } catch (error) {
      console.error("Error creating tag:", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!formData.emotion) {
      toast({
        title: "Select an emotion",
        description: "Please select how you're feeling today.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Saving reflection:", formData);
      await createReflection({
        ...formData,
        emotion: formData.emotion as any,
      });

      toast({
        title: "Reflection saved!",
        description: "Your reflection has been recorded.",
      });

      router.push("/me/reflection");
    } catch (error) {
      console.error("Error saving reflection:", error);
      toast({
        title: "Error",
        description: "Failed to save your reflection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const next = () => {
    if (currentStep.id === "content") {
      if (!formData.content.trim()) {
        toast({
          title: "Empty reflection",
          description: "Please write something about your day.",
          variant: "destructive",
        });
        return;
      }

      if (formData.tagIds.length === 0) {
        toast({
          title: "Tags required",
          description:
            "Please add at least one tag to categorize your reflection.",
          variant: "destructive",
        });
        return;
      }
    }

    if (isLastStep) {
      handleSubmit();
    } else {
      goToNextStep();
    }
  };

  const back = () => {
    if (isFirstStep) {
      router.back();
    } else {
      goToPreviousStep();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-between relative mb-12">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -translate-y-1/2 -z-10">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{
              width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center">
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                currentStepIndex >= index
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-muted",
                currentStepIndex === index &&
                  "ring-2 ring-offset-2 ring-primary"
              )}
            >
              {currentStepIndex > index ? (
                <Check className="h-5 w-5" />
              ) : (
                index + 1
              )}
            </div>
            <span className="mt-2 text-sm font-medium text-center">
              {step.title}
            </span>
          </div>
        ))}
      </div>

      {/* Form Content */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{currentStep.title}</CardTitle>
          <CardDescription>{currentStep.description}</CardDescription>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {currentStep.id === "content" && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">Tags</h3>
                        <span className="text-xs text-muted-foreground">
                          (required)
                        </span>
                      </div>

                      {suggestedTags.length > 0 && !isLoading && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="text-xs text-muted-foreground self-center mr-1">
                            Quick add:
                          </span>
                          {suggestedTags.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => {
                                if (!formData.tagIds.includes(tag.id)) {
                                  handleTagToggle(tag.id);
                                }
                              }}
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors",
                                formData.tagIds.includes(tag.id)
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted hover:bg-muted/80"
                              )}
                              style={{
                                backgroundColor: formData.tagIds.includes(
                                  tag.id
                                )
                                  ? tag.color
                                  : undefined,
                                color: formData.tagIds.includes(tag.id)
                                  ? "#fff"
                                  : undefined,
                              }}
                            >
                              {tag.name}
                            </button>
                          ))}
                        </div>
                      )}

                      <TagInput
                        availableTags={availableTags}
                        selectedTagIds={formData.tagIds}
                        onTagToggle={handleTagToggle}
                        onCreateTag={handleCreateTag}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">
                      How are you feeling today?
                    </h3>
                    <EmotionPicker
                      value={formData.emotion as any}
                      onChange={handleEmotionSelect}
                    />
                  </div>

                  <div>
                    <Textarea
                      name="content"
                      value={formData.content}
                      onChange={handleInputChange}
                      placeholder="Today I felt... I accomplished... I struggled with..."
                      className="min-h-[200px]"
                      required
                    />
                  </div>
                </div>
              )}

              {currentStep.id === "metrics" && (
                <div className="space-y-8">
                  <MetricsSlider
                    label="Satisfaction"
                    emoji="😊"
                    value={formData.satisfaction}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, satisfaction: value }))
                    }
                  />

                  <MetricsSlider
                    label="Engagement"
                    emoji="🎯"
                    value={formData.engagement}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, engagement: value }))
                    }
                  />

                  <MetricsSlider
                    label="Challenge"
                    emoji="🧗"
                    value={formData.challenge}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, challenge: value }))
                    }
                  />
                </div>
              )}

              {currentStep.id === "review" && (
                <div className="space-y-6">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="whitespace-pre-line">{formData.content}</p>

                    {formData.emotion && (
                      <div className="mt-4 flex items-center gap-2">
                        <span className="text-lg">
                          {
                            EMOTIONS.find((e) => e.value === formData.emotion)
                              ?.emoji
                          }
                        </span>
                        <span className="capitalize">{formData.emotion}</span>
                      </div>
                    )}

                    {formData.tagIds.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {formData.tagIds.map((tagId) => {
                          const tag = availableTags.find((t) => t.id === tagId);
                          if (!tag) return null;
                          return (
                            <span
                              key={tagId}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: tag.color,
                                color: "#fff",
                              }}
                            >
                              {tag.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {formData.satisfaction}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Satisfaction
                      </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {formData.engagement}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Engagement
                      </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {formData.challenge}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Challenge
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>

        <div className="flex items-center justify-between p-6 border-t bg-muted/50">
          <Button
            type="button"
            variant="outline"
            onClick={back}
            disabled={isSubmitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isFirstStep ? "Back" : "Previous"}
          </Button>

          <Button type="button" onClick={next} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isLastStep ? (
              "Submit Reflection"
            ) : (
              <>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Helper for emotion emoji lookup
const EMOTIONS = [
  { value: "happy", emoji: "😊" },
  { value: "excited", emoji: "🎉" },
  { value: "grateful", emoji: "🙏" },
  { value: "content", emoji: "😌" },
  { value: "hopeful", emoji: "🌟" },
  { value: "sad", emoji: "😢" },
  { value: "anxious", emoji: "😟" },
  { value: "frustrated", emoji: "😤" },
  { value: "overwhelmed", emoji: "😵‍💫" },
  { value: "tired", emoji: "😴" },
  { value: "neutral", emoji: "😐" },
  { value: "calm", emoji: "😌" },
  { value: "proud", emoji: "🦁" },
  { value: "motivated", emoji: "💪" },
  { value: "creative", emoji: "🎨" },
  { value: "confused", emoji: "😕" },
  { value: "stuck", emoji: "🧗" },
  { value: "bored", emoji: "🥱" },
  { value: "stressed", emoji: "😫" },
  { value: "energized", emoji: "⚡" },
];

// Utility function for class names
function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
