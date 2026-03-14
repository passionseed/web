"use client";

import { Stethoscope, Bot, Rocket, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

export interface DemoPath {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  hoverBorderColor: string;
}

interface PathContent {
  title: string;
  tagline: string;
  days: { title: string; description: string }[];
}

const pathData: Record<string, { en: PathContent; th: PathContent }> = {
  "medical-doctor": {
    en: {
      title: "Medical Doctor",
      tagline: "5 days to test if you're fit for medicine",
      days: [
        { title: "Day 1: Patient Diagnosis", description: "Analyze symptoms and create differential diagnoses for real patient cases. Learn the systematic approach doctors use to narrow down possibilities." },
        { title: "Day 2: Treatment Planning", description: "Design treatment plans considering patient history, drug interactions, and evidence-based medicine. Balance effectiveness with patient preferences." },
        { title: "Day 3: Medical Research", description: "Interpret clinical studies and apply research findings to patient care. Learn to distinguish quality evidence from noise." },
        { title: "Day 4: Emergency Response", description: "Make rapid decisions under pressure in simulated emergency scenarios. Practice the composure and quick thinking medicine demands." },
        { title: "Day 5: Patient Communication", description: "Deliver difficult news and explain complex conditions clearly. Master the human side of healthcare." },
      ],
    },
    th: {
      title: "แพทย์",
      tagline: "5 วันเพื่อทดสอบว่าคุณเหมาะกับการแพทย์ไหม",
      days: [
        { title: "วันที่ 1: การวินิจฉัยผู้ป่วย", description: "วิเคราะห์อาการและสร้างการวินิจฉัยแยกโรคจากเคสผู้ป่วยจริง เรียนรู้แนวทางเป็นระบบที่แพทย์ใช้" },
        { title: "วันที่ 2: วางแผนการรักษา", description: "ออกแบบแผนรักษาโดยพิจารณาประวัติผู้ป่วย ปฏิกิริยายา และการแพทย์ตามหลักฐาน" },
        { title: "วันที่ 3: การวิจัยทางการแพทย์", description: "ตีความการศึกษาทางคลินิกและนำผลวิจัยไปใช้กับการดูแลผู้ป่วย" },
        { title: "วันที่ 4: การตอบสนองฉุกเฉิน", description: "ตัดสินใจอย่างรวดเร็วภายใต้ความกดดันในสถานการณ์ฉุกเฉินจำลอง" },
        { title: "วันที่ 5: การสื่อสารกับผู้ป่วย", description: "สื่อสารข่าวยากและอธิบายอาการซับซ้อนอย่างเข้าใจง่าย" },
      ],
    },
  },
  "ai-engineer": {
    en: {
      title: "AI Engineer",
      tagline: "5 days to discover if you love building AI",
      days: [
        { title: "Day 1: Data Exploration", description: "Dive into real datasets and discover patterns that machines can learn from. Understand what makes data useful for AI." },
        { title: "Day 2: Model Training", description: "Train your first machine learning model. Watch it improve and learn to diagnose when things go wrong." },
        { title: "Day 3: Prompt Engineering", description: "Master the art of communicating with large language models. Learn techniques that get AI to do what you want." },
        { title: "Day 4: AI Ethics", description: "Explore bias, fairness, and the societal impact of AI. Understand the responsibility that comes with building intelligent systems." },
        { title: "Day 5: Ship a Demo", description: "Build and deploy a working AI application end-to-end. See your creation work in the real world." },
      ],
    },
    th: {
      title: "วิศวกร AI",
      tagline: "5 วันเพื่อค้นพบว่าคุณชอบสร้าง AI ไหม",
      days: [
        { title: "วันที่ 1: การสำรวจข้อมูล", description: "ดำดิ่งสู่ชุดข้อมูลจริงและค้นพบรูปแบบที่เครื่องจักรเรียนรู้ได้" },
        { title: "วันที่ 2: การเทรนโมเดล", description: "เทรนโมเดลแมชชีนเลิร์นนิงตัวแรกของคุณ ดูมันพัฒนาและเรียนรู้การวินิจฉัยเมื่อมีปัญหา" },
        { title: "วันที่ 3: Prompt Engineering", description: "เชี่ยวชาญศิลปะการสื่อสารกับโมเดลภาษาขนาดใหญ่ เรียนรู้เทคนิคที่ทำให้ AI ทำในสิ่งที่คุณต้องการ" },
        { title: "วันที่ 4: จริยธรรม AI", description: "สำรวจอคติ ความเป็นธรรม และผลกระทบทางสังคมของ AI" },
        { title: "วันที่ 5: ส่งงาน Demo", description: "สร้างและปล่อยแอปพลิเคชัน AI ที่ใช้งานได้จริงจากต้นน้ำถึงปลายน้ำ" },
      ],
    },
  },
  "startup-founder": {
    en: {
      title: "Startup Founder",
      tagline: "5 days to see if you can turn ideas into reality",
      days: [
        { title: "Day 1: Problem Discovery", description: "Identify real problems worth solving. Learn to spot opportunities others miss and validate that people actually care." },
        { title: "Day 2: Solution Design", description: "Design solutions that are simple enough to build but valuable enough to matter. Balance ambition with realism." },
        { title: "Day 3: MVP Planning", description: "Define your minimum viable product. Learn what to build first and—more importantly—what to leave out." },
        { title: "Day 4: Pitch Crafting", description: "Tell your story in a way that inspires action. Learn to communicate vision to investors, partners, and early users." },
        { title: "Day 5: Validate with Users", description: "Get real people to try your concept. Learn what works, what doesn't, and whether you're on the right track." },
      ],
    },
    th: {
      title: "ผู้ก่อตั้งสตาร์ทอัพ",
      tagline: "5 วันเพื่อดูว่าคุณสามารถเปลี่ยนไอเดียเป็นความจริงได้ไหม",
      days: [
        { title: "วันที่ 1: การค้นหาปัญหา", description: "ระบุปัญหาจริงที่คุ้มค่าจะแก้ เรียนรู้การมองเห็นโอกาสที่คนอื่นพลาด" },
        { title: "วันที่ 2: การออกแบบโซลูชัน", description: "ออกแบบโซลูชันที่เรียบง่ายพอที่จะสร้างแต่มีค่าพอที่จะสำคัญ" },
        { title: "วันที่ 3: วางแผน MVP", description: "กำหนดผลิตภัณฑ์ที่ทำได้ขั้นต่ำ เรียนรู้ว่าควรสร้างอะไรก่อนและสำคัญกว่าคืออะไรที่ควรปล่อยไว้" },
        { title: "วันที่ 4: การสร้าง Pitch", description: "เล่าเรื่องราวของคุณในแบบที่สร้างแรงบันดาลใจ เรียนรู้การสื่อสารวิสัยทัศน์กับนักลงทุนและพาร์ทเนอร์" },
        { title: "วันที่ 5: ตรวจสอบกับผู้ใช้", description: "ให้คนจริงลองคอนเซ็ปต์ของคุณ เรียนรู้ว่าอะไรได้ผล อะไรไม่ได้ผล" },
      ],
    },
  },
};

export const demoPaths: DemoPath[] = [
  { id: "medical-doctor", icon: Stethoscope, color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20", hoverBorderColor: "hover:border-emerald-500/40" },
  { id: "ai-engineer", icon: Bot, color: "text-violet-400", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/20", hoverBorderColor: "hover:border-violet-500/40" },
  { id: "startup-founder", icon: Rocket, color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/20", hoverBorderColor: "hover:border-orange-500/40" },
];

export function getPathContent(pathId: string, language: "en" | "th"): PathContent {
  return pathData[pathId][language];
}

interface LandingDemoPathsProps {
  onPathClick?: (path: DemoPath) => void;
}

const content = {
  en: {
    morePaths: "+ more paths available",
    tapToExpand: "Tap to expand",
  },
  th: {
    morePaths: "+ เส้นทางอื่นๆ ที่พร้อมให้ลอง",
    tapToExpand: "แตะเพื่อดูเพิ่ม",
  },
};

export function LandingDemoPaths({ onPathClick }: LandingDemoPathsProps) {
  const { language } = useLanguage();
  const t = content[language];
  const [expandedPath, setExpandedPath] = useState<string | null>(null);

  const togglePath = (pathId: string) => {
    setExpandedPath(expandedPath === pathId ? null : pathId);
    if (expandedPath !== pathId) {
      onPathClick?.(demoPaths.find(p => p.id === pathId)!);
    }
  };

  return (
    <div className="space-y-3">
      {/* Icon cards row */}
      <div className="flex gap-3">
        {demoPaths.map((path, index) => {
          const pathContent = getPathContent(path.id, language);
          const Icon = path.icon;
          const isExpanded = expandedPath === path.id;

          return (
            <motion.button
              key={path.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
              onClick={() => togglePath(path.id)}
              className={`flex-1 p-4 rounded-xl ${path.bgColor} border ${isExpanded ? 'border-white/30' : path.borderColor} ${!isExpanded && path.hoverBorderColor} transition-all duration-300 group`}
            >
              {/* Icon */}
              <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <Icon className={`w-5 h-5 ${path.color}`} />
                </div>
                <span className="text-xs font-medium text-white/80 text-center leading-tight">
                  {pathContent.title}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Expanded content - only one at a time */}
      <AnimatePresence mode="wait">
        {expandedPath && (
          <motion.div
            key={expandedPath}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {(() => {
              const path = demoPaths.find(p => p.id === expandedPath)!;
              const pathContent = getPathContent(path.id, language);
              const Icon = path.icon;

              return (
                <div className={`p-4 rounded-xl ${path.bgColor} border ${path.borderColor}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${path.color}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">{pathContent.title}</h4>
                      <p className="text-xs text-gray-400">{pathContent.tagline}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {pathContent.days.map((day, dayIndex) => (
                      <motion.div
                        key={dayIndex}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: dayIndex * 0.05 }}
                        className="text-xs text-gray-300 flex gap-2"
                      >
                        <span className="text-gray-500">•</span>
                        <span>{day.title}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* More paths indicator */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-center text-sm text-white/60 pt-2 font-medium"
      >
        {t.morePaths}
      </motion.p>
    </div>
  );
}