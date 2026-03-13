"use client";

import { Flame, Brain, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/language-context";

const content = {
  en: {
    title: "How It Works",
    subtitle:
      "Career exploration that feels like a game but works like a guidance counselor.",
    steps: [
      {
        icon: Flame,
        number: "01",
        title: "Try Real Career Tasks",
        description:
          "Complete 5-day PathLab quests built by real professionals. Each day gives you hands-on tasks from actual careers — design, code, research, heal, build.",
        color: "text-orange-400",
        borderColor: "border-orange-500/20",
        bgColor: "bg-orange-500/10",
      },
      {
        icon: Brain,
        number: "02",
        title: "Reflect & Discover What Fits",
        description:
          "After each day, reflect on your energy, interest, and confusion. The system learns what excites you, where you excel, and what drains you. No personality tests — just real evidence from real actions.",
        color: "text-purple-400",
        borderColor: "border-purple-500/20",
        bgColor: "bg-purple-500/10",
      },
      {
        icon: FileText,
        number: "03",
        title: "Get Your Direction Report",
        description:
          "After exploring, receive a personal direction report showing your patterns across different careers. Share it with parents, teachers, or mentors. It's a mirror, not a judge.",
        color: "text-blue-400",
        borderColor: "border-blue-500/20",
        bgColor: "bg-blue-500/10",
      },
    ],
  },
  th: {
    title: "ทำงานอย่างไร",
    subtitle:
      "การสำรวจอาชีพที่สนุกเหมือนเกม แต่ทำงานได้เหมือนที่ปรึกษาแนะแนว",
    steps: [
      {
        icon: Flame,
        number: "01",
        title: "ลองทำงานจริงของอาชีพนั้น",
        description:
          "ทำภารกิจ PathLab 5 วัน ที่สร้างโดยผู้เชี่ยวชาญจริง แต่ละวันให้คุณลงมือทำงานจริงจากอาชีพต่างๆ — ออกแบบ เขียนโค้ด วิจัย รักษา สร้าง",
        color: "text-orange-400",
        borderColor: "border-orange-500/20",
        bgColor: "bg-orange-500/10",
      },
      {
        icon: Brain,
        number: "02",
        title: "สะท้อนคิดและค้นพบตัวเอง",
        description:
          "หลังจบแต่ละวัน สะท้อนคิดเรื่องพลังงาน ความสนใจ และความสับสนของคุณ ระบบจะเรียนรู้ว่าอะไรทำให้คุณตื่นเต้น เก่งตรงไหน และอะไรทำให้เหนื่อย ไม่มีแบบทดสอบบุคลิกภาพ — มีแต่หลักฐานจริงจากการลงมือทำ",
        color: "text-purple-400",
        borderColor: "border-purple-500/20",
        bgColor: "bg-purple-500/10",
      },
      {
        icon: FileText,
        number: "03",
        title: "รับรายงานทิศทางของคุณ",
        description:
          "หลังสำรวจเสร็จ รับรายงานทิศทางส่วนตัวที่แสดงรูปแบบของคุณจากอาชีพต่างๆ แชร์ให้พ่อแม่ ครู หรือพี่เลี้ยงได้ มันคือกระจกสะท้อน ไม่ใช่ผู้ตัดสิน",
        color: "text-blue-400",
        borderColor: "border-blue-500/20",
        bgColor: "bg-blue-500/10",
      },
    ],
  },
};

export function LandingFeatures() {
  const { language } = useLanguage();
  const t = content[language];

  return (
    <section className="py-24 bg-black relative overflow-hidden">
      <div className="container px-4 md:px-6 relative z-10 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            {t.title}
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            {t.subtitle}
          </p>
        </div>

        <div className="space-y-8">
          {t.steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`flex flex-col md:flex-row items-start gap-6 p-8 rounded-2xl border ${step.borderColor} bg-white/[0.02] hover:bg-white/[0.04] transition-colors`}
            >
              <div
                className={`flex-shrink-0 w-14 h-14 rounded-xl ${step.bgColor} flex items-center justify-center`}
              >
                <step.icon className={`h-7 w-7 ${step.color}`} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-mono text-gray-600">
                    {step.number}
                  </span>
                  <h3 className="text-xl font-bold text-white">{step.title}</h3>
                </div>
                <p className="text-gray-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
