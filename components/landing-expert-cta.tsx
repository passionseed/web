"use client";

import { ArrowRight, Clock, User, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";

const content = {
  en: {
    badge: "For Professionals",
    title: "Help a teenager explore your career.",
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
    badge: "สำหรับผู้เชี่ยวชาญ",
    title: "ช่วยวัยรุ่นสำรวจอาชีพของคุณ",
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
    <section className="py-24 bg-gradient-to-b from-black to-purple-950/30 relative overflow-hidden">
      <div className="container px-4 md:px-6 relative z-10 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <span className="inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-sm font-medium text-purple-400 mb-8">
            {t.badge}
          </span>

          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            {t.title}
          </h2>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            {t.subtitle}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            {t.details.map((detail, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex flex-col items-center gap-3 p-4"
              >
                <div className="p-3 rounded-full bg-purple-500/10 border border-purple-500/20">
                  <detail.icon className="h-5 w-5 text-purple-400" />
                </div>
                <span className="text-sm text-gray-300 text-center">
                  {detail.text}
                </span>
              </motion.div>
            ))}
          </div>

          <Button
            asChild
            size="lg"
            className="bg-purple-600 hover:bg-purple-500 text-white text-lg h-14 px-10 rounded-full transition-all duration-300 hover:scale-105"
          >
            <Link href="/expert-interview" className="flex items-center gap-2">
              {t.cta}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>

          <p className="text-sm text-gray-500 mt-6 max-w-md mx-auto">
            {t.mentorNote}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
