"use client";

import { 
  Stethoscope, Bot, Rocket, X, Brain, Database, Lightbulb, 
  FileCode, Scale, Search, HeartPulse, Microscope, Siren, 
  MessageSquare, Box, Presentation, CheckCircle, Rocket as RocketIcon,
  Stethoscope as StethoscopeIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
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
  days: PathDay[];
}

const pathsData: Record<string, { en: PathContent; th: PathContent }> = {
  "medical-doctor": {
    en: {
      title: "Medical Doctor",
      tagline: "5 days to test if you're fit for medicine",
      accent: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      days: [
        { title: "Patient Diagnosis", description: "Analyze symptoms and create differential diagnoses.", task: "Diagnose 3 patients", icon: StethoscopeIcon },
        { title: "Treatment Planning", description: "Design treatment plans considering patient history.", task: "Create treatment plan", icon: HeartPulse },
        { title: "Medical Research", description: "Interpret clinical studies and apply findings.", task: "Analyze research paper", icon: Microscope },
        { title: "Emergency Response", description: "Make rapid decisions under pressure.", task: "Triage emergency patients", icon: Siren },
        { title: "Patient Communication", description: "Deliver difficult news clearly.", task: "Record consultation", icon: MessageSquare },
      ],
    },
    th: {
      title: "แพทย์",
      tagline: "5 วันเพื่อทดสอบว่าคุณเหมาะกับการแพทย์ไหม",
      accent: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      days: [
        { title: "การวินิจฉัยผู้ป่วย", description: "วิเคราะห์อาการและสร้างการวินิจฉัยแยกโรค", task: "วินิจฉัยผู้ป่วย 3 ราย", icon: StethoscopeIcon },
        { title: "วางแผนการรักษา", description: "ออกแบบแผนรักษาโดยพิจารณาประวัติผู้ป่วย", task: "สร้างแผนรักษา", icon: HeartPulse },
        { title: "การวิจัยทางการแพทย์", description: "ตีความการศึกษาทางคลินิกและนำผลวิจัยไปใช้", task: "วิเคราะห์งานวิจัย", icon: Microscope },
        { title: "การตอบสนองฉุกเฉิน", description: "ตัดสินใจอย่างรวดเร็วภายใต้ความกดดัน", task: "จัดลำดับความสำคัญ", icon: Siren },
        { title: "การสื่อสารกับผู้ป่วย", description: "สื่อสารข่าวยากและอธิบายอาการซับซ้อน", task: "บันทึกการปรึกษา", icon: MessageSquare },
      ],
    },
  },
  "ai-engineer": {
    en: {
      title: "AI Engineer",
      tagline: "5 days to discover if you love building AI",
      accent: "text-violet-400",
      bgColor: "bg-violet-500/10",
      days: [
        { title: "Data Exploration", description: "Discover patterns that machines can learn from.", task: "Explore dataset", icon: Database },
        { title: "Model Training", description: "Train your first ML model and diagnose issues.", task: "Train ML model", icon: Brain },
        { title: "Prompt Engineering", description: "Master communicating with large language models.", task: "Craft 10 prompts", icon: FileCode },
        { title: "AI Ethics", description: "Explore bias, fairness, and societal impact.", task: "Audit for bias", icon: Scale },
        { title: "Ship a Demo", description: "Build and deploy a working AI application.", task: "Deploy AI demo", icon: RocketIcon },
      ],
    },
    th: {
      title: "วิศวกร AI",
      tagline: "5 วันเพื่อค้นพบว่าคุณชอบสร้าง AI ไหม",
      accent: "text-violet-400",
      bgColor: "bg-violet-500/10",
      days: [
        { title: "การสำรวจข้อมูล", description: "ค้นพบรูปแบบที่เครื่องจักรเรียนรู้ได้", task: "สำรวจชุดข้อมูล", icon: Database },
        { title: "การเทรนโมเดล", description: "เทรนโมเดลแมชชีนเลิร์นนิงตัวแรก", task: "เทรนโมเดล ML", icon: Brain },
        { title: "Prompt Engineering", description: "เชี่ยวชาญการสื่อสารกับโมเดลภาษา", task: "สร้าง 10 prompt", icon: FileCode },
        { title: "จริยธรรม AI", description: "สำรวจอคติและผลกระทบทางสังคม", task: "ตรวจสอบอคติ", icon: Scale },
        { title: "ส่งงาน Demo", description: "สร้างและปล่อยแอปพลิเคชัน AI", task: "ปล่อย AI demo", icon: RocketIcon },
      ],
    },
  },
  "startup-founder": {
    en: {
      title: "Startup Founder",
      tagline: "5 days to see if you can turn ideas into reality",
      accent: "text-amber-400",
      bgColor: "bg-amber-500/10",
      days: [
        { title: "Problem Discovery", description: "Identify real problems worth solving.", task: "Interview 5 people", icon: Search },
        { title: "Solution Design", description: "Design solutions simple enough to build.", task: "Sketch solution", icon: Lightbulb },
        { title: "MVP Planning", description: "Define your minimum viable product.", task: "Define MVP scope", icon: Box },
        { title: "Pitch Crafting", description: "Tell your story to inspire action.", task: "Record 2-min pitch", icon: Presentation },
        { title: "Validate with Users", description: "Get real feedback on your concept.", task: "Test with 3 users", icon: CheckCircle },
      ],
    },
    th: {
      title: "ผู้ก่อตั้งสตาร์ทอัพ",
      tagline: "5 วันเพื่อดูว่าคุณสามารถเปลี่ยนไอเดียเป็นความจริงได้ไหม",
      accent: "text-amber-400",
      bgColor: "bg-amber-500/10",
      days: [
        { title: "การค้นหาปัญหา", description: "ระบุปัญหาจริงที่คุ้มค่าจะแก้", task: "สัมภาษณ์ 5 คน", icon: Search },
        { title: "การออกแบบโซลูชัน", description: "ออกแบบโซลูชันที่เรียบง่ายพอที่จะสร้าง", task: "วาดแบบโซลูชัน", icon: Lightbulb },
        { title: "วางแผน MVP", description: "กำหนดผลิตภัณฑ์ขั้นต่ำที่ต้องสร้าง", task: "กำหนดขอบเขต MVP", icon: Box },
        { title: "การสร้าง Pitch", description: "เล่าเรื่องราวที่สร้างแรงบันดาลใจ", task: "บันทึก pitch 2 นาที", icon: Presentation },
        { title: "ตรวจสอบกับผู้ใช้", description: "ให้คนจริงลองคอนเซ็ปต์และเรียนรู้", task: "ทดสอบกับ 3 คน", icon: CheckCircle },
      ],
    },
  },
};

const pathConfigs = [
  { id: "medical-doctor", icon: Stethoscope, shortLabel: { en: "Doctor", th: "แพทย์" } },
  { id: "ai-engineer", icon: Bot, shortLabel: { en: "AI Eng.", th: "AI" } },
  { id: "startup-founder", icon: Rocket, shortLabel: { en: "Founder", th: "ผู้ก่อตั้ง" } },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function LandingDemoPaths() {
  const { language } = useLanguage();
  const [activePathIndex, setActivePathIndex] = useState(0);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [isInView, setIsInView] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const activePathId = pathConfigs[activePathIndex].id;
  const pathData = pathsData[activePathId][language];
  const PathIcon = pathConfigs[activePathIndex].icon;

  // Pause auto-cycle when scrolled out of view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isThai = language === "th";

  return (
    <div ref={containerRef} className="w-full">
      {/* Path Selector Tabs: icon+label on desktop, icon-only on mobile */}
      <div className="flex gap-1.5 sm:gap-2 mb-4">
        {pathConfigs.map((config, index) => {
          const data = pathsData[config.id][language];
          const isActive = index === activePathIndex;
          
          return (
            <button
              key={config.id}
              onClick={() => setActivePathIndex(index)}
              className={`
                flex items-center justify-center gap-1.5 sm:gap-2 
                px-2 sm:px-3 py-2.5 rounded-xl transition-all duration-200
                active:scale-95
                ${isActive 
                  ? `${data.bgColor} border border-white/10` 
                  : 'bg-white/5 border border-transparent hover:bg-white/10'
                }
              `}
              aria-label={data.title}
            >
              <config.icon className={`w-4 h-4 shrink-0 ${data.accent}`} />
              {/* Short label always visible; full label on sm+ */}
              <span className="sm:hidden text-[10px] font-medium leading-tight text-white/70">
                {config.shortLabel[language]}
              </span>
              <span className={`
                font-medium leading-tight
                ${isActive ? 'text-white' : 'text-white/50'}
                hidden sm:inline text-xs
              `}>
                {data.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Path Content */}
      <motion.div
        key={activePathId}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`p-4 sm:p-5 rounded-2xl ${pathData.bgColor}`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0`}>
            <PathIcon className={`w-5 h-5 ${pathData.accent}`} />
          </div>
          <div className="min-w-0">
            <h3 className={`text-base sm:text-lg font-bold text-white leading-tight ${isThai ? 'break-words' : ''}`}>
              {pathData.title}
            </h3>
            <p className="text-xs text-white/50 leading-relaxed mt-0.5">
              {pathData.tagline}
            </p>
          </div>
        </div>

        {/* Days Grid: horizontal scroll on mobile, 5-col grid on larger screens */}
        <div className="flex sm:grid sm:grid-cols-5 gap-2 mb-4 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 scrollbar-none snap-x snap-mandatory -mx-1 sm:mx-0 px-1 sm:px-0">
          {pathData.days.map((day, index) => {
            const DayIcon = day.icon;
            return (
              <button
                key={index}
                onClick={() => setSelectedPathId(activePathId)}
                className={`
                  flex flex-col items-center justify-center
                  min-w-[52px] sm:aspect-square
                  shrink-0 snap-start
                  rounded-xl bg-white/5
                  hover:bg-white/10 active:bg-white/15
                  active:scale-95
                  transition-all duration-150
                  p-2 sm:p-0
                  ${isThai ? 'leading-snug' : ''}
                `}
                aria-label={`Day ${index + 1}: ${day.title}`}
              >
                <DayIcon className={`w-4 h-4 sm:w-5 sm:h-5 mb-1 ${pathData.accent}`} />
                <span className="text-[11px] font-medium text-white/70 tabular-nums">{index + 1}</span>
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <button
          onClick={() => setSelectedPathId(activePathId)}
          className={`
            w-full py-3 rounded-xl text-sm font-medium text-white
            ${pathData.bgColor} border border-white/10
            hover:bg-white/10 active:bg-white/15 active:scale-[0.98]
            transition-all duration-150
          `}
        >
          {language === 'th' ? 'ดูรายละเอียด' : 'View details'}
        </button>
      </motion.div>

      {/* Modal */}
      <PathDetailModal
        pathId={selectedPathId}
        isOpen={!!selectedPathId}
        onClose={() => setSelectedPathId(null)}
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
  const isThai = language === "th";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="
              fixed z-50
              /* Mobile: bottom sheet */
              inset-x-0 bottom-0 top-auto
              rounded-t-2xl rounded-b-none
              /* Desktop: centered dialog */
              sm:inset-x-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
              sm:bottom-auto sm:rounded-2xl
              sm:w-[90vw] sm:max-w-lg
              max-h-[85vh] overflow-auto
              bg-[#161616] border border-white/10
              p-5 sm:p-6
              shadow-2xl
            "
          >
            {/* Drag handle for mobile */}
            <div className="sm:hidden w-8 h-1 rounded-full bg-white/20 mx-auto mb-4" />

            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 active:scale-90 transition-all duration-150"
              aria-label={language === "th" ? "ปิด" : "Close"}
            >
              <X className="w-4 h-4 text-white/50" />
            </button>

            <div className="flex items-start gap-3 mb-5 pr-8">
              <div className={`w-12 h-12 rounded-xl ${data.bgColor} flex items-center justify-center shrink-0`}>
                <Icon className={`w-6 h-6 ${data.accent}`} />
              </div>
              <div className="min-w-0">
                <h2 className={`text-lg font-bold text-white leading-tight ${isThai ? 'break-words' : ''}`}>
                  {data.title}
                </h2>
                <p className={`text-xs text-white/50 mt-1 leading-relaxed`}>
                  {data.tagline}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {data.days.map((day, index) => {
                const DayIcon = day.icon;
                return (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-white/5"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg ${data.bgColor} flex items-center justify-center shrink-0 mt-0.5`}>
                        <DayIcon className={`w-4 h-4 ${data.accent}`} />
                      </div>
                      <div className="min-w-0">
                        <h4 className={`text-sm font-semibold text-white leading-snug ${isThai ? 'break-words' : ''}`}>
                          {day.title}
                        </h4>
                        <p className={`text-xs text-white/50 mt-1 leading-relaxed ${isThai ? 'leading-relaxed' : ''}`}>
                          {day.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={onClose}
              className={`
                w-full mt-4 py-3 rounded-xl text-sm font-medium text-white
                ${data.bgColor} border border-white/10
                hover:bg-white/10 active:bg-white/15 active:scale-[0.98]
                transition-all duration-150
              `}
            >
              {language === 'th' ? 'เริ่มต้นการทดลอง' : 'Start Trial'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
