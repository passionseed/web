"use client";

import { 
  Stethoscope, Bot, Rocket, X, Search, Brain, FileCode, Scale, 
  Rocket as RocketIcon, Stethoscope as StethoscopeIcon, HeartPulse, 
  Microscope, Siren, MessageSquare, Database, Lightbulb, Box, 
  Presentation, CheckCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

// ============================================================================
// TYPES & DATA
// ============================================================================

interface PathDay {
  title: string;
  description: string;
  task: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface PathContent {
  title: string;
  tagline: string;
  accent: string;
  bgColor: string;
  borderColor: string;
  days: PathDay[];
}

const pathsData: Record<string, { en: PathContent; th: PathContent }> = {
  "medical-doctor": {
    en: {
      title: "Medical Doctor",
      tagline: "5 days to test if you're fit for medicine",
      accent: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      days: [
        { 
          title: "Day 1: Patient Diagnosis", 
          description: "Analyze symptoms and create differential diagnoses for real patient cases.",
          task: "Diagnose 3 patients",
          icon: StethoscopeIcon
        },
        { 
          title: "Day 2: Treatment Planning", 
          description: "Design treatment plans considering patient history and drug interactions.",
          task: "Create treatment plan",
          icon: HeartPulse
        },
        { 
          title: "Day 3: Medical Research", 
          description: "Interpret clinical studies and apply research findings to patient care.",
          task: "Analyze research paper",
          icon: Microscope
        },
        { 
          title: "Day 4: Emergency Response", 
          description: "Make rapid decisions under pressure in simulated emergency scenarios.",
          task: "Triage emergency patients",
          icon: Siren
        },
        { 
          title: "Day 5: Patient Communication", 
          description: "Deliver difficult news and explain complex conditions clearly.",
          task: "Record consultation",
          icon: MessageSquare
        },
      ],
    },
    th: {
      title: "แพทย์",
      tagline: "5 วันเพื่อทดสอบว่าคุณเหมาะกับการแพทย์ไหม",
      accent: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      days: [
        { 
          title: "วันที่ 1: การวินิจฉัยผู้ป่วย", 
          description: "วิเคราะห์อาการและสร้างการวินิจฉัยแยกโรคจากเคสผู้ป่วยจริง",
          task: "วินิจฉัยผู้ป่วย 3 ราย",
          icon: StethoscopeIcon
        },
        { 
          title: "วันที่ 2: วางแผนการรักษา", 
          description: "ออกแบบแผนรักษาโดยพิจารณาประวัติผู้ป่วยและปฏิกิริยายา",
          task: "สร้างแผนรักษา",
          icon: HeartPulse
        },
        { 
          title: "วันที่ 3: การวิจัยทางการแพทย์", 
          description: "ตีความการศึกษาทางคลินิกและนำผลวิจัยไปใช้กับการดูแลผู้ป่วย",
          task: "วิเคราะห์งานวิจัย",
          icon: Microscope
        },
        { 
          title: "วันที่ 4: การตอบสนองฉุกเฉิน", 
          description: "ตัดสินใจอย่างรวดเร็วภายใต้ความกดดันในสถานการณ์ฉุกเฉินจำลอง",
          task: "จัดลำดับความสำคัญ",
          icon: Siren
        },
        { 
          title: "วันที่ 5: การสื่อสารกับผู้ป่วย", 
          description: "สื่อสารข่าวยากและอธิบายอาการซับซ้อนอย่างเข้าใจง่าย",
          task: "บันทึกการปรึกษา",
          icon: MessageSquare
        },
      ],
    },
  },
  "ai-engineer": {
    en: {
      title: "AI Engineer",
      tagline: "5 days to discover if you love building AI",
      accent: "text-violet-400",
      bgColor: "bg-violet-500/10",
      borderColor: "border-violet-500/20",
      days: [
        { 
          title: "Day 1: Data Exploration", 
          description: "Dive into real datasets and discover patterns that machines can learn from.",
          task: "Explore dataset",
          icon: Database
        },
        { 
          title: "Day 2: Model Training", 
          description: "Train your first machine learning model and learn to diagnose issues.",
          task: "Train ML model",
          icon: Brain
        },
        { 
          title: "Day 3: Prompt Engineering", 
          description: "Master the art of communicating with large language models.",
          task: "Craft 10 prompts",
          icon: FileCode
        },
        { 
          title: "Day 4: AI Ethics", 
          description: "Explore bias, fairness, and the societal impact of AI systems.",
          task: "Audit for bias",
          icon: Scale
        },
        { 
          title: "Day 5: Ship a Demo", 
          description: "Build and deploy a working AI application end-to-end.",
          task: "Deploy AI demo",
          icon: RocketIcon
        },
      ],
    },
    th: {
      title: "วิศวกร AI",
      tagline: "5 วันเพื่อค้นพบว่าคุณชอบสร้าง AI ไหม",
      accent: "text-violet-400",
      bgColor: "bg-violet-500/10",
      borderColor: "border-violet-500/20",
      days: [
        { 
          title: "วันที่ 1: การสำรวจข้อมูล", 
          description: "ดำดิ่งสู่ชุดข้อมูลจริงและค้นพบรูปแบบที่เครื่องจักรเรียนรู้ได้",
          task: "สำรวจชุดข้อมูล",
          icon: Database
        },
        { 
          title: "วันที่ 2: การเทรนโมเดล", 
          description: "เทรนโมเดลแมชชีนเลิร์นนิงตัวแรกและเรียนรู้การวินิจฉัยปัญหา",
          task: "เทรนโมเดล ML",
          icon: Brain
        },
        { 
          title: "วันที่ 3: Prompt Engineering", 
          description: "เชี่ยวชาญศิลปะการสื่อสารกับโมเดลภาษาขนาดใหญ่",
          task: "สร้าง 10 prompt",
          icon: FileCode
        },
        { 
          title: "วันที่ 4: จริยธรรม AI", 
          description: "สำรวจอคติ ความเป็นธรรม และผลกระทบทางสังคมของ AI",
          task: "ตรวจสอบอคติ",
          icon: Scale
        },
        { 
          title: "วันที่ 5: ส่งงาน Demo", 
          description: "สร้างและปล่อยแอปพลิเคชัน AI ที่ใช้งานได้จริง",
          task: "ปล่อย AI demo",
          icon: RocketIcon
        },
      ],
    },
  },
  "startup-founder": {
    en: {
      title: "Startup Founder",
      tagline: "5 days to see if you can turn ideas into reality",
      accent: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      days: [
        { 
          title: "Day 1: Problem Discovery", 
          description: "Identify real problems worth solving and validate people care.",
          task: "Interview 5 people",
          icon: Search
        },
        { 
          title: "Day 2: Solution Design", 
          description: "Design solutions simple enough to build but valuable enough to matter.",
          task: "Sketch solution",
          icon: Lightbulb
        },
        { 
          title: "Day 3: MVP Planning", 
          description: "Define your minimum viable product and what to build first.",
          task: "Define MVP scope",
          icon: Box
        },
        { 
          title: "Day 4: Pitch Crafting", 
          description: "Tell your story in a way that inspires action from investors.",
          task: "Record 2-min pitch",
          icon: Presentation
        },
        { 
          title: "Day 5: Validate with Users", 
          description: "Get real people to try your concept and learn what works.",
          task: "Test with 3 users",
          icon: CheckCircle
        },
      ],
    },
    th: {
      title: "ผู้ก่อตั้งสตาร์ทอัพ",
      tagline: "5 วันเพื่อดูว่าคุณสามารถเปลี่ยนไอเดียเป็นความจริงได้ไหม",
      accent: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      days: [
        { 
          title: "วันที่ 1: การค้นหาปัญหา", 
          description: "ระบุปัญหาจริงที่คุ้มค่าจะแก้และตรวจสอบว่าคนสนใจ",
          task: "สัมภาษณ์ 5 คน",
          icon: Search
        },
        { 
          title: "วันที่ 2: การออกแบบโซลูชัน", 
          description: "ออกแบบโซลูชันที่เรียบง่ายพอที่จะสร้างแต่มีค่าพอที่จะสำคัญ",
          task: "วาดแบบโซลูชัน",
          icon: Lightbulb
        },
        { 
          title: "วันที่ 3: วางแผน MVP", 
          description: "กำหนดผลิตภัณฑ์ที่ทำได้ขั้นต่ำและสิ่งที่ควรสร้างก่อน",
          task: "กำหนดขอบเขต MVP",
          icon: Box
        },
        { 
          title: "วันที่ 4: การสร้าง Pitch", 
          description: "เล่าเรื่องราวของคุณในแบบที่สร้างแรงบันดาลใจกับนักลงทุน",
          task: "บันทึก pitch 2 นาที",
          icon: Presentation
        },
        { 
          title: "วันที่ 5: ตรวจสอบกับผู้ใช้", 
          description: "ให้คนจริงลองคอนเซ็ปต์ของคุณและเรียนรู้ว่าอะไรได้ผล",
          task: "ทดสอบกับ 3 คน",
          icon: CheckCircle
        },
      ],
    },
  },
};

const pathConfigs = [
  { id: "medical-doctor", icon: Stethoscope },
  { id: "ai-engineer", icon: Bot },
  { id: "startup-founder", icon: Rocket },
];

// Slow, peaceful timing - gives people time to read and absorb
const CYCLE_INTERVAL = 15000; // 15 seconds per path - plenty of time to read
const DAY_REVEAL_DELAY = 1200; // 1.2 seconds between each day - gentle reveal
const TRANSITION_DURATION = 0.8; // Smooth, unhurried transitions

// Easing curves for peaceful motion
const EASE_GENTLE = [0.25, 0.1, 0.25, 1]; // Slow start, smooth end - like breathing
const EASE_PEACEFUL = [0.4, 0, 0.2, 1]; // Very smooth, no jarring movements

// ============================================================================
// COMPONENTS
// ============================================================================

export function LandingDemoPaths() {
  const { language } = useLanguage();
  const [activePathIndex, setActivePathIndex] = useState(0);
  const [visibleDayCount, setVisibleDayCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activePathId = pathConfigs[activePathIndex].id;
  const pathData = pathsData[activePathId][language];
  const PathIcon = pathConfigs[activePathIndex].icon;

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Auto-cycle through paths - slow and peaceful
  useEffect(() => {
    if (isPaused || isReducedMotion) return;

    const interval = setInterval(() => {
      setActivePathIndex((prev) => (prev + 1) % pathConfigs.length);
      setVisibleDayCount(0);
    }, CYCLE_INTERVAL);

    return () => clearInterval(interval);
  }, [isPaused, isReducedMotion]);

  // Animate days revealing one by one - gentle, unhurried
  useEffect(() => {
    if (isReducedMotion) {
      setVisibleDayCount(5);
      return;
    }

    setVisibleDayCount(0);
    const timeouts: NodeJS.Timeout[] = [];

    for (let i = 1; i <= 5; i++) {
      const timeout = setTimeout(() => {
        setVisibleDayCount(i);
      }, i * DAY_REVEAL_DELAY);
      timeouts.push(timeout);
    }

    return () => timeouts.forEach(clearTimeout);
  }, [activePathIndex, isReducedMotion]);

  const handlePathSelect = (index: number) => {
    setActivePathIndex(index);
    setVisibleDayCount(0);
  };

  const handleDayClick = () => {
    setSelectedPathId(activePathId);
  };

  const closeModal = () => {
    setSelectedPathId(null);
  };

  return (
    <div 
      ref={containerRef}
      className="w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Main Card */}
      <div className="relative">
        {/* Path Selector Tabs */}
        <div className="flex gap-2 mb-3">
          {pathConfigs.map((config, index) => {
            const data = pathsData[config.id][language];
            const isActive = index === activePathIndex;
            
            return (
              <button
                key={config.id}
                onClick={() => handlePathSelect(index)}
                className={`
                  flex-1 flex items-center justify-center gap-2 
                  px-2 sm:px-3 py-2.5 rounded-xl border 
                  transition-all duration-700 ease-out
                  ${isActive 
                    ? `${data.bgColor} ${data.borderColor} border` 
                    : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]'
                  }
                `}
              >
                <config.icon className={`w-4 h-4 ${data.accent}`} />
                <span className={`text-[10px] sm:text-xs font-medium ${isActive ? 'text-white' : 'text-white/50'}`}>
                  {data.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Path Content Card */}
        <motion.div
          key={activePathId}
          initial={isReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: TRANSITION_DURATION, ease: EASE_GENTLE }}
          className={`
            relative p-4 sm:p-5 rounded-2xl border ${pathData.borderColor} ${pathData.bgColor}
            backdrop-blur-sm
          `}
        >
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className={`
              w-10 h-10 sm:w-11 sm:h-11 rounded-xl 
              bg-white/[0.05] border border-white/[0.08]
              flex items-center justify-center flex-shrink-0
            `}>
              <PathIcon className={`w-5 h-5 ${pathData.accent}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                {pathData.title}
              </h3>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                {pathData.tagline}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-baseline justify-between text-[10px] sm:text-xs text-white/40 mb-2">
              <span>{language === 'th' ? 'ความคืบหน้า' : 'Progress'}</span>
              <span className="font-medium text-white/60">{visibleDayCount}/5</span>
            </div>
            <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div 
                className={`h-full rounded-full ${pathData.accent.replace('text-', 'bg-').replace('400', '500')}`}
                initial={{ width: 0 }}
                animate={{ width: `${(visibleDayCount / 5) * 100}%` }}
                transition={{ duration: 0.8, ease: EASE_PEACEFUL }}
              />
            </div>
          </div>

          {/* Days Grid - Clean icon + number */}
          <div className="grid grid-cols-5 gap-2">
            {pathData.days.map((day, index) => {
              const isVisible = index < visibleDayCount;
              // Only highlight as current if this is the latest revealed day AND not all days are shown yet
              const isCurrentDay = index === visibleDayCount - 1 && visibleDayCount < 5 && !isReducedMotion;
              const DayIcon = day.icon;
              const isCompleted = index < visibleDayCount - 1 || visibleDayCount === 5;
              
              return (
                <AnimatePresence key={index}>
                  {isVisible && (
                    <motion.button
                      initial={isReducedMotion ? false : { opacity: 0, scale: 0.85, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ 
                        duration: 0.5, 
                        delay: index * 0.1, 
                        ease: EASE_GENTLE 
                      }}
                      onClick={handleDayClick}
                      className={`
                        relative flex flex-col items-center justify-center
                        aspect-square rounded-xl border
                        transition-all duration-700 ease-out
                        ${isCurrentDay 
                          ? `${pathData.borderColor} border bg-white/[0.06]` 
                          : isCompleted
                            ? 'border-white/[0.08] bg-white/[0.03]'
                            : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]'
                        }
                      `}
                    >
                      {/* Icon */}
                      <DayIcon className={`
                        w-5 h-5 sm:w-5 sm:h-5 mb-1.5
                        ${isCurrentDay ? pathData.accent : isCompleted ? 'text-white/50' : 'text-white/40'}
                        transition-colors duration-700
                      `} />
                      
                      {/* Day Number */}
                      <span className={`
                        text-[11px] font-medium tabular-nums
                        ${isCurrentDay ? 'text-white' : isCompleted ? 'text-white/60' : 'text-white/50'}
                        transition-colors duration-700
                      `}>
                        {index + 1}
                      </span>

                      {/* Soft glow for current day only - not on completed days */}
                      {isCurrentDay && !isReducedMotion && (
                        <motion.div
                          className="absolute inset-0 rounded-xl pointer-events-none"
                          style={{
                            background: pathData.accent.includes('emerald') 
                              ? 'radial-gradient(circle at center, rgba(52, 211, 153, 0.12) 0%, transparent 70%)'
                              : pathData.accent.includes('violet')
                                ? 'radial-gradient(circle at center, rgba(167, 139, 250, 0.12) 0%, transparent 70%)'
                                : 'radial-gradient(circle at center, rgba(251, 191, 36, 0.12) 0%, transparent 70%)'
                          }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0.4, 0.7, 0.4] }}
                          transition={{ 
                            duration: 3, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                          }}
                        />
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>
              );
            })}
          </div>

          {/* Current Day Detail Preview */}
          <AnimatePresence mode="wait">
            {visibleDayCount > 0 && visibleDayCount <= 5 && (
              <motion.div
                key={`day-${visibleDayCount}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.5, ease: EASE_GENTLE }}
                className="mt-4 p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div className="flex items-start gap-3">
                  <div className={`
                    w-8 h-8 rounded-lg ${pathData.bgColor} 
                    flex items-center justify-center flex-shrink-0
                  `}>
                    {(() => {
                      const CurrentIcon = pathData.days[visibleDayCount - 1].icon;
                      return <CurrentIcon className={`w-4 h-4 ${pathData.accent}`} />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white leading-snug">
                      {pathData.days[visibleDayCount - 1].title}
                    </h4>
                    <p className="text-xs text-white/50 leading-relaxed mt-1.5">
                      {pathData.days[visibleDayCount - 1].description}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Complete State */}
          {visibleDayCount === 5 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_GENTLE, delay: 0.3 }}
              className="mt-4"
            >
              <button
                onClick={() => setSelectedPathId(activePathId)}
                className={`
                  w-full flex items-center justify-center gap-2 
                  px-4 py-3 rounded-xl
                  text-sm font-medium text-white
                  ${pathData.bgColor} ${pathData.borderColor} border
                  hover:bg-white/[0.08] transition-colors duration-300
                `}
              >
                {language === 'th' ? 'ดูรายละเอียดทั้งหมด' : 'View full details'}
                <PathIcon className={`w-4 h-4 ${pathData.accent}`} />
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Cycle Indicator Dots */}
        <div className="flex justify-center gap-2 mt-4">
          {pathConfigs.map((_, index) => (
            <button
              key={index}
              onClick={() => handlePathSelect(index)}
              className={`
                h-1 rounded-full transition-all duration-700 ease-out
                ${index === activePathIndex 
                  ? 'bg-white/50 w-5' 
                  : 'bg-white/15 w-1.5 hover:bg-white/25'
                }
              `}
              aria-label={`${language === 'th' ? 'เลือกเส้นทาง' : 'Select path'} ${index + 1}`}
            />
          ))}
        </div>

        {/* More paths note */}
        <p className="text-center text-[11px] text-white/30 mt-4 tracking-wide">
          {language === 'th' ? '+12 เส้นทางอื่นๆ ที่พร้อมให้ลอง' : '+12 more paths to explore'}
        </p>
      </div>

      {/* Modal */}
      <PathDetailModal
        pathId={selectedPathId}
        isOpen={!!selectedPathId}
        onClose={closeModal}
        language={language}
      />
    </div>
  );
}

// ============================================================================
// MODAL COMPONENT
// ============================================================================

interface PathDetailModalProps {
  pathId: string | null;
  isOpen: boolean;
  onClose: () => void;
  language: "en" | "th";
}

function PathDetailModal({ pathId, isOpen, onClose, language }: PathDetailModalProps) {
  if (!pathId) return null;
  
  const data = pathsData[pathId][language];
  const config = pathConfigs.find(p => p.id === pathId);
  const Icon = config?.icon || Bot;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.4, ease: EASE_GENTLE }}
            className="
              fixed z-50 
              inset-x-4 bottom-4 top-[8vh]
              sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
              sm:w-[90vw] sm:max-w-lg sm:inset-x-auto sm:bottom-auto sm:top-auto
              max-h-[85vh] overflow-auto
              rounded-2xl bg-[#161616] border border-white/[0.08] p-5 sm:p-6
            "
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] transition-colors duration-300"
            >
              <X className="w-4 h-4 text-white/50" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-4 mb-6 pr-8">
              <div className={`
                w-12 h-12 rounded-xl ${data.bgColor} border ${data.borderColor}
                flex items-center justify-center flex-shrink-0
              `}>
                <Icon className={`w-6 h-6 ${data.accent}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
                  {data.title}
                </h2>
                <p className="text-xs text-white/50 mt-1.5 leading-relaxed">
                  {data.tagline}
                </p>
              </div>
            </div>

            {/* Days List */}
            <div className="space-y-3">
              {data.days.map((day, index) => {
                const DayIcon = day.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      delay: 0.1 + index * 0.1, 
                      duration: 0.4, 
                      ease: EASE_GENTLE 
                    }}
                    className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        w-8 h-8 rounded-lg ${data.bgColor} 
                        flex items-center justify-center flex-shrink-0
                      `}>
                        <DayIcon className={`w-4 h-4 ${data.accent}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-white leading-snug">
                          {day.title}
                        </h4>
                        <p className="text-xs text-white/50 leading-relaxed mt-1.5">
                          {day.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer CTA */}
            <div className="mt-6 pt-5 border-t border-white/[0.06]">
              <button
                onClick={onClose}
                className={`
                  w-full flex items-center justify-center gap-2 
                  px-5 py-3.5 rounded-xl
                  text-sm font-medium text-white
                  ${data.bgColor} ${data.borderColor} border
                  hover:bg-white/[0.08] transition-colors duration-300
                `}
              >
                {language === 'th' ? 'เริ่มต้นการทดลอง' : 'Start Trial'}
                <Icon className={`w-4 h-4 ${data.accent}`} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
