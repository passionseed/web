"use client";

import { Shield, LineChart, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/language-context";

const content = {
  en: {
    title: "For Parents",
    headline: "See what your child discovered about themselves.",
    description:
      "One wrong career choice can set a family back a generation. PassionSeed gives your child a structured, evidence-based way to explore — and gives you a clear report of what they found.",
    features: [
      {
        icon: Shield,
        title: "Safe & Structured",
        desc: "No social pressure, no deadlines, no comparison. Self-paced exploration designed for ages 14–18.",
      },
      {
        icon: LineChart,
        title: "Evidence, Not Guesswork",
        desc: "After each PathLab, get a direction report showing energy levels, interest trends, and fit scores across different careers.",
      },
      {
        icon: Heart,
        title: "Built on Ikigai",
        desc: "The framework behind PassionSeed connects what your child loves, what they're good at, what the world needs, and what they can be paid for.",
      },
    ],
  },
  th: {
    title: "สำหรับผู้ปกครอง",
    headline: "ดูว่าลูกของคุณค้นพบอะไรเกี่ยวกับตัวเอง",
    description:
      "การเลือกอาชีพผิดเพียงครั้งเดียวอาจทำให้ครอบครัวถอยหลังไปหนึ่งรุ่น PassionSeed ให้ลูกของคุณมีวิธีสำรวจอย่างเป็นระบบและมีหลักฐาน — และให้คุณได้เห็นรายงานชัดเจนว่าพวกเขาค้นพบอะไร",
    features: [
      {
        icon: Shield,
        title: "ปลอดภัยและเป็นระบบ",
        desc: "ไม่มีแรงกดดันจากสังคม ไม่มีเส้นตาย ไม่มีการเปรียบเทียบ สำรวจตามจังหวะตัวเอง ออกแบบสำหรับอายุ 14–18 ปี",
      },
      {
        icon: LineChart,
        title: "หลักฐาน ไม่ใช่การเดา",
        desc: "หลังจบ PathLab แต่ละรอบ รับรายงานทิศทางที่แสดงระดับพลังงาน แนวโน้มความสนใจ และคะแนนความเหมาะสมกับอาชีพต่างๆ",
      },
      {
        icon: Heart,
        title: "สร้างบนกรอบ Ikigai",
        desc: "กรอบแนวคิดของ PassionSeed เชื่อมโยงสิ่งที่ลูกรัก สิ่งที่เก่ง สิ่งที่โลกต้องการ และสิ่งที่สร้างรายได้ เข้าด้วยกัน",
      },
    ],
  },
};

export function LandingParents() {
  const { language } = useLanguage();
  const t = content[language];

  return (
    <section
      id="parents"
      className="py-24 bg-[#050505] relative overflow-hidden"
    >
      <div className="container px-4 md:px-6 relative z-10 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block text-sm font-medium text-blue-400 mb-4">
            {t.title}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            {t.headline}
          </h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed">
            {t.description}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {t.features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="p-6 rounded-xl border border-white/10 bg-white/[0.02]"
            >
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 w-fit mb-4">
                <feature.icon className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
