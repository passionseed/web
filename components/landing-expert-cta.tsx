"use client";

import { ArrowRight, Clock, User, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";

const content = {
  en: {
    eyebrow: "For Professionals",
    title: "Share your career with the next generation.",
    subtitle:
      "Answer a 10-minute AI interview about your daily work. We turn it into a 5-day career exploration that students can try on the app.",
    cta: "Start the Interview",
    details: [
      {
        icon: Clock,
        text: "10 minutes of your time",
      },
      {
        icon: User,
        text: "Your name on the PathLab you help create",
      },
      {
        icon: MessageSquare,
        text: "Optionally offer mentoring sessions",
      },
    ],
    mentorNote:
      "Choose whether to offer free or paid mentoring sessions. Parents can book directly through the app.",
  },
  th: {
    eyebrow: "สำหรับผู้เชี่ยวชาญ",
    title: "แบ่งปันอาชีพของคุณให้คนรุ่นต่อไป",
    subtitle:
      "ตอบสัมภาษณ์ AI 10 นาทีเกี่ยวกับงานประจำวันของคุณ เราจะเปลี่ยนมันเป็นการสำรวจอาชีพ 5 วัน ที่นักเรียนสามารถลองทำได้บนแอป",
    cta: "เริ่มสัมภาษณ์",
    details: [
      {
        icon: Clock,
        text: "ใช้เวลาเพียง 10 นาที",
      },
      {
        icon: User,
        text: "ชื่อของคุณจะปรากฏบน PathLab ที่คุณช่วยสร้าง",
      },
      {
        icon: MessageSquare,
        text: "เลือกเปิดรับเป็นพี่เลี้ยงได้ตามต้องการ",
      },
    ],
    mentorNote:
      "เลือกว่าจะเปิดรับเป็นพี่เลี้ยงฟรีหรือมีค่าใช้จ่าย ผู้ปกครองสามารถจองได้โดยตรงผ่านแอป",
  },
};

export function LandingExpertCta() {
  const { language } = useLanguage();
  const t = content[language];

  return (
    <section className="py-32 bg-gradient-to-b from-[#0d0d0d] to-[#0a0a0a] relative overflow-hidden border-t border-white/[0.03]">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-purple-950/15 rounded-full blur-[120px]" />
      </div>

      <div className="container px-4 md:px-6 relative z-10 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <span className="inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-400 tracking-widest uppercase mb-8">
            {t.eyebrow}
          </span>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.05]">
            {t.title}
          </h2>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            {t.subtitle}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            {t.details.map((detail, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="ei-card flex flex-col items-center gap-4 p-6 border border-white/[0.05] bg-white/[0.02]"
              >
                <div className="p-3 rounded-full bg-purple-500/10 border border-purple-500/20">
                  <detail.icon className="h-5 w-5 text-purple-400" />
                </div>
                <span className="text-sm text-gray-300 text-center font-medium">
                  {detail.text}
                </span>
              </motion.div>
            ))}
          </div>

          <Link href="/expert-interview" className="ei-button-dusk" style={{ fontSize: "1.125rem", padding: "1rem 2.5rem", borderRadius: "14px" }}>
            {t.cta}
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </Link>

          <p className="text-sm text-gray-500 mt-8 max-w-md mx-auto font-medium">
            {t.mentorNote}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
