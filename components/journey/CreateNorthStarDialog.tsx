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
  Languages,
  Compass,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createNorthStar } from "@/lib/supabase/north-star";
import {
  createJourneyProject,
  createProjectPath,
} from "@/lib/supabase/journey";
import { useDirectionFinder } from "../education/direction-finder/direction-finder-context";
import { StarGenerator } from "@/components/ui/star-generator";
import {
  createDefaultStarConfig,
  validateStarConfig,
} from "@/lib/utils/svg-star";
import {
  enhanceVision,
  generateMilestones,
} from "@/lib/ai/north-star-enhancer";
import { addMonths, format } from "date-fns";
import { EducationalPathwayFlow } from "@/components/education/EducationalPathwayFlow";
import {
  getAllUniversities,
  getThailandUniversities,
  browseThailandCurriculums,
} from "@/lib/supabase/education";
import {
  University,
  SimpleRoadmap,
  EducationalFlowData,
} from "@/types/education";
import { LIFE_ASPECTS } from "@/constants/life-aspects";
import { SDG_GOALS, NORTH_STAR_COLORS } from "@/constants/sdg";
import { DirectionFinderResult } from "@/types/direction-finder";
import { DirectionFinderFlow } from "../education/direction-finder/DirectionFinderFlow";

// Types
interface SMARTMilestone {
  title: string;
  startDate: string;
  dueDate: string;
  measurable: string;
}

const translations = {
  en: {
    headerTitle: "Create North Star",
    step0Title: "Design Your Future",
    step0Subtitle: '"The best way to predict the future is to create it."',
    startBtn: "Start Designing",
    step1Title: "What's the Dream?",
    step1Subtitle: "Where do you see yourself in 3 years?",
    step1Placeholder:
      "I want to be a software engineer building tools that help people learn...",
    enhanceBtn: "Enhance with AI",
    aiSuggestion: "AI Suggestion",
    useThis: "Use This Version",
    keepMine: "Keep Mine",
    step2Title: "Key Milestones",
    step2Subtitle: "Break it down into big steps",
    generateBtn: "Generate with AI",
    milestonePlaceholder: "Milestone title...",
    addMilestone: "Add Milestone",
    step3Title: "Life Aspects",
    step3Subtitle: "What areas does this impact?",
    step4Title: "Design Your Star",
    step4Subtitle: "Make it unique to you",
    colorTheme: "Color Theme",
    points: "Points",
    innerRadius: "Inner Radius",
    step5Title: "Name Your Legend",
    step5Subtitle: "Give this chapter of your life a title.",
    namePlaceholder: "e.g. The Year of Growth",
    launchBtn: "Launch North Star",
    launching: "Launching...",
    back: "Back",
    next: "Next",
    nameError: "Please name your North Star!",
    visionError: "Please describe your vision first!",
    milestonesGenerated: "Milestones generated!",
    milestonesError: "Failed to generate milestones",
    aiError: "AI enhancement failed",
    eduLoadError: "Failed to load universities",
    createSuccess: "North Star created successfully!",
    createError: "Failed to create North Star",
    findDirection: "Find your direction",
    findDirectionDesc: "Discover your passion with our interactive Ikigai tool",
    duration: "5–10 mins",
    chooseUni: "Choose your university goal",
    chooseUniDesc: "For students who already have a clear target",
    backToDirection: "Back to Direction Profile",
  },
  th: {
    headerTitle: "สร้างดาวเหนือ",
    step0Title: "ออกแบบอนาคต\nของคุณ",
    step0Subtitle: '"วิธีที่ดีที่สุดในการทำนายอนาคตคือการสร้างมันขึ้นมา"',
    startBtn: "เริ่มออกแบบ",
    step1Title: "ความฝันของคุณคืออะไร?",
    step1Subtitle: "คุณเห็นตัวเองเป็นอย่างไรในอีก 3 ปีข้างหน้า?",
    step1Placeholder:
      "ฉันอยากเป็นวิศวกรซอฟต์แวร์ที่สร้างเครื่องมือช่วยให้ผู้คนเรียนรู้...",
    enhanceBtn: "ปรับปรุงด้วย AI",
    aiSuggestion: "คำแนะนำจาก AI",
    useThis: "ใช้เวอร์ชันนี้",
    keepMine: "ใช้ของฉัน",
    step2Title: "เป้าหมายสำคัญ",
    step2Subtitle: "แบ่งย่อยเป็นขั้นตอนใหญ่ๆ",
    generateBtn: "สร้างด้วย AI",
    milestonePlaceholder: "ชื่อเป้าหมายย่อย...",
    addMilestone: "เพิ่มเป้าหมายย่อย",
    step3Title: "ด้านของชีวิต",
    step3Subtitle: "เรื่องนี้ส่งผลต่อด้านใดของชีวิตบ้าง?",
    step4Title: "ออกแบบดาวของคุณ",
    step4Subtitle: "ทำให้เป็นเอกลักษณ์ นี่คือแสงนำทางของคุณ",
    colorTheme: "ธีมสี",
    points: "จำนวนแฉก",
    innerRadius: "รัศมีภายใน",
    step5Title: "ตั้งชื่อตำนานของคุณ",
    step5Subtitle: "ตั้งชื่อให้กับบทนี้ของชีวิตคุณ",
    namePlaceholder: "เช่น ปีแห่งการเติบโต",
    launchBtn: "ปล่อยดาวเหนือ",
    launching: "กำลังปล่อย...",
    back: "ย้อนกลับ",
    next: "ถัดไป",
    nameError: "กรุณาตั้งชื่อดาวเหนือของคุณ!",
    visionError: "กรุณาอธิบายวิสัยทัศน์ของคุณก่อน!",
    milestonesGenerated: "สร้างเป้าหมายย่อยเรียบร้อยแล้ว!",
    milestonesError: "ไม่สามารถสร้างเป้าหมายย่อยได้",
    aiError: "การปรับปรุงด้วย AI ล้มเหลว",
    eduLoadError: "ไม่สามารถโหลดข้อมูลมหาวิทยาลัยได้",
    createSuccess: "สร้างดาวเหนือสำเร็จ!",
    createError: "ไม่สามารถสร้างดาวเหนือได้",
    findDirection: "ค้นหาทิศทางของคุณ",
    findDirectionDesc: "ค้นหาความหลงใหลด้วยเครื่องมือ Ikigai ของเรา",
    duration: "5–10 นาที",
    chooseUni: "เลือกเป้าหมายมหาวิทยาลัย",
    chooseUniDesc: "สำหรับนักเรียนที่มีเป้าหมายชัดเจนแล้ว",
    backToDirection: "กลับไปที่โปรไฟล์ทิศทาง",
  },
};
interface CreateNorthStarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userEducationLevel?: "high_school" | "university" | "unaffiliated";
  defaultOpenDirectionFinder?: boolean;
}

export function CreateNorthStarDialog({
  open,
  onOpenChange,
  onSuccess,
  userEducationLevel = "university",
  defaultOpenDirectionFinder = false,
}: CreateNorthStarDialogProps) {
  const { language } = useLanguage();
  const t = translations[language] || translations["en"];

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

  // Direction Finder State
  const [showDirectionFinder, setShowDirectionFinder] = useState(false);
  const [directionFinderResult, setDirectionFinderResult] =
    useState<DirectionFinderResult | null>(null);

  const { hasResult, isLoading: isDirectionLoading } = useDirectionFinder();

  // Reset on open
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      if (defaultOpenDirectionFinder) {
        setShowDirectionFinder(true);
      } else {
        setShowDirectionFinder(false);
      }
      // Reset other state if needed
    }
  }, [open, defaultOpenDirectionFinder]);

  // Handlers
  const handleNext = async () => {
    // Validation
    if (currentStep === 1 && !formData.visionQuestion.trim()) {
      toast.error(t.visionError);
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
    if (showDirectionFinder) {
      setShowDirectionFinder(false);
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
      toast.error(t.aiError);
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
        setFormData((prev) => ({ ...prev, milestones: newMilestones }));
        toast.success(t.milestonesGenerated);
      }
    } catch (e) {
      toast.error(t.milestonesError);
    } finally {
      setIsAiLoading(false);
    }
  };

  const startEducationalPathway = async () => {
    setLoadingUniversities(true);
    try {
      // Use Thailand admission data for browsing
      let initialData = await browseThailandCurriculums();

      if (!initialData || initialData.length === 0) {
        const fallbackData = await getAllUniversities();
        initialData = fallbackData;
      }

      const universities: University[] = initialData.map(
        (item: any, index: number) => ({
          id: item.id ? `curr-${item.id}` : `curr-${index}-${Date.now()}`,
          name: item.university_name_th || item.name,
          short_name:
            item.curriculum_name_en ||
            item.curriculum_name_th ||
            item.short_name,
          description: item.curriculum_name_th
            ? `${item.curriculum_name_th} (${item.curriculum_name_en})`
            : item.description,
          country: "Thailand",
          city: "Thailand",
          admission_requirements: item.total_plan
            ? `${item.total_plan}`
            : undefined,
          website_url: item.website_url,
        })
      );

      setUniversities(universities);
      setShowEducationalPathway(true);
    } catch (error) {
      toast.error(t.eduLoadError);
    } finally {
      setLoadingUniversities(false);
    }
  };

  const handleEducationalPathwayComplete = (
    data: EducationalFlowData & { roadmap: SimpleRoadmap }
  ) => {
    setShowEducationalPathway(false);
    setFormData((prev) => ({
      ...prev,
      visionQuestion: data.vision,
      milestones: data.roadmap.milestones.map((m, i) => ({
        title: m.title,
        startDate: format(addMonths(new Date(), i * 6), "yyyy-MM-dd"),
        dueDate: format(addMonths(new Date(), (i + 1) * 6), "yyyy-MM-dd"),
        measurable: m.description,
      })),
    }));
    setCurrentStep(3); // Skip to values
  };

  const handleDirectionFinderComplete = (result: DirectionFinderResult) => {
    setDirectionFinderResult(result);
    setShowDirectionFinder(false);

    // Use the Ikigai profile and direction vectors to populate the vision
    const vision = `My Ikigai is to leverage my strengths in ${result.profile.strengths.join(", ")} and my passion for ${result.profile.energizers.join(", ")} to address ${result.profile.values.join(", ")}. I aim to explore paths like ${result.vectors[0]?.name || "my chosen direction"}.`;

    // Pre-populate milestones from the first direction's exploration_steps
    const explorationSteps = result.vectors[0]?.exploration_steps || [];
    const milestones: SMARTMilestone[] = explorationSteps
      .slice(0, 5)
      .map((step, idx) => {
        const startDate = new Date(Date.now() + idx * 30 * 24 * 60 * 60 * 1000);
        const dueDate = new Date(
          Date.now() + (idx + 1) * 30 * 24 * 60 * 60 * 1000
        );
        return {
          title: step.description,
          startDate: startDate.toISOString().split("T")[0],
          dueDate: dueDate.toISOString().split("T")[0],
          measurable: step.reason || "Complete this step",
        };
      });

    setFormData((prev) => ({
      ...prev,
      visionQuestion: vision,
      milestones: milestones.length > 0 ? milestones : prev.milestones,
    }));
    setCurrentStep(2); // Move to milestones
  };

  const goBackToDirectionResults = () => {
    if (directionFinderResult) {
      setShowDirectionFinder(true);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error(t.nameError);
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
          await createProjectPath(
            createdProjects[i].id,
            createdProjects[i + 1].id,
            "leads_to"
          );
        }
      }

      toast.success(t.createSuccess);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(t.createError);
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="rounded-full hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </Button>
          <div className="flex flex-col">
            <span className="text-sm text-slate-400 font-medium tracking-wider uppercase">
              {t.headerTitle}
            </span>
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
            ) : showDirectionFinder ? (
              <motion.div
                key="direction-finder"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-4xl h-full"
              >
                <DirectionFinderFlow
                  onComplete={handleDirectionFinderComplete}
                  onCancel={() => setShowDirectionFinder(false)}
                  isReviewMode={hasResult}
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
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-amber-500 blur-3xl opacity-20 animate-pulse" />
                      <Sparkles className="w-24 h-24 text-amber-400 relative z-10" />
                    </div>
                    <div className="space-y-4">
                      <h2 className="text-4xl md:text-6xl font-bold bg-gradient-to-br from-white via-white to-slate-400 bg-clip-text text-transparent pb-2 leading-[1.2]">
                        {t.step0Title}
                      </h2>
                      <p className="text-xl text-slate-400 max-w-lg mx-auto leading-relaxed">
                        {t.step0Subtitle}
                      </p>
                    </div>
                    <Button
                      size="lg"
                      onClick={handleNext}
                      className="h-14 px-10 text-lg rounded-full bg-white text-slate-950 hover:bg-slate-200 transition-all hover:scale-105"
                    >
                      {t.startBtn} <ChevronRight className="ml-2" />
                    </Button>
                  </div>
                )}

                {/* Gated Access Message */}
                {currentStep === 0 && !isDirectionLoading && !hasResult && (
                  <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 space-y-6">
                    <Sparkles className="w-16 h-16 text-yellow-400 animate-pulse" />
                    <h3 className="text-2xl font-bold text-white">
                      Unlock Your North Star
                    </h3>
                    <p className="text-slate-400 max-w-md">
                      Before you can design your future, let's find your
                      direction specifically tailored to you.
                    </p>
                    <Button
                      size="lg"
                      onClick={() => setShowDirectionFinder(true)}
                      className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8"
                    >
                      Take Assessment First{" "}
                      <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* STEP 1: VISION */}
                {currentStep === 1 && (
                  <div className="space-y-8">
                    <div className="text-center space-y-2">
                      <h2 className="text-3xl font-bold">{t.step1Title}</h2>
                      <p className="text-slate-400">{t.step1Subtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <Button
                        variant="outline"
                        onClick={() => setShowDirectionFinder(true)}
                        className="h-auto py-4 flex flex-col items-center gap-2 border-slate-700 hover:bg-slate-800 hover:text-white"
                      >
                        <Compass className="w-6 h-6 text-blue-400" />
                        <span className="font-semibold">
                          {hasResult
                            ? "View Direction Profile"
                            : t.findDirection}
                        </span>
                        <span className="text-xs text-slate-500 font-normal text-center px-2">
                          {hasResult
                            ? "See your Ikigai & Paths"
                            : t.findDirectionDesc}
                        </span>
                        {!hasResult && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-medium">
                            {t.duration}
                          </span>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={startEducationalPathway}
                        className="h-auto py-4 flex flex-col items-center gap-2 border-slate-700 hover:bg-slate-800 hover:text-white"
                      >
                        <Map className="w-6 h-6 text-green-400" />
                        <span className="font-semibold">{t.chooseUni}</span>
                        <span className="text-xs text-slate-500 font-normal">
                          {t.chooseUniDesc}
                        </span>
                      </Button>
                    </div>

                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                      <Textarea
                        value={formData.visionQuestion}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            visionQuestion: e.target.value,
                          })
                        }
                        placeholder={t.step1Placeholder}
                        className="relative min-h-[200px] text-lg p-6 bg-slate-900/90 border-slate-700 rounded-xl focus:border-blue-500 transition-all resize-none"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleEnhanceVision}
                        disabled={isAiLoading || !formData.visionQuestion}
                        className="absolute bottom-4 right-4 text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                      >
                        {isAiLoading ? (
                          <Sparkles className="w-4 h-4 animate-spin" />
                        ) : (
                          <Wand2 className="w-4 h-4 mr-2" />
                        )}
                        {t.enhanceBtn}
                      </Button>
                    </div>

                    {showVisionComparison && (
                      <div className="bg-slate-900/50 border border-purple-500/30 rounded-xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-2 text-purple-400 font-medium">
                          <Sparkles className="w-4 h-4" /> {t.aiSuggestion}
                        </div>
                        <p className="text-slate-300 italic leading-relaxed">
                          "{aiEnhancedVision}"
                        </p>
                        <div className="flex gap-3">
                          <Button
                            size="sm"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                visionQuestion: aiEnhancedVision,
                              });
                              setShowVisionComparison(false);
                            }}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {t.useThis}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowVisionComparison(false)}
                          >
                            {t.keepMine}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: MILESTONES */}
                {currentStep === 2 && (
                  <div className="space-y-8">
                    <div className="text-center space-y-2">
                      <h2 className="text-3xl font-bold">{t.step2Title}</h2>
                      <p className="text-slate-400">{t.step2Subtitle}</p>
                    </div>

                    {directionFinderResult && (
                      <Button
                        variant="ghost"
                        onClick={goBackToDirectionResults}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />{" "}
                        {t.backToDirection}
                      </Button>
                    )}

                    <div className="space-y-4">
                      {formData.milestones.map((milestone, idx) => (
                        <div
                          key={idx}
                          className="flex gap-3 items-start group animate-in slide-in-from-bottom-2"
                          style={{ animationDelay: `${idx * 100}ms` }}
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold border border-slate-700 shrink-0 mt-1">
                            {idx + 1}
                          </div>
                          <div className="flex-1 space-y-2">
                            <Input
                              value={milestone.title}
                              onChange={(e) => {
                                const newM = [...formData.milestones];
                                newM[idx].title = e.target.value;
                                setFormData({ ...formData, milestones: newM });
                              }}
                              className="bg-slate-900 border-slate-700"
                              placeholder={t.milestonePlaceholder}
                            />
                            <div className="flex gap-2">
                              <Input
                                type="date"
                                value={milestone.dueDate}
                                onChange={(e) => {
                                  const newM = [...formData.milestones];
                                  newM[idx].dueDate = e.target.value;
                                  setFormData({
                                    ...formData,
                                    milestones: newM,
                                  });
                                }}
                                className="bg-slate-900 border-slate-700 text-sm"
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newM = formData.milestones.filter(
                                (_, i) => i !== idx
                              );
                              setFormData({ ...formData, milestones: newM });
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            milestones: [
                              ...formData.milestones,
                              {
                                title: "",
                                startDate: format(new Date(), "yyyy-MM-dd"),
                                dueDate: format(
                                  addMonths(new Date(), 3),
                                  "yyyy-MM-dd"
                                ),
                                measurable: "",
                              },
                            ],
                          })
                        }
                        className="w-full border-dashed border-slate-700 hover:bg-slate-800 hover:text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" /> {t.addMilestone}
                      </Button>

                      <div className="flex justify-center pt-4">
                        <Button
                          variant="ghost"
                          onClick={handleGenerateMilestones}
                          disabled={isAiLoading}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                        >
                          {isAiLoading ? (
                            <Sparkles className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Wand2 className="w-4 h-4 mr-2" />
                          )}
                          {t.generateBtn}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: VALUES & ASPECTS */}
                {currentStep === 3 && (
                  <div className="space-y-8">
                    <div className="text-center space-y-2">
                      <h2 className="text-3xl font-bold">{t.step3Title}</h2>
                      <p className="text-slate-400">{t.step3Subtitle}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {LIFE_ASPECTS.map((aspect) => {
                        const isSelected = formData.lifeAspects.includes(
                          aspect.value
                        );
                        return (
                          <div
                            key={aspect.value}
                            onClick={() => {
                              if (isSelected) {
                                setFormData({
                                  ...formData,
                                  lifeAspects: formData.lifeAspects.filter(
                                    (a) => a !== aspect.value
                                  ),
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  lifeAspects: [
                                    ...formData.lifeAspects,
                                    aspect.value,
                                  ],
                                });
                              }
                            }}
                            className={`
                              cursor-pointer p-4 rounded-xl border transition-all duration-200 flex flex-col items-center gap-2 text-center
                              ${
                                isSelected
                                  ? "bg-white/10 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.2)] scale-105"
                                  : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-800"
                              }
                            `}
                          >
                            <span className="text-2xl">{aspect.icon}</span>
                            <span className="font-medium text-sm">
                              {aspect.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 4: DESIGN STAR */}
                {currentStep === 4 && (
                  <div className="space-y-8">
                    <div className="text-center space-y-2">
                      <h2 className="text-3xl font-bold">{t.step4Title}</h2>
                      <p className="text-slate-400">{t.step4Subtitle}</p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                      <StarGenerator
                        config={formData.starConfig}
                        onConfigChange={(newConfig) =>
                          setFormData({ ...formData, starConfig: newConfig })
                        }
                        color={
                          NORTH_STAR_COLORS.find(
                            (c) => c.value === formData.northStarColor
                          )?.color || "#FFD700"
                        }
                        glowColor={
                          NORTH_STAR_COLORS.find(
                            (c) => c.value === formData.northStarColor
                          )?.glow || "#FFA500"
                        }
                      />

                      <div className="mt-6 pt-6 border-t border-slate-800">
                        <div className="flex gap-2 justify-center flex-wrap">
                          {NORTH_STAR_COLORS.map((color) => (
                            <button
                              key={color.value}
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  northStarColor: color.value,
                                })
                              }
                              className={`w-8 h-8 rounded-full border-2 transition-all ${
                                formData.northStarColor === color.value
                                  ? "scale-125 border-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                  : "border-transparent opacity-50 hover:opacity-100"
                              }`}
                              style={{ background: color.color }}
                              title={color.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: NAME & LAUNCH */}
                {currentStep === 5 && (
                  <div className="text-center space-y-8">
                    <div className="space-y-2">
                      <h2 className="text-3xl font-bold">{t.step5Title}</h2>
                      <p className="text-slate-400">{t.step5Subtitle}</p>
                    </div>

                    <div className="max-w-md mx-auto">
                      <Input
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        placeholder={t.namePlaceholder}
                        className="text-center text-2xl h-16 bg-slate-900 border-slate-700 rounded-xl focus:border-white focus:ring-white transition-all"
                        autoFocus
                      />
                    </div>

                    <div className="pt-8">
                      <Button
                        size="lg"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="h-16 px-12 text-xl rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:shadow-[0_0_50px_rgba(59,130,246,0.7)] transition-all hover:scale-105"
                      >
                        {isSubmitting ? (
                          <Sparkles className="w-6 h-6 animate-spin" />
                        ) : (
                          <>
                            <Rocket className="w-6 h-6 mr-2" />
                            {t.launchBtn}
                          </>
                        )}
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
      {!showEducationalPathway && !showDirectionFinder && currentStep > 0 && (
        <div className="relative z-10 p-6 flex justify-between items-center max-w-5xl mx-auto w-full">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> {t.back}
          </Button>

          {currentStep < 5 && (
            <Button
              onClick={handleNext}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/10"
            >
              {t.next} <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
