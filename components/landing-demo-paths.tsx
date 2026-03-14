"use client";

import { Stethoscope, Bot, Rocket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

export interface DemoPath {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface PathContent {
  title: string;
  byline: string;
  days: { title: string }[];
}

const pathData: Record<string, { en: PathContent; th: PathContent }> = {
  "medical-doctor": {
    en: {
      title: "Medical Doctor",
      byline: "by 3 doctors",
      days: [
        { title: "Patient Diagnosis" },
        { title: "Treatment Planning" },
        { title: "Medical Research" },
        { title: "Emergency Response" },
        { title: "Patient Communication" },
      ],
    },
    th: {
      title: "แพทย์",
      byline: "โดยแพทย์ 3 ท่าน",
      days: [
        { title: "การวินิจฉัยผู้ป่วย" },
        { title: "วางแผนการรักษา" },
        { title: "การวิจัยทางการแพทย์" },
        { title: "การตอบสนองฉุกเฉิน" },
        { title: "การสื่อสารกับผู้ป่วย" },
      ],
    },
  },
  "ai-engineer": {
    en: {
      title: "AI Engineer",
      byline: "by 3 engineers",
      days: [
        { title: "Data Exploration" },
        { title: "Model Training" },
        { title: "Prompt Engineering" },
        { title: "AI Ethics" },
        { title: "Ship a Demo" },
      ],
    },
    th: {
      title: "วิศวกร AI",
      byline: "โดยวิศวกร 3 ท่าน",
      days: [
        { title: "การสำรวจข้อมูล" },
        { title: "การเทรนโมเดล" },
        { title: "Prompt Engineering" },
        { title: "จริยธรรม AI" },
        { title: "ส่งงาน Demo" },
      ],
    },
  },
  "startup-founder": {
    en: {
      title: "Startup Founder",
      byline: "by 3 founders",
      days: [
        { title: "Problem Discovery" },
        { title: "Solution Design" },
        { title: "MVP Planning" },
        { title: "Pitch Crafting" },
        { title: "Validate with Users" },
      ],
    },
    th: {
      title: "ผู้ก่อตั้งสตาร์ทอัพ",
      byline: "โดยผู้ก่อตั้ง 3 ท่าน",
      days: [
        { title: "การค้นหาปัญหา" },
        { title: "การออกแบบโซลูชัน" },
        { title: "วางแผน MVP" },
        { title: "การสร้าง Pitch" },
        { title: "ตรวจสอบกับผู้ใช้" },
      ],
    },
  },
};

export const demoPaths: DemoPath[] = [
  { id: "medical-doctor", icon: Stethoscope, color: "text-emerald-400" },
  { id: "ai-engineer", icon: Bot, color: "text-violet-400" },
  { id: "startup-founder", icon: Rocket, color: "text-orange-400" },
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
  },
  th: {
    morePaths: "+ เส้นทางอื่นๆ ที่พร้อมให้ลอง",
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
    <div className="space-y-2">
      {/* Icon cards row */}
      <div className="flex gap-2">
        {demoPaths.map((path, index) => {
          const pathContent = getPathContent(path.id, language);
          const Icon = path.icon;

          return (
            <motion.button
              key={path.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.08 }}
              onClick={() => togglePath(path.id)}
              className={`
                flex-1 py-3 px-3 rounded-xl group transition-all duration-300
                bg-gradient-to-br from-white/[0.03] to-transparent
                hover:from-white/[0.06]
              `}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-3.5 h-3.5 ${path.color}`} />
                <span className="text-[13px] font-medium text-white/60 group-hover:text-white/80 transition-colors">
                  {pathContent.title}
                </span>
              </div>
              <p className="text-[10px] text-white/25 mt-0.5 pl-[22px]">
                {pathContent.byline}
              </p>
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
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {(() => {
              const path = demoPaths.find(p => p.id === expandedPath)!;
              const pathContent = getPathContent(path.id, language);
              const Icon = path.icon;

              return (
                <div className="py-3 px-3 rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-3.5 h-3.5 ${path.color}`} />
                    <span className="text-[13px] font-medium text-white/70">{pathContent.title}</span>
                    <span className="text-[10px] text-white/30">• {pathContent.byline}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pl-[22px]">
                    {pathContent.days.map((day, dayIndex) => (
                      <motion.span
                        key={dayIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: dayIndex * 0.03 }}
                        className="text-[11px] text-white/35"
                      >
                        {day.title}
                      </motion.span>
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
        transition={{ delay: 0.6 }}
        className="text-center text-[11px] text-white/25 pt-0.5"
      >
        {t.morePaths}
      </motion.p>
    </div>
  );
}