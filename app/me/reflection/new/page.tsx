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
import { ArrowLeft, ArrowRight, Loader2, Check, ChevronsUpDown, PlusCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createReflection, getProjects } from "@/lib/supabase/reflection";
import { Project } from "@/types/project";
import { useMultiStepForm } from "@/lib/hooks/use-multi-step-form";
import { EmotionPickerV2 as EmotionPicker, EmotionType } from "@/components/reflection/emotion-picker-v2";
import { MetricsSlider } from "@/components/reflection/metrics-slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandSeparator } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "project", title: "Project", description: "Select a project to reflect on." },
  { id: "content", title: "Progress", description: "What did you do today?" },
  { id: "metrics", title: "Rate", description: "Rate your progress." },
  { id: "reason", title: "Reason", description: "Why do you feel that way?" },
  { id: "review", title: "Review & Feel", description: "Final check and emotion." },
];

export default function NewReflectionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const [formData, setFormData] = useState({
    projectId: "",
    content: "",
    progress: 5,
    satisfaction: 5,
    challenge: 5,
    reason: "",
    emotion: "",
    intensity: 3,
  });

  const {
    currentStep,
    currentStepIndex,
    isFirstStep,
    isLastStep,
    next: goToNextStep,
    back: goToPreviousStep,
  } = useMultiStepForm(STEPS);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const userProjects = await getProjects();
        setProjects(userProjects);
      } catch (error) {
        console.error("Error loading projects:", error);
        toast({ title: "Error", description: "Failed to load projects.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    loadProjects();
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent double-submission
    setIsSubmitting(true);

    try {
      await createReflection(formData as any);
      toast({ title: "Reflection saved!" });
      router.push("/me/reflection");
      // No need to set isSubmitting to false here, as we are navigating away
    } catch (error) {
      console.error("Error saving reflection:", error);
      toast({
        title: "Error",
        description: "Failed to save reflection. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false); // Only set to false on error, allowing user to retry
    }
  };

  const next = () => {
    if (currentStep.id === "project" && !formData.projectId) {
        toast({ title: "Select a project", variant: "destructive" });
        return;
    }
    if (currentStep.id === "content" && !formData.content.trim()) {
        toast({ title: "Content is empty", variant: "destructive" });
        return;
    }
    if (currentStep.id === "reason" && !formData.reason.trim()) {
        toast({ title: "Reason is empty", variant: "destructive" });
        return;
    }
    if (isLastStep) {
        if (!formData.emotion) {
            toast({ title: "Select an emotion", variant: "destructive" });
            return;
        }
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
  }

  const selectedProject = projects.find((p) => p.id === formData.projectId);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!isLoading && projects.length === 0) {
      return (
          <div className="container max-w-2xl py-8 text-center">
              <h2 className="text-2xl font-semibold">No Projects Found</h2>
              <p className="mt-2 text-muted-foreground">You need to create a project before you can add a reflection.</p>
              <Button className="mt-4" onClick={() => router.push('/projects/new')}>Create a Project</Button>
          </div>
      )
  }

  return (
    <div className="container max-w-3xl py-8">
      {/* Progress Steps should be implemented here */}

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{currentStep.title}</CardTitle>
          <CardDescription>{currentStep.description}</CardDescription>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div key={currentStep.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
              
              {currentStep.id === "project" && (
                  <div className="space-y-4">
                      <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                                  {selectedProject ? selectedProject.name : "Select project..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                  <CommandInput placeholder="Search project..." />
                                  <CommandEmpty>No project found.</CommandEmpty>
                                  <CommandGroup>
                                      {projects.map((project) => (
                                          <CommandItem key={project.id} value={project.name} onSelect={() => { setFormData(prev => ({...prev, projectId: project.id})); setOpen(false); }}>
                                              <Check className={cn("mr-2 h-4 w-4", formData.projectId === project.id ? "opacity-100" : "opacity-0")} />
                                              {project.name}
                                          </CommandItem>
                                      ))}
                                  </CommandGroup>
                                  <CommandSeparator />
                                  <CommandGroup>
                                      <CommandItem onSelect={() => router.push('/projects/new')}>
                                          <PlusCircle className="mr-2 h-4 w-4" />
                                          Create New Project
                                      </CommandItem>
                                  </CommandGroup>
                              </Command>
                          </PopoverContent>
                      </Popover>
                      {selectedProject && selectedProject.goal && (
                          <div className="p-4 border rounded-lg bg-muted/50">
                              <h4 className="font-semibold">Project Goal</h4>
                              <p className="text-sm text-muted-foreground">{selectedProject.goal}</p>
                          </div>
                      )}
                  </div>
              )}

              {currentStep.id === "content" && (
                <Textarea name="content" value={formData.content} onChange={handleInputChange} placeholder="Today I worked on..." className="min-h-[200px]" />
              )}

              {currentStep.id === "metrics" && (
                <div className="space-y-8">
                  <MetricsSlider label="Progress" emoji="📊" value={formData.progress} onChange={(value) => setFormData((prev) => ({ ...prev, progress: value }))} />
                  <MetricsSlider label="Satisfaction" emoji="😊" value={formData.satisfaction} onChange={(value) => setFormData((prev) => ({ ...prev, satisfaction: value }))} />
                  <MetricsSlider label="Challenge" emoji="🧗" value={formData.challenge} onChange={(value) => setFormData((prev) => ({ ...prev, challenge: value }))} />
                </div>
              )}

              {currentStep.id === "reason" && (
                  <div className="space-y-6">
                      <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                          <div>
                              <h4 className="font-semibold">What I did:</h4>
                              <p className="whitespace-pre-line text-sm text-muted-foreground">{formData.content || "You haven't written anything yet."}</p>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-center">
                              <div className="p-2 bg-background rounded-lg">
                                  <div className="text-xl font-bold">{formData.progress.toFixed(1)}</div>
                                  <div className="text-xs text-muted-foreground">Progress</div>
                              </div>
                              <div className="p-2 bg-background rounded-lg">
                                  <div className="text-xl font-bold">{formData.satisfaction.toFixed(1)}</div>
                                  <div className="text-xs text-muted-foreground">Satisfaction</div>
                              </div>
                              <div className="p-2 bg-background rounded-lg">
                                  <div className="text-xl font-bold">{formData.challenge.toFixed(1)}</div>
                                  <div className="text-xs text-muted-foreground">Challenge</div>
                              </div>
                          </div>
                      </div>
                      <Textarea name="reason" value={formData.reason} onChange={handleInputChange} placeholder="I feel this way because..." className="min-h-[150px]" />
                  </div>
              )}

              {currentStep.id === "review" && (
                <div className="space-y-6">
                    <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                        <div>
                            <h4 className="font-semibold">Project: {selectedProject?.name}</h4>
                        </div>
                        <div>
                            <h4 className="font-semibold">What I did:</h4>
                            <p className="whitespace-pre-line text-sm">{formData.content}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold">Why I feel this way:</h4>
                            <p className="whitespace-pre-line text-sm">{formData.reason}</p>
                        </div>
                    </div>
                    <EmotionPicker
                        value={{ emotion: formData.emotion as EmotionType, intensity: formData.intensity }}
                        onChange={({ emotion, intensity }) =>
                            setFormData((prev) => ({ ...prev, emotion, intensity }))
                        }
                    />
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </CardContent>

        <div className="flex items-center justify-between p-6 border-t bg-muted/50">
          <Button type="button" variant="outline" onClick={back} disabled={isSubmitting}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {isFirstStep ? "Cancel" : "Back"}
          </Button>
          <Button type="button" onClick={next} disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : isLastStep ? "Submit Reflection" : <>Next <ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
        </div>
      </Card>
    </div>
  );
}