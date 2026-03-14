"use client";

import { Stethoscope, Bot, Rocket, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
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
      { title: "Medical Doctor", experts: "3 doctors" },
      { title: "AI Engineer", experts: "3 engineers" },
      { title: "Startup Founder", experts: "3 founders" },
    ],
    more: "+12 more paths",
  },
  th: {
    paths: [
      { title: "แพทย์", experts: "แพทย์ 3 ท่าน" },
      { title: "วิศวกร AI", experts: "วิศวกร 3 ท่าน" },
      { title: "ผู้ก่อตั้งสตาร์ทอัพ", experts: "ผู้ก่อตั้ง 3 ท่าน" },
    ],
    more: "+12 เส้นทาง",
  },
};

export function LandingDemoPaths() {
  const { language } = useLanguage();
  const t = content[language];

  return (
    <div className="space-y-2">
      {paths.map((path, index) => {
        const pathContent = t.paths[index];
        const Icon = path.icon;

        return (
          <motion.button
            key={path.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            className={`
              w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl
              bg-white/[0.03] ${path.bgHover}
              border border-white/[0.06] hover:border-white/[0.12]
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
              <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
            </div>
          </motion.button>
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
