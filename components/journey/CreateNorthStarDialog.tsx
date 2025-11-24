"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Target,
  Map,
  Heart,
  Star,
  Rocket,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createNorthStar } from "@/lib/supabase/north-star";
import { createJourneyProject, createProjectPath } from "@/lib/supabase/journey";
import { StarGenerator } from "@/components/ui/star-generator";
import { createDefaultStarConfig, validateStarConfig } from "@/lib/utils/svg-star";
import { enhanceVision, generateMilestones } from "@/lib/ai/north-star-enhancer";
import { addMonths, format } from "date-fns";
import { EducationalPathwayFlow } from "@/components/education/EducationalPathwayFlow";
import { getAllUniversities } from "@/lib/supabase/education";
import { University, SimpleRoadmap, EducationalFlowData } from "@/types/education";
import { LIFE_ASPECTS } from "@/constants/life-aspects";
import { SDG_GOALS, NORTH_STAR_COLORS } from "@/constants/sdg";

// Types
interface SMARTMilestone {
  title: string;
  startDate: string;
  dueDate: string;
  measurable: string;
}

interface CreateNorthStarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userEducationLevel?: "high_school" | "university" | "unaffiliated";
}

export function CreateNorthStarDialog({
  open,
  onOpenChange,
  onSuccess,
  userEducationLevel = "university",
}: CreateNorthStarDialogProps) {
  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    visionQuestion: "",
    milestones: [] as SMARTMilestone[],
    lifeAspects: [] as string[],
    sdgGoals: [] as number[],
    careerPath: "",
    starConfig: createDefaultStarConfig(),
    northStarColor: "golden",
  });
  
  // AI State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiEnhancedVision, setAiEnhancedVision] = useState("");
  const [showVisionComparison, setShowVisionComparison] = useState(false);

  // Education Flow State
  const [showEducationalPathway, setShowEducationalPathway] = useState(false);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loadingUniversities, setLoadingUniversities] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      // Reset other state if needed
    }
  }, [open]);

  // Handlers
  const handleNext = async () => {
    // Validation
    if (currentStep === 1 && !formData.visionQuestion.trim()) {
      toast.error("Please describe your vision first!");
      return;
    }

    // High School Flow Interception
    if (currentStep === 1 && userEducationLevel === "high_school") {
      setLoadingUniversities(true);
      try {
        const data = await getAllUniversities();
        setUniversities(data);
        setShowEducationalPathway(true);
      } catch (error) {
        toast.error("Failed to load universities");
        setCurrentStep(currentStep + 1);
      } finally {
        setLoadingUniversities(false);
      }
      return;
    }

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (showEducationalPathway) {
      setShowEducationalPathway(false);
      return;
    }
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleEnhanceVision = async () => {
    if (!formData.visionQuestion.trim()) return;
    setIsAiLoading(true);
    try {
      const result = await enhanceVision(formData.visionQuestion, "en");
      if (result.success && result.data) {
        setAiEnhancedVision(result.data as string);
        setShowVisionComparison(true);
      }
    } catch (e) {
      toast.error("AI enhancement failed");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGenerateMilestones = async () => {
    if (!formData.visionQuestion.trim()) return;
    setIsAiLoading(true);
    try {
      const result = await generateMilestones(formData.visionQuestion, "en");
      if (result.success && Array.isArray(result.data)) {
        const now = new Date();
        const newMilestones = result.data.map((title, i) => ({
          title,
          startDate: format(addMonths(now, i * 3), "yyyy-MM-dd"),
          dueDate: format(addMonths(now, (i + 1) * 3), "yyyy-MM-dd"),
          measurable: "",
        }));
        setFormData(prev => ({ ...prev, milestones: newMilestones }));
        toast.success("Milestones generated!");
      }
    } catch (e) {
      toast.error("Failed to generate milestones");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleEducationalPathwayComplete = (data: EducationalFlowData & { roadmap: SimpleRoadmap }) => {
    setShowEducationalPathway(false);
    setFormData(prev => ({
      ...prev,
      visionQuestion: data.vision,
      milestones: data.roadmap.milestones.map((m, i) => ({
        title: m.title,
        startDate: format(addMonths(new Date(), i * 6), "yyyy-MM-dd"),
        dueDate: format(addMonths(new Date(), (i + 1) * 6), "yyyy-MM-dd"),
        measurable: m.description
      }))
    }));
    setCurrentStep(3); // Skip to values
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("Please name your North Star!");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create North Star
      const northStar = await createNorthStar({
        title: formData.title,
        description: formData.visionQuestion,
        north_star_color: formData.northStarColor,
        icon: "svg",
        north_star_shape: "custom_svg",
        metadata: {
          starConfig: validateStarConfig(formData.starConfig),
          lifeAspects: formData.lifeAspects,
        },
        sdg_goals: formData.sdgGoals,
      });

      // 2. Create Milestones
      if (formData.milestones.length > 0) {
        const createdProjects = [];
        for (let i = 0; i < formData.milestones.length; i++) {
          const m = formData.milestones[i];
          const project = await createJourneyProject({
            title: m.title,
            description: `Step ${i + 1} for ${formData.title}`,
            project_type: "learning",
            status: "not_started",
            linked_north_star_id: northStar.id,
            icon: "🎯",
            color: "#3b82f6",
            metadata: { milestone_index: i, smart_milestone: m },
          });
          createdProjects.push(project);
        }

        // 3. Link Projects
        for (let i = 0; i < createdProjects.length - 1; i++) {
          await createProjectPath(createdProjects[i].id, createdProjects[i + 1].id, "leads_to");
        }
      }

      toast.success("North Star created successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create North Star");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-white overflow-hidden flex flex-col">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full hover:bg-white/10">
            <X className="w-6 h-6" />
          </Button>
          <div className="flex flex-col">
            <span className="text-sm text-slate-400 font-medium tracking-wider uppercase">Create North Star</span>
            <div className="flex gap-1 mt-1">
              {[0, 1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-1 w-8 rounded-full transition-all duration-300 ${
                    s <= currentStep ? "bg-white" : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative z-10 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center p-6">
          <AnimatePresence mode="wait">
            {showEducationalPathway ? (
              <motion.div
                key="edu-path"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-5xl h-full"
              >
                <EducationalPathwayFlow
                  vision={formData.visionQuestion}
                  universities={universities}
                  onComplete={handleEducationalPathwayComplete}
                  onCancel={() => setShowEducationalPathway(false)}
                />
              </motion.div>
            ) : (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-3xl"
              >
                {/* STEP 0: WELCOME */}
                {currentStep === 0 && (
                  <div className="text-center space-y-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-amber-400/20 to-purple-500/20 border border-white/10 mb-4">
                      <Sparkles className="w-12 h-12 text-amber-300" />
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                      Design Your<br />Future Self
                    </h1>
                    <p className="text-xl text-slate-400 max-w-xl mx-auto leading-relaxed">
                      "The future belongs to those who believe in the beauty of their dreams."
                    </p>
                    <div className="pt-8">
                      <Button onClick={handleNext} size="lg" className="rounded-full px-10 py-8 text-xl bg-white text-slate-950 hover:bg-slate-200 transition-all hover:scale-105">
                        Start Designing <ChevronRight className="ml-2 w-6 h-6" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 1: VISION */}
                {currentStep === 1 && (
                  <div className="space-y-8">
                    <div className="text-center mb-12">
                      <h2 className="text-4xl font-bold mb-4">What's the Dream?</h2>
                      <p className="text-lg text-slate-400">
                        Where do you see yourself in 3 years? Be bold. Be specific.
                      </p>
                    </div>

                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                      <Textarea
                        value={formData.visionQuestion}
                        onChange={(e) => setFormData({ ...formData, visionQuestion: e.target.value })}
                        placeholder="I want to be a software engineer building tools that help people learn..."
                        className="relative w-full min-h-[200px] bg-slate-900/80 border-slate-700 text-xl p-6 rounded-xl focus:ring-purple-500 resize-none"
                      />
                      
                      <div className="absolute bottom-4 right-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleEnhanceVision}
                          disabled={isAiLoading || !formData.visionQuestion}
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                        >
                          {isAiLoading ? <Wand2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                          Enhance with AI
                        </Button>
                      </div>
                    </div>

                    {showVisionComparison && (
                      <div className="bg-slate-900/50 border border-purple-500/30 rounded-xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-2 text-purple-400 font-medium">
                          <Sparkles className="w-4 h-4" /> AI Suggestion
                        </div>
                        <p className="text-slate-300 italic">"{aiEnhancedVision}"</p>
                        <div className="flex gap-3">
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setFormData({ ...formData, visionQuestion: aiEnhancedVision });
                              setShowVisionComparison(false);
                            }}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            Use This
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setShowVisionComparison(false)}
                          >
                            Keep Mine
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: MILESTONES */}
                {currentStep === 2 && (
                  <div className="space-y-8">
                    <div className="text-center mb-8">
                      <h2 className="text-4xl font-bold mb-4">The Roadmap</h2>
                      <p className="text-lg text-slate-400">
                        Break it down. What are the major checkpoints?
                      </p>
                    </div>

                    <div className="flex justify-center mb-8">
                      <Button 
                        variant="outline" 
                        onClick={handleGenerateMilestones}
                        disabled={isAiLoading}
                        className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                      >
                        {isAiLoading ? <Wand2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        Generate with AI
                      </Button>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {formData.milestones.map((milestone, idx) => (
                        <div key={idx} className="flex items-center gap-4 bg-slate-900/50 border border-slate-800 p-4 rounded-xl group hover:border-slate-600 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                            {idx + 1}
                          </div>
                          <Input 
                            value={milestone.title}
                            onChange={(e) => {
                              const newMilestones = [...formData.milestones];
                              newMilestones[idx].title = e.target.value;
                              setFormData({ ...formData, milestones: newMilestones });
                            }}
                            className="bg-transparent border-none text-lg focus-visible:ring-0 px-0"
                            placeholder="Milestone title..."
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newMilestones = formData.milestones.filter((_, i) => i !== idx);
                              setFormData({ ...formData, milestones: newMilestones });
                            }}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            milestones: [...formData.milestones, { title: "", startDate: "", dueDate: "", measurable: "" }]
                          });
                        }}
                        className="w-full py-8 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:border-slate-600 hover:text-slate-300 hover:bg-slate-900/30"
                      >
                        <Plus className="w-6 h-6 mr-2" /> Add Milestone
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3: VALUES & ASPECTS */}
                {currentStep === 3 && (
                  <div className="space-y-8">
                    <div className="text-center mb-8">
                      <h2 className="text-4xl font-bold mb-4">The Why</h2>
                      <p className="text-lg text-slate-400">
                        What areas of life does this impact?
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {LIFE_ASPECTS.map((aspect) => {
                        const isSelected = formData.lifeAspects.includes(aspect.id);
                        return (
                          <button
                            key={aspect.id}
                            onClick={() => {
                              const newAspects = isSelected
                                ? formData.lifeAspects.filter(id => id !== aspect.id)
                                : [...formData.lifeAspects, aspect.id];
                              setFormData({ ...formData, lifeAspects: newAspects });
                            }}
                            className={`p-6 rounded-xl border text-left transition-all duration-200 ${
                              isSelected
                                ? "bg-purple-600/20 border-purple-500 shadow-[0_0_20px_-5px_rgba(168,85,247,0.4)]"
                                : "bg-slate-900/50 border-slate-800 hover:border-slate-600 hover:bg-slate-800/50"
                            }`}
                          >
                            <div className="text-2xl mb-3">{aspect.icon}</div>
                            <div className={`font-bold mb-1 ${isSelected ? "text-purple-300" : "text-slate-200"}`}>
                              {aspect.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 4: DESIGN */}
                {currentStep === 4 && (
                  <div className="space-y-8">
                    <div className="text-center mb-8">
                      <h2 className="text-4xl font-bold mb-4">Design Your Star</h2>
                      <p className="text-lg text-slate-400">
                        Make it unique. This is your beacon.
                      </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-12 items-center justify-center">
                      {/* Preview */}
                      <div className="relative w-64 h-64 flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 rounded-full blur-3xl" />
                        <StarGenerator
                          config={formData.starConfig}
                          color={formData.northStarColor}
                          className="w-full h-full drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                        />
                      </div>

                      {/* Controls */}
                      <div className="space-y-6 w-full max-w-xs">
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Color Theme</label>
                          <div className="flex flex-wrap gap-3">
                            {NORTH_STAR_COLORS.map((color) => (
                              <button
                                key={color.value}
                                onClick={() => setFormData({ ...formData, northStarColor: color.value })}
                                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                                  formData.northStarColor === color.value ? "border-white scale-110" : "border-transparent"
                                }`}
                                style={{ backgroundColor: color.hex }}
                              />
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Points</label>
                          <input
                            type="range"
                            min="4"
                            max="12"
                            value={formData.starConfig.points}
                            onChange={(e) => setFormData({
                              ...formData,
                              starConfig: { ...formData.starConfig, points: parseInt(e.target.value) }
                            })}
                            className="w-full accent-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Inner Radius</label>
                          <input
                            type="range"
                            min="20"
                            max="80"
                            value={formData.starConfig.innerRadius}
                            onChange={(e) => setFormData({
                              ...formData,
                              starConfig: { ...formData.starConfig, innerRadius: parseInt(e.target.value) }
                            })}
                            className="w-full accent-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: NAME & LAUNCH */}
                {currentStep === 5 && (
                  <div className="text-center space-y-12">
                     <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-500/20 border border-purple-500/30 mb-4 animate-pulse">
                      <Rocket className="w-10 h-10 text-purple-400" />
                    </div>
                    
                    <div className="space-y-4">
                      <h2 className="text-4xl font-bold">Name Your Legend</h2>
                      <p className="text-lg text-slate-400">
                        Give this chapter of your life a title.
                      </p>
                    </div>

                    <div className="max-w-xl mx-auto">
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. The Year of Growth"
                        className="text-center text-3xl md:text-4xl font-bold bg-transparent border-b-2 border-slate-700 rounded-none px-0 py-4 focus-visible:ring-0 focus-visible:border-purple-500 placeholder:text-slate-700 h-auto"
                      />
                    </div>

                    <div className="pt-8">
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        size="lg"
                        className="rounded-full px-12 py-8 text-xl font-bold bg-white text-slate-950 hover:bg-slate-200 transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
                      >
                        {isSubmitting ? "Launching..." : "Launch North Star"}
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Navigation */}
      {!showEducationalPathway && currentStep > 0 && (
        <div className="relative z-10 p-6 flex justify-between items-center max-w-5xl mx-auto w-full">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          
          {currentStep < 5 && (
            <Button
              onClick={handleNext}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/10"
            >
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
