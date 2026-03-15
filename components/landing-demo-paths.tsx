"use client";

import { Stethoscope, Bot, Rocket, ArrowRight, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

interface PathConfig {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  bgHover: string;
}

const paths: PathConfig[] = [
  { id: "medical-doctor", icon: Stethoscope, accent: "text-emerald-400", bgHover: "hover:bg-emerald-500/[0.08]" },
  { id: "ai-engineer", icon: Bot, accent: "text-violet-400", bgHover: "hover:bg-violet-500/[0.08]" },
  { id: "startup-founder", icon: Rocket, accent: "text-amber-400", bgHover: "hover:bg-amber-500/[0.08]" },
];

const content = {
  en: {
    paths: [
      { title: "Medical Doctor", experts: "3 doctors", topics: ["Patient Diagnosis", "Treatment Planning", "Medical Research", "Emergency Response", "Patient Communication"] },
      { title: "AI Engineer", experts: "3 engineers", topics: ["Data Exploration", "Model Training", "Prompt Engineering", "AI Ethics", "Ship a Demo"] },
      { title: "Startup Founder", experts: "3 founders", topics: ["Problem Discovery", "Solution Design", "MVP Planning", "Pitch Crafting", "Validate with Users"] },
    ],
    more: "+12 more paths",
  },
  th: {
    paths: [
      { title: "แพทย์", experts: "แพทย์ 3 ท่าน", topics: ["การวินิจฉัยผู้ป่วย", "วางแผนการรักษา", "การวิจัยทางการแพทย์", "การตอบสนองฉุกเฉิน", "การสื่อสารกับผู้ป่วย"] },
      { title: "วิศวกร AI", experts: "วิศวกร 3 ท่าน", topics: ["การสำรวจข้อมูล", "การเทรนโมเดล", "Prompt Engineering", "จริยธรรม AI", "ส่งงาน Demo"] },
      { title: "ผู้ก่อตั้งสตาร์ทอัพ", experts: "ผู้ก่อตั้ง 3 ท่าน", topics: ["การค้นหาปัญหา", "การออกแบบโซลูชัน", "วางแผน MVP", "การสร้าง Pitch", "ตรวจสอบกับผู้ใช้"] },
    ],
    more: "+12 เส้นทาง",
  },
};

export function LandingDemoPaths() {
  const { language } = useLanguage();
  const t = content[language];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const togglePath = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-2">
      {paths.map((path, index) => {
        const pathContent = t.paths[index];
        const Icon = path.icon;
        const isExpanded = expandedId === path.id;

        return (
          <div key={path.id} className="space-y-1">
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              onClick={() => togglePath(path.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl
                bg-white/[0.03] ${path.bgHover}
                border ${isExpanded ? 'border-white/20' : 'border-white/[0.06]'} hover:border-white/[0.12]
                transition-all duration-300 group
              `}
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                <Icon className={`w-5 h-5 ${path.accent}`} />
              </div>

              {/* Title */}
              <div className="flex-1 text-left">
                <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                  {pathContent.title}
                </span>
              </div>

              {/* Experts badge */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <span className="text-xs text-white/40">
                  {pathContent.experts}
                </span>
                <ChevronDown className={`w-4 h-4 text-white/30 group-hover:text-white/60 transition-all duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </motion.button>

            {/* Expanded topics */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex flex-wrap gap-2">
                      {pathContent.topics.map((topic, topicIndex) => (
                        <motion.span
                          key={topicIndex}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: topicIndex * 0.05 }}
                          className="px-2.5 py-1 text-[11px] text-white/50 bg-white/[0.04] rounded-lg"
                        >
                          {topic}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* More paths */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center text-xs text-white/30 pt-2"
      >
        {t.more}
      </motion.p>
    </div>
  );
}
