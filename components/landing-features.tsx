"use client";

import { Flame, Brain, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/language-context";

const content = {
  en: {
    eyebrow: "How It Works",
    title: "Career exploration that works.",
    subtitle:
      "Three simple steps to discover your path — no personality tests, just real evidence from real actions.",
    steps: [
      {
        icon: Flame,
        number: "01",
        title: "Try Real Career Tasks",
        description:
          "Complete 5-day PathLab quests built by real professionals. Each day gives you hands-on tasks from actual careers — design, code, research, heal, build.",
        color: "from-orange-500/20 to-orange-500/5",
        iconColor: "text-orange-400",
        borderColor: "border-orange-500/10",
      },
      {
        icon: Brain,
        number: "02",
        title: "Reflect & Discover",
        description:
          "After each day, reflect on your energy, interest, and confusion. The system learns what excites you, where you excel, and what drains you.",
        color: "from-purple-500/20 to-purple-500/5",
        iconColor: "text-purple-400",
        borderColor: "border-purple-500/10",
      },
      {
        icon: FileText,
        number: "03",
        title: "Get Your Report",
        description:
          "Receive a personal direction report showing your patterns across different careers. Share it with parents, teachers, or mentors. It's a mirror, not a judge.",
        color: "from-blue-500/20 to-blue-500/5",
        iconColor: "text-blue-400",
        borderColor: "border-blue-500/10",
      },
    ],
  },
  th: {
    eyebrow: "ขั้นตอนการสำรวจ",
    title: "สำรวจอาชีพแบบเห็นภาพจริง",
    subtitle:
      "3 ขั้นตอนค้นพบทางที่ใช่ — เลิกทำแบบทดสอบแบบเดิมๆ แล้วมาเก็บ 'หลักฐานจริง' จากการลงมือทำ",
    steps: [
      {
        icon: Flame,
        number: "01",
        title: "ลงมือทำโปรเจกต์จริง",
        description:
          "ลองทำเคสจำลอง (PathLab) 5 วันที่ออกแบบโดยพี่ๆ ในสายงานจริง ได้ฝึกสกิลสำคัญในแต่ละวัน ไม่ว่าจะเป็นงานดีไซน์ เขียนโค้ด งานวิจัย หรืองานรักษา",
        color: "from-orange-500/20 to-orange-500/5",
        iconColor: "text-orange-400",
        borderColor: "border-orange-500/10",
      },
      {
        icon: Brain,
        number: "02",
        title: "สะท้อนคิดเพื่อค้นหาตัวเอง",
        description:
          "ทุกครั้งที่จบบทเรียน เราจะชวนน้องๆ มาทบทวนความรู้สึก (Reflection) ทั้งเรื่องความสนุก ความท้าทาย และความถนัด เพื่อให้ระบบช่วยวิเคราะห์ตัวตนที่ซ่อนอยู่",
        color: "from-purple-500/20 to-purple-500/5",
        iconColor: "text-purple-400",
        borderColor: "border-purple-500/10",
      },
      {
        icon: FileText,
        number: "03",
        title: "รับรายงานทิศทางชีวิต",
        description:
          "รับ Direction Report สรุปภาพรวมความถนัดจากทุกสายงานที่คุณเคยลอง เพื่อใช้คุยกับคุณพ่อคุณแม่หรือคุณครู นี่คือกระจกที่จะช่วยให้คุณมองเห็นตัวเองชัดขึ้น",
        color: "from-blue-500/20 to-blue-500/5",
        iconColor: "text-blue-400",
        borderColor: "border-blue-500/10",
      },
    ],
  },
};

export function LandingFeatures() {
  const { language } = useLanguage();
  const t = content[language];

  return (
    <section className="py-32 bg-[#0d0d0d] relative overflow-hidden border-t border-white/[0.03]">
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-purple-950/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-950/10 rounded-full blur-[100px]" />
      </div>

      <div className="container px-4 md:px-6 relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-xs font-medium text-purple-400 tracking-widest uppercase mb-4 inline-block"
          >
            {t.eyebrow}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.05]"
          >
            {t.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            viewport={{ once: true }}
            className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            {t.subtitle}
          </motion.p>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {t.steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`ei-card group relative p-6 md:p-8 border ${step.borderColor} bg-gradient-to-br ${step.color}`}
            >
              <div className="flex items-start gap-4">
                {/* Icon - inline, no box */}
                <step.icon className={`h-6 w-6 ${step.iconColor} flex-shrink-0 mt-1`} />

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono text-gray-500">
                      {step.number}
                    </span>
                    <h3 className="text-lg md:text-xl font-bold text-white">{step.title}</h3>
                  </div>
                  <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
