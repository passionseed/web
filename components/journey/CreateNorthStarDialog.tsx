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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Star,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Languages,
  X,
  GripVertical,
  Pencil,
  Check,
  Sparkles,
  Calendar,
} from "lucide-react";
import { createNorthStar } from "@/lib/supabase/north-star";
import {
  createJourneyProject,
  createProjectPath,
} from "@/lib/supabase/journey";
import { toast } from "sonner";
import { SDG_GOALS, CAREER_PATHS, NORTH_STAR_COLORS } from "@/constants/sdg";
import { LIFE_ASPECTS } from "@/constants/life-aspects";
import { StarGenerator } from "@/components/ui/star-generator";
import {
  StarConfig,
  createDefaultStarConfig,
  validateStarConfig,
} from "@/lib/utils/svg-star";
import {
  enhanceVision,
  generateMilestones,
} from "@/lib/ai/north-star-enhancer";
import { addMonths, format } from "date-fns";

type Language = "en" | "th";

interface SMARTMilestone {
  title: string;
  startDate: string;
  dueDate: string;
  measurable: string;
}

const translations = {
  en: {
    title: "Create Your North Star",
    step0: "Welcome to your journey",
    step1: "Envision your future",
    step2: "Create your milestones",
    step3: "Align with your values",
    step4: "Design your star",
    step5: "Name your North Star",
    welcomeTitle: "Your Journey Begins Here",
    welcomeSubtitle: "Take a moment to pause and reflect",
    welcomeQuote:
      '"The future belongs to those who believe in the beauty of their dreams."',
    welcomeAuthor: "— Eleanor Roosevelt",
    welcomeIntro:
      "You're about to create something powerful—a North Star that will guide your journey for years to come.",
    welcomeReflect: "Before we begin, let's take a moment to reflect:",
    welcomePoint1: "What matters most to you in life?",
    welcomePoint2: "What impact do you want to make on the world?",
    welcomePoint3: "What legacy do you want to leave behind?",
    welcomeFooter:
      "There are no wrong answers. This is your journey, your vision, your North Star.",
    welcomeReady: "When you're ready, let's begin this journey together.",
    welcomeButton: "I'm Ready to Begin",
    visionTitle: "What do you want to see happening in the next 3 years?",
    visionSubtitle: "Paint a vivid picture of your ideal future",
    visionPlaceholder:
      "Imagine yourself 3 years from now... What does success look like? What impact are you making? How do you feel? What are you proud of?",
    visionIntro: "Take a moment to envision your future...",
    actionTitle: "What needs to happen for that image to be real?",
    actionSubtitle: "Think about the steps, skills, and changes needed",
    actionPlaceholder:
      "What skills do you need to develop? What obstacles must you overcome? What resources or support do you need? What habits need to change?",
    actionIntro: "Now, let's think about the journey...",
    milestoneTitle: "Break Down Your Journey",
    milestoneSubtitle: "List the key milestones you need to achieve",
    milestoneIntro: "Now, let's map out your path...",
    yourGoal: "Your North Star Goal:",
    milestonePlaceholder:
      "E.g., Learn programming fundamentals, Build first project, Get internship...",
    addMilestone: "Add Milestone",
    removeMilestone: "Remove",
    noMilestones: "No milestones yet. Add your first milestone to begin.",
    milestoneHint: "What are the major steps you need to take?",
    planTopDown:
      "💡 Pro tip: Start with big milestones first, then add smaller steps",
    dragToReorder: "Drag to reorder • Click to edit",
    editMilestone: "Edit",
    saveMilestone: "Save",
    sdgTitle: "🌍 UN Sustainable Development Goals (Optional)",
    sdgSubtitle: "Select SDGs that align with your North Star",
    sdgSelected: "Selected",
    careerTitle: "💼 Career Path (Optional)",
    careerSubtitle:
      "Choose a career direction that aligns with your North Star",
    careerNone: "No specific path",
    starDesignTitle: "⭐ Design Your Star",
    starDesignSubtitle: "Create a unique star that represents your North Star",
    colorThemeTitle: "🎨 Color Theme",
    colorThemeSubtitle: "Select a color theme for your star",
    finalTitle: "What will you call your North Star? *",
    finalSubtitle: "A clear, inspiring name for your long-term vision",
    finalPlaceholder: "E.g., Become a software engineer solving climate change",
    finalIntro: "Finally, give your North Star a name",
    summaryTitle: "Your North Star Summary",
    summaryVision: "Your Vision:",
    summarySteps: "Steps Needed:",
    cancel: "Cancel",
    previous: "Previous",
    next: "Next",
    create: "Create North Star",
    creating: "Creating...",
    language: "Language",

    // AI Enhancement
    aiEnhance: "✨ Enhance with AI",
    aiEnhancing: "Enhancing...",
    aiEnhanced: "✓ AI Enhanced",
    aiError: "AI enhancement failed",
    aiLimitReached: "AI enhancement already used",
    aiHint: "AI will help clarify and strengthen your vision",

    // SMART Milestones
    smartMode: "Add SMART Details",
    simpleMode: "Simple Mode",
    startDate: "Start Date",
    dueDate: "Due Date",
    measurableGoal: "How will you measure success?",
    timelineView: "Timeline View",
    generating: "Generating...",
    aiGenerate: "✨ Generate Milestones with AI",
    aiGenerateHint: "AI will suggest milestones based on your vision",
    estimatedHours: "Estimated Hours",
    milestoneDetails: "Milestone Details",

    // Life Aspects
    lifeAspectsTitle: "🌈 Life Aspects",
    lifeAspectsSubtitle: "Select the areas of life this North Star impacts",
    sdgForImpact: "For Social Impact & Business Projects",
    selectLifeAspects: "Select at least one life aspect",
  },
  th: {
    title: "สร้างดาวเหนือของคุณ",
    step0: "ยินดีต้อนรับสู่การเดินทาง",
    step1: "จินตนาการถึงอนาคต",
    step2: "สร้างขั้นตอนสำคัญ",
    step3: "จัดแนวกับค่านิยม",
    step4: "ออกแบบดาวของคุณ",
    step5: "ตั้งชื่อดาวเหนือ",
    welcomeTitle: "การเดินทางของคุณเริ่มต้นที่นี่",
    welcomeSubtitle: "ใช้เวลาสักครู่เพื่อหยุดและไตร่ตรอง",
    welcomeQuote: '"อนาคตเป็นของผู้ที่เชื่อในความงามของความฝัน"',
    welcomeAuthor: "— เอเลนอร์ รูสเวลต์",
    welcomeIntro:
      "คุณกำลังจะสร้างสิ่งที่ทรงพลัง—ดาวเหนือที่จะนำทางการเดินทางของคุณในอีกหลายปีข้างหน้า",
    welcomeReflect: "ก่อนที่เราจะเริ่ม ลองตั้งใจคิดสักแปป:",
    welcomePoint1: "อะไรคือสิ่งที่สำคัญที่สุดในชีวิตของคุณ?",
    welcomePoint2: "คุณต้องการสร้างผลกระทบอะไรต่อโลก?",
    welcomePoint3: "คุณต้องการทิ้งมรดกอะไรไว้?",
    welcomeFooter:
      "ไม่มีคำตอบที่ผิด นี่คือการเดินทาง วิสัยทัศน์ และดาวเหนือของคุณ",
    welcomeReady: "เมื่อคุณพร้อมแล้ว เรามาเริ่มการเดินทางนี้ด้วยกัน",
    welcomeButton: "ฉันพร้อมที่จะเริ่มต้น",
    visionTitle: "คุณอยากเห็นอะไรเกิดขึ้นในชีวิตของคุณในอีก 3 ปีข้างหน้า?",
    visionSubtitle: "จินตนาการอนาคตที่คุณฝันถึงให้ชัดเจน",
    visionPlaceholder:
      "ลองจินตนาการตัวเองในอีก 3 ปีข้างหน้า... ความสำเร็จของคุณเป็นอย่างไร? คุณสร้างผลกระทบอะไร? คุณรู้สึกอย่างไร? คุณภูมิใจในอะไร?",
    visionIntro: "ใช้เวลาสักครู่เพื่อจินตนาการถึงอนาคตของคุณ...",
    actionTitle: "อะไรต้องเกิดขึ้นเพื่อให้ภาพนั้นเป็นจริง?",
    actionSubtitle: "คิดถึงขั้นตอน ทักษะ และการเปลี่ยนแปลงที่จำเป็น",
    actionPlaceholder:
      "คุณต้องพัฒนาทักษะอะไร? อุปสรรคอะไรที่ต้องก้าวข้าม? ต้องการทรัพยากรหรือการสนับสนุนอะไร? นิสัยอะไรต้องเปลี่ยน?",
    actionIntro: "มาคิดถึงเส้นทางกันเถอะ...",
    milestoneTitle: "แบ่งเส้นทางออกเป็นขั้นตอน",
    milestoneSubtitle: "ระบุขั้นตอนสำคัญที่คุณต้องบรรลุ",
    milestoneIntro: "มาวางแผนเส้นทางของคุณกันเถอะ...",
    yourGoal: "เป้าหมายดาวเหนือของคุณ:",
    milestonePlaceholder:
      "เช่น เรียนรู้พื้นฐานการเขียนโปรแกรม, สร้างโปรเจกต์แรก, หาฝึกงาน...",
    addMilestone: "เพิ่มขั้นตอน",
    removeMilestone: "ลบ",
    noMilestones: "ยังไม่มีขั้นตอน เพิ่มขั้นตอนแรกเพื่อเริ่มต้น",
    milestoneHint: "ขั้นตอนสำคัญที่คุณต้องทำมีอะไรบ้าง?",
    planTopDown:
      "💡 เคล็ดลับ: เริ่มจากขั้นตอนใหญ่ก่อน แล้วค่อยเพิ่มรายละเอียดย่อย",
    dragToReorder: "ลากเพื่อเรียงลำดับ • คลิกเพื่อแก้ไข",
    editMilestone: "แก้ไข",
    saveMilestone: "บันทึก",
    sdgTitle: "🌍 เป้าหมายการพัฒนาที่ยั่งยืนของสหประชาชาติ (ไม่บังคับ)",
    sdgSubtitle: "เลือก SDG ที่สอดคล้องกับดาวเหนือของคุณ",
    sdgSelected: "เลือกแล้ว",
    careerTitle: "💼 เส้นทางอาชีพ (ไม่บังคับ)",
    careerSubtitle: "เลือกทิศทางอาชีพที่สอดคล้องกับดาวเหนือของคุณ",
    careerNone: "ไม่มีเส้นทางเฉพาะ",
    starDesignTitle: "⭐ ออกแบบดาวของคุณ",
    starDesignSubtitle: "สร้างดาวที่เป็นเอกลักษณ์ซึ่งแทนดาวเหนือของคุณ",
    colorThemeTitle: "🎨 ธีมสี",
    colorThemeSubtitle: "เลือกธีมสีสำหรับดาวของคุณ",
    finalTitle: "คุณจะเรียกดาวเหนือของคุณว่าอะไร? *",
    finalSubtitle:
      "ชื่อที่ชัดเจนและสร้างแรงบันดาลใจสำหรับวิสัยทัศน์ระยะยาวของคุณ",
    finalPlaceholder:
      "เช่น เป็นวิศวกรซอฟต์แวร์ที่แก้ปัญหาการเปลี่ยนแปลงสภาพภูมิอากาศ",
    finalIntro: "สุดท้าย ตั้งชื่อให้ดาวเหนือของคุณ",
    summaryTitle: "สรุปดาวเหนือของคุณ",
    summaryVision: "วิสัยทัศน์ของคุณ:",
    summarySteps: "ขั้นตอนที่จำเป็น:",
    cancel: "ยกเลิก",
    previous: "ก่อนหน้า",
    next: "ถัดไป",
    create: "สร้างดาวเหนือ",
    creating: "กำลังสร้าง...",
    language: "ภาษา",

    // AI Enhancement
    aiEnhance: "✨ ปรับปรุงด้วย AI",
    aiEnhancing: "กำลังปรับปรุง...",
    aiEnhanced: "✓ ปรับปรุงแล้ว",
    aiError: "การปรับปรุงด้วย AI ล้มเหลว",
    aiLimitReached: "ใช้การปรับปรุง AI ไปแล้ว",
    aiHint: "AI จะช่วยชี้แจงและเสริมความแข็งแกร่งให้วิสัยทัศน์ของคุณ",

    // SMART Milestones
    smartMode: "เพิ่มรายละเอียด SMART",
    simpleMode: "โหมดง่าย",
    startDate: "วันเริ่มต้น",
    dueDate: "วันครบกำหนด",
    measurableGoal: "คุณจะวัดความสำเร็จอย่างไร?",
    timelineView: "มุมมองไทม์ไลน์",
    generating: "กำลังสร้าง...",
    aiGenerate: "✨ สร้างขั้นตอนด้วย AI",
    aiGenerateHint: "AI จะแนะนำขั้นตอนตามวิสัยทัศน์ของคุณ",
    estimatedHours: "ชั่วโมงโดยประมาณ",
    milestoneDetails: "รายละเอียดขั้นตอน",

    // Life Aspects
    lifeAspectsTitle: "🌈 ด้านชีวิต",
    lifeAspectsSubtitle: "เลือกด้านชีวิตที่ดาวเหนือนี้ส่งผลกระทบ",
    sdgForImpact: "สำหรับโปรเจกต์ผลกระทบทางสังคมและธุรกิจ",
    selectLifeAspects: "เลือกอย่างน้อยหนึ่งด้านชีวิต",
  },
};

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
  const [currentStep, setCurrentStep] = useState(0);
  const [language, setLanguage] = useState<Language>("en");
  const [formData, setFormData] = useState({
    visionQuestion: "",
    milestones: [] as SMARTMilestone[],
    lifeAspects: [] as string[],
    sdgGoals: [] as number[],
    careerPath: "",
    starConfig: createDefaultStarConfig(),
    northStarColor: "golden",
    title: "",
  });
  const [newMilestone, setNewMilestone] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [originalVision, setOriginalVision] = useState("");
  const [aiEnhancedVision, setAiEnhancedVision] = useState("");
  const [showVisionComparison, setShowVisionComparison] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiUsedForMilestones, setAiUsedForMilestones] = useState(false);
  const [showSMARTDetails, setShowSMARTDetails] = useState(false);

  const t = translations[language];

  const totalSteps = 6;

  // AI Enhancement Handlers
  const handleEnhanceVision = async () => {
    if (!formData.visionQuestion.trim()) {
      return;
    }

    setIsAiLoading(true);
    try {
      const result = await enhanceVision(formData.visionQuestion, language);

      if (result.success && result.data) {
        setOriginalVision(formData.visionQuestion);
        setAiEnhancedVision(result.data as string);
        setShowVisionComparison(true);
        toast.success(t.aiEnhanced);
      } else {
        toast.error(result.error || t.aiError);
      }
    } catch (error) {
      console.error("AI enhancement error:", error);
      toast.error(t.aiError);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAcceptAiVision = () => {
    setFormData((prev) => ({
      ...prev,
      visionQuestion: aiEnhancedVision,
    }));
    setShowVisionComparison(false);
  };

  const handleRejectAiVision = () => {
    setShowVisionComparison(false);
  };

  const handleGenerateMilestones = async () => {
    if (!formData.visionQuestion.trim()) {
      return;
    }

    setIsAiLoading(true);
    try {
      const result = await generateMilestones(
        formData.visionQuestion,
        language
      );

      if (result.success && result.data && Array.isArray(result.data)) {
        const now = new Date();
        const generatedMilestones: SMARTMilestone[] = result.data.map(
          (title, index) => ({
            title,
            startDate: format(addMonths(now, index * 4), "yyyy-MM-dd"),
            dueDate: format(addMonths(now, (index + 1) * 4), "yyyy-MM-dd"),
            measurable: "",
          })
        );

        setFormData((prev) => ({
          ...prev,
          milestones: generatedMilestones,
        }));
        setAiUsedForMilestones(true);
        toast.success(`Generated ${generatedMilestones.length} milestones!`);
      } else {
        toast.error(result.error || t.aiError);
      }
    } catch (error) {
      console.error("AI generation error:", error);
      toast.error(t.aiError);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleNext = () => {
    // Validation is optional for reflection steps - allow moving forward
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
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
      console.log("🌟 Starting North Star creation...");

      // Validate star config
      const validatedConfig = validateStarConfig(formData.starConfig);

      // Create the North Star
      console.log("📝 Creating North Star with data:", {
        title: formData.title.trim(),
        milestones: formData.milestones.length,
      });

      const northStar = await createNorthStar({
        title: formData.title.trim(),
        description: formData.visionQuestion.trim() || undefined,
        why:
          formData.milestones.length > 0
            ? formData.milestones.map((m) => m.title).join("\n")
            : undefined,
        icon: "svg", // Marker to indicate SVG star
        sdg_goals: formData.sdgGoals.length > 0 ? formData.sdgGoals : undefined,
        career_path: formData.careerPath || undefined,
        north_star_shape: "custom_svg",
        north_star_color: formData.northStarColor,
        metadata: {
          starConfig: validatedConfig,
          lifeAspects:
            formData.lifeAspects.length > 0 ? formData.lifeAspects : undefined,
          aiEnhancedVision:
            showVisionComparison || originalVision ? true : false,
          aiGeneratedMilestones: aiUsedForMilestones,
        },
      });

      console.log("✅ North Star created:", northStar.id);

      // Create projects from milestones and link them to the North Star
      let createdProjectsCount = 0;
      if (formData.milestones.length > 0) {
        console.log(
          `🎯 Creating ${formData.milestones.length} milestone projects...`
        );

        const createdProjects = [];

        // Create each milestone as a project
        for (let i = 0; i < formData.milestones.length; i++) {
          const milestone = formData.milestones[i];

          try {
            console.log(
              `📦 Creating project ${i + 1}/${formData.milestones.length}:`,
              milestone
            );

            const project = await createJourneyProject({
              title: milestone.title,
              description: `Step ${i + 1} towards: ${formData.title}`,
              project_type: "learning",
              status: "not_started",
              linked_north_star_id: northStar.id,
              icon: "🎯",
              color: "#3b82f6", // Blue color for milestone projects
              metadata: {
                milestone_index: i,
                from_north_star_wizard: true,
                north_star_title: formData.title,
                // SMART milestone data
                smart_milestone: {
                  startDate: milestone.startDate || undefined,
                  dueDate: milestone.dueDate || undefined,
                  measurable: milestone.measurable || undefined,
                },
              },
            });

            createdProjects.push(project);
            createdProjectsCount++;
            console.log(
              `✅ Created project ${i + 1}/${formData.milestones.length}:`,
              {
                id: project.id,
                title: project.title,
                linked_north_star_id: project.linked_north_star_id,
              }
            );
          } catch (error: any) {
            console.error(
              `❌ Failed to create project for milestone "${milestone.title}":`,
              error
            );
            console.error("Error details:", {
              message: error.message,
              stack: error.stack,
            });
            // Continue creating other projects even if one fails
          }
        }

        console.log(
          `🔗 Created ${createdProjects.length} projects, now creating paths...`
        );

        // Create project paths in sequence (leads_to pattern)
        let createdPathsCount = 0;
        for (let i = 0; i < createdProjects.length - 1; i++) {
          try {
            console.log(`🔗 Linking project ${i + 1} to ${i + 2}...`);

            const path = await createProjectPath(
              createdProjects[i].id,
              createdProjects[i + 1].id,
              "leads_to"
            );

            createdPathsCount++;
            console.log(
              `✅ Linked "${createdProjects[i].title}" → "${createdProjects[i + 1].title}"`
            );
          } catch (error: any) {
            console.error(`❌ Failed to create path between projects:`, error);
            console.error("Path error details:", {
              from: createdProjects[i]?.id,
              to: createdProjects[i + 1]?.id,
              message: error.message,
            });
            // Continue creating other paths even if one fails
          }
        }

        console.log(
          `🎉 Summary: Created ${createdProjectsCount} projects and ${createdPathsCount} paths`
        );
      }

      const successMessage =
        formData.milestones.length > 0
          ? `North Star "${formData.title}" created with ${createdProjectsCount} milestone projects!`
          : `North Star "${formData.title}" created successfully!`;

      toast.success(successMessage);

      // Reset form
      setFormData({
        title: "",
        visionQuestion: "",
        milestones: [],
        lifeAspects: [],
        sdgGoals: [],
        careerPath: "",
        starConfig: createDefaultStarConfig(),
        northStarColor: "golden",
      });
      setNewMilestone("");
      setEditingIndex(null);
      setEditingText("");
      setDraggedIndex(null);
      setOriginalVision("");
      setAiEnhancedVision("");
      setShowVisionComparison(false);
      setAiUsedForMilestones(false);
      setCurrentStep(0);

      console.log("🔄 Calling onSuccess to refresh journey map...");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("❌ Error creating North Star:", error);
      console.error("Error stack:", error.stack);
      toast.error(
        `Failed to create North Star: ${error.message || "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedColor =
    NORTH_STAR_COLORS.find((c) => c.value === formData.northStarColor) ||
    NORTH_STAR_COLORS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              {t.title}
            </DialogTitle>
            <Select
              value={language}
              onValueChange={(val) => setLanguage(val as Language)}
            >
              <SelectTrigger className="w-[140px] h-8">
                <Languages className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="th">🇹🇭 ไทย</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogDescription>
            {currentStep === 0 ? (
              t.welcomeSubtitle
            ) : (
              <>
                Step {currentStep} of {totalSteps - 1}:{" "}
                {currentStep === 1
                  ? t.step1
                  : currentStep === 2
                    ? t.step2
                    : currentStep === 3
                      ? t.step3
                      : currentStep === 4
                        ? t.step4
                        : t.step5}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-6 overflow-y-auto flex-1 pr-2 -mr-2">
            {/* STEP 0: Welcome & Reflection */}
            {currentStep === 0 && (
              <div className="space-y-8 animate-in fade-in duration-700">
                <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30 rounded-2xl p-10 border-2 border-purple-200 dark:border-purple-800 shadow-xl">
                  {/* Animated Stars Background */}
                  <div className="text-center mb-8 relative">
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      <div className="text-9xl animate-pulse">✨</div>
                    </div>
                    <div className="relative z-10">
                      <div className="text-6xl mb-4 animate-bounce">🌟</div>
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
                        {t.welcomeTitle}
                      </h2>
                    </div>
                  </div>

                  {/* Inspirational Quote */}
                  <div className="mb-8 p-6 bg-white/60 dark:bg-black/20 rounded-xl border border-purple-200 dark:border-purple-700">
                    <p className="text-xl italic text-center text-purple-900 dark:text-purple-100 mb-2">
                      {t.welcomeQuote}
                    </p>
                    <p className="text-sm text-center text-purple-700 dark:text-purple-300">
                      {t.welcomeAuthor}
                    </p>
                  </div>

                  {/* Introduction */}
                  <div className="mb-8 text-center">
                    <p className="text-lg text-purple-800 dark:text-purple-200 leading-relaxed">
                      {t.welcomeIntro}
                    </p>
                  </div>

                  {/* Reflection Questions */}
                  <div className="space-y-6">
                    <p className="text-base font-semibold text-purple-900 dark:text-purple-100 text-center">
                      {t.welcomeReflect}
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-100/50 to-pink-100/50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                        <div className="text-2xl mt-1">💭</div>
                        <p className="text-base text-purple-800 dark:text-purple-200 flex-1">
                          {t.welcomePoint1}
                        </p>
                      </div>
                      <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-pink-100/50 to-indigo-100/50 dark:from-pink-900/20 dark:to-indigo-900/20 rounded-lg">
                        <div className="text-2xl mt-1">🌍</div>
                        <p className="text-base text-purple-800 dark:text-purple-200 flex-1">
                          {t.welcomePoint2}
                        </p>
                      </div>
                      <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-indigo-100/50 to-purple-100/50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg">
                        <div className="text-2xl mt-1">🎯</div>
                        <p className="text-base text-purple-800 dark:text-purple-200 flex-1">
                          {t.welcomePoint3}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Message */}
                  <div className="mt-8 pt-6 border-t border-purple-200 dark:border-purple-700">
                    <p className="text-center text-sm text-purple-700 dark:text-purple-300 italic mb-4">
                      {t.welcomeFooter}
                    </p>
                    <p className="text-center text-base font-medium text-purple-900 dark:text-purple-100">
                      {t.welcomeReady}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1: Vision Question */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl p-8 border-2 border-amber-200 dark:border-amber-800">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-3">🌟</div>
                    <p className="text-base text-amber-800 dark:text-amber-200 italic">
                      {t.visionIntro}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Label
                      htmlFor="vision"
                      className="text-xl font-bold text-amber-900 dark:text-amber-100 block text-center"
                    >
                      {t.visionTitle}
                    </Label>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      {t.visionSubtitle}
                    </p>
                    <Textarea
                      id="vision"
                      placeholder={t.visionPlaceholder}
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

                    {/* AI Enhancement Button */}
                    <div className="flex flex-col items-center gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleEnhanceVision}
                        disabled={
                          isAiLoading || !formData.visionQuestion.trim()
                        }
                        className="w-full max-w-md bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-300 dark:border-purple-700 hover:border-purple-400"
                      >
                        {isAiLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t.aiEnhancing}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            {t.aiEnhance}
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        {t.aiHint}
                      </p>
                    </div>

                    {/* Vision Comparison Modal */}
                    {showVisionComparison && (
                      <div className="mt-4 p-4 bg-white dark:bg-gray-900 border-2 border-purple-300 dark:border-purple-700 rounded-xl">
                        <h4 className="text-sm font-semibold mb-3 text-purple-900 dark:text-purple-100">
                          Compare & Choose
                        </h4>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground">
                              Your Original
                            </Label>
                            <Textarea
                              value={originalVision}
                              onChange={(e) =>
                                setOriginalVision(e.target.value)
                              }
                              rows={6}
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                              ✨ AI Enhanced
                            </Label>
                            <Textarea
                              value={aiEnhancedVision}
                              onChange={(e) =>
                                setAiEnhancedVision(e.target.value)
                              }
                              rows={6}
                              className="text-sm border-purple-300 dark:border-purple-700"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRejectAiVision}
                          >
                            Keep Original
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAcceptAiVision}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            Use AI Version
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Milestone Creator */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Show Vision as Goal */}
                {formData.visionQuestion && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl p-6 border-2 border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl mt-1">🌟</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
                          {t.yourGoal}
                        </p>
                        <p className="text-base text-amber-800 dark:text-amber-200 leading-relaxed">
                          {formData.visionQuestion}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-8 border-2 border-blue-200 dark:border-blue-800">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-3">🎯</div>
                    <p className="text-base text-blue-800 dark:text-blue-200 italic">
                      {t.milestoneIntro}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-xl font-bold text-blue-900 dark:text-blue-100 block text-center">
                      {t.milestoneTitle}
                    </Label>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      {t.milestoneSubtitle}
                    </p>

                    {/* AI Generation Button */}
                    {formData.milestones.length === 0 && (
                      <div className="flex flex-col items-center gap-2 pb-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGenerateMilestones}
                          disabled={
                            isAiLoading || !formData.visionQuestion.trim()
                          }
                          className="w-full max-w-md bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-300 dark:border-purple-700 hover:border-purple-400"
                        >
                          {isAiLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {t.generating}
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              {t.aiGenerate}
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                          {t.aiGenerateHint}
                        </p>
                      </div>
                    )}

                    {/* Milestone List */}
                    <div className="space-y-3">
                      {/* UX Guidance */}
                      <div className="bg-blue-100/50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-3 mb-4">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          {t.planTopDown}
                        </p>
                      </div>

                      {formData.milestones.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-sm">{t.noMilestones}</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-blue-700 dark:text-blue-300 text-center italic">
                            {t.dragToReorder}
                          </p>
                          <div className="space-y-2">
                            {formData.milestones.map((milestone, index) => (
                              <div
                                key={index}
                                draggable={editingIndex !== index}
                                onDragStart={(e) => {
                                  setDraggedIndex(index);
                                  e.dataTransfer.effectAllowed = "move";
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = "move";
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (
                                    draggedIndex === null ||
                                    draggedIndex === index
                                  )
                                    return;

                                  const newMilestones = [
                                    ...formData.milestones,
                                  ];
                                  const [removed] = newMilestones.splice(
                                    draggedIndex,
                                    1
                                  );
                                  newMilestones.splice(index, 0, removed);

                                  setFormData((prev) => ({
                                    ...prev,
                                    milestones: newMilestones,
                                  }));
                                  setDraggedIndex(null);
                                }}
                                onDragEnd={() => setDraggedIndex(null)}
                                className={`flex items-start gap-2 p-3 bg-white/60 dark:bg-black/20 rounded-lg border transition-all ${
                                  draggedIndex === index
                                    ? "opacity-50 border-blue-400 dark:border-blue-500"
                                    : "border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500"
                                } group cursor-move`}
                              >
                                {/* Drag Handle */}
                                <div className="mt-1 text-blue-400 dark:text-blue-500 cursor-grab active:cursor-grabbing">
                                  <GripVertical className="w-4 h-4" />
                                </div>

                                {/* Number */}
                                <span className="text-blue-600 dark:text-blue-400 font-semibold min-w-[24px] mt-1">
                                  {index + 1}.
                                </span>

                                {/* Editable Content */}
                                <div className="flex-1 min-w-0">
                                  {editingIndex === index ? (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        value={editingText}
                                        onChange={(e) =>
                                          setEditingText(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === "Enter" &&
                                            editingText.trim()
                                          ) {
                                            const newMilestones = [
                                              ...formData.milestones,
                                            ];
                                            newMilestones[index] = {
                                              title: editingText.trim(),
                                              startDate: "",
                                              dueDate: "",
                                              measurable: "",
                                            };
                                            setFormData((prev) => ({
                                              ...prev,
                                              milestones: newMilestones,
                                            }));
                                            setEditingIndex(null);
                                            setEditingText("");
                                          } else if (e.key === "Escape") {
                                            setEditingIndex(null);
                                            setEditingText("");
                                          }
                                        }}
                                        className="flex-1"
                                        autoFocus
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => {
                                          if (editingText.trim()) {
                                            const newMilestones = [
                                              ...formData.milestones,
                                            ];
                                            newMilestones[index] = {
                                              title: editingText.trim(),
                                              startDate: "",
                                              dueDate: "",
                                              measurable: "",
                                            };
                                            setFormData((prev) => ({
                                              ...prev,
                                              milestones: newMilestones,
                                            }));
                                          }
                                          setEditingIndex(null);
                                          setEditingText("");
                                        }}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <Check className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingIndex(null);
                                          setEditingText("");
                                        }}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <p
                                      className="text-base text-blue-900 dark:text-blue-100 cursor-text"
                                      onClick={() => {
                                        setEditingIndex(index);
                                        setEditingText(milestone.title);
                                      }}
                                    >
                                      {milestone.title}
                                    </p>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                {editingIndex !== index && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingIndex(index);
                                        setEditingText(milestone.title);
                                      }}
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                                      title={t.editMilestone}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setFormData((prev) => ({
                                          ...prev,
                                          milestones: prev.milestones.filter(
                                            (_, i) => i !== index
                                          ),
                                        }));
                                      }}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                      title={t.removeMilestone}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Add Milestone Input */}
                    <div className="space-y-2 pt-4 border-t border-blue-200 dark:border-blue-700">
                      <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        {t.milestoneHint}
                      </p>
                      <div className="flex gap-2">
                        <Input
                          placeholder={t.milestonePlaceholder}
                          value={newMilestone}
                          onChange={(e) => setNewMilestone(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newMilestone.trim()) {
                              e.preventDefault();
                              setFormData((prev) => ({
                                ...prev,
                                milestones: [
                                  ...prev.milestones,
                                  {
                                    title: newMilestone.trim(),
                                    startDate: "",
                                    dueDate: "",
                                    measurable: "",
                                  },
                                ],
                              }));
                              setNewMilestone("");
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (newMilestone.trim()) {
                              setFormData((prev) => ({
                                ...prev,
                                milestones: [
                                  ...prev.milestones,
                                  {
                                    title: newMilestone.trim(),
                                    startDate: "",
                                    dueDate: "",
                                    measurable: "",
                                  },
                                ],
                              }));
                              setNewMilestone("");
                            }
                          }}
                          disabled={!newMilestone.trim()}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {t.addMilestone}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Values Alignment (SDG + Career) */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Life Aspects Multi-select */}
                <div className="space-y-2 border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
                  <Label className="text-base font-semibold">
                    {t.lifeAspectsTitle}
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t.lifeAspectsSubtitle}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {LIFE_ASPECTS.map((aspect) => (
                      <div
                        key={aspect.value}
                        className="flex items-start space-x-2 p-3 rounded-lg hover:bg-white/50 dark:hover:bg-background/50 border border-transparent hover:border-purple-200 dark:hover:border-purple-700 transition-colors"
                      >
                        <Checkbox
                          id={`aspect-${aspect.value}`}
                          checked={formData.lifeAspects.includes(aspect.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData((prev) => ({
                                ...prev,
                                lifeAspects: [
                                  ...prev.lifeAspects,
                                  aspect.value,
                                ],
                              }));
                            } else {
                              setFormData((prev) => ({
                                ...prev,
                                lifeAspects: prev.lifeAspects.filter(
                                  (a) => a !== aspect.value
                                ),
                              }));
                            }
                          }}
                        />
                        <label
                          htmlFor={`aspect-${aspect.value}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{aspect.icon}</span>
                            <div className="font-medium text-sm">
                              {aspect.label}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {aspect.description}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                  {formData.lifeAspects.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Selected: {formData.lifeAspects.length} life aspect
                      {formData.lifeAspects.length > 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                {/* SDG Goals - Only show if "contribution" life aspect is selected */}
                {formData.lifeAspects.includes("contribution") && (
                  <div className="space-y-2 border rounded-lg p-4 bg-amber-50/50 dark:bg-amber-950/20">
                    <Label className="text-base font-semibold">
                      {t.sdgTitle}
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      {t.sdgForImpact}
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
                        {t.sdgSelected}: {formData.sdgGoals.length} SDG
                        {formData.sdgGoals.length > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}

                {/* Career Path Selection */}
                <div className="space-y-2">
                  <Label
                    htmlFor="career-path"
                    className="text-base font-semibold"
                  >
                    {t.careerTitle}
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t.careerSubtitle}
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
                      <SelectValue placeholder={t.careerSubtitle} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t.careerNone}</SelectItem>
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
                    {t.starDesignTitle}
                  </Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t.starDesignSubtitle}
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
                    {t.colorThemeTitle}
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t.colorThemeSubtitle}
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
                      {t.finalIntro}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Label
                      htmlFor="title"
                      className="text-xl font-bold text-purple-900 dark:text-purple-100 block text-center"
                    >
                      {t.finalTitle}
                    </Label>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      {t.finalSubtitle}
                    </p>
                    <Input
                      id="title"
                      placeholder={t.finalPlaceholder}
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      required
                      className="text-lg text-center font-semibold"
                      autoFocus
                    />

                    {/* Show summary of what they've created */}
                    {(formData.visionQuestion ||
                      formData.milestones.length > 0) && (
                      <div className="mt-6 pt-6 border-t border-purple-200 dark:border-purple-800">
                        <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-3 text-center">
                          {t.summaryTitle}
                        </p>
                        {formData.visionQuestion && (
                          <div className="mb-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              {t.summaryVision}
                            </p>
                            <p className="text-sm line-clamp-3">
                              {formData.visionQuestion}
                            </p>
                          </div>
                        )}
                        {formData.milestones.length > 0 && (
                          <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              {t.summarySteps}
                            </p>
                            <ul className="text-sm space-y-1">
                              {formData.milestones
                                .slice(0, 3)
                                .map((milestone, index) => (
                                  <li
                                    key={index}
                                    className="flex items-start gap-2"
                                  >
                                    <span className="text-purple-600 dark:text-purple-400">
                                      {index + 1}.
                                    </span>
                                    <span className="flex-1">
                                      {milestone.title}
                                    </span>
                                  </li>
                                ))}
                              {formData.milestones.length > 3 && (
                                <li className="text-muted-foreground italic">
                                  +{formData.milestones.length - 3} more...
                                </li>
                              )}
                            </ul>
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
            {currentStep === 0 ? (
              // Welcome page - centered begin button
              <div className="flex-1 flex justify-center">
                <Button
                  type="button"
                  onClick={handleNext}
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 hover:from-purple-600 hover:via-pink-600 hover:to-indigo-600 text-white font-semibold px-12 py-6 text-lg shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  <Star className="w-5 h-5 mr-2 animate-pulse" />
                  {t.welcomeButton}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            ) : (
              // Regular wizard steps
              <>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    {t.cancel}
                  </Button>
                  {currentStep > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={isSubmitting}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      {t.previous}
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  {currentStep < totalSteps - 1 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                    >
                      {t.next}
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
                          {t.creating}
                        </>
                      ) : (
                        <>
                          <Star className="w-4 h-4 mr-2" />
                          {t.create}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
