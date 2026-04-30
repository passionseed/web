"use client";

import { Shield, LineChart, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/language-context";

const content = {
  en: {
    eyebrow: "For Parents",
    title: "See what your child discovered.",
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
    eyebrow: "สำหรับผู้ปกครอง",
    title: "ดูว่าลูกของคุณค้นพบอะไร",
    description:
      "การเลือกคณะหรืออาชีพที่ผิดพลาดอาจทำให้ต้องเสียทั้งเวลาและอนาคตโดยใช่เหตุ PassionSeed ช่วยให้บุตรหลานของคุณได้ลองสำรวจตัวเองอย่างเป็นระบบผ่านข้อมูลจริง เพื่อให้คุณมั่นใจได้ว่าก้าวต่อไปของพวกเขาคือทางที่ใช่จริงๆ",
    features: [
      {
        icon: Shield,
        title: "พื้นที่ปลอดภัย ไร้แรงกดดัน",
        desc: "ให้น้องๆ ได้เรียนรู้ตามจังหวะของตัวเอง ไม่มีการเปรียบเทียบหรือแข่งขัน ออกแบบมาเพื่อเด็กอายุ 14-18 ปีโดยเฉพาะ",
      },
      {
        icon: LineChart,
        title: "ตัดสินใจด้วยข้อมูลจริง",
        desc: "จบคลาสจะได้รับรายงานสรุปความสนใจและระดับพลังงานในแต่ละกิจกรรม เพื่อช่วยคุณพ่อคุณแม่ประเมินความถนัดของลูกได้แม่นยำขึ้น",
      },
      {
        icon: Heart,
        title: "อิงตามหลักอิคิไก (Ikigai)",
        desc: "ค้นหาสิ่งที่ลูกรัก สิ่งที่ถนัด สิ่งที่สังคมต้องการ และโอกาสสร้างรายได้ในอนาคต",
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
      className="py-32 bg-[#0a0a0a] relative overflow-hidden border-t border-white/[0.03]"
    >
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-blue-950/10 rounded-full blur-[100px]" />
      </div>

      <div className="container px-4 md:px-6 relative z-10 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-medium text-blue-400 tracking-widest uppercase mb-4">
            {t.eyebrow}
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.05]">
            {t.title}
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed font-medium">
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
              className="ei-card group p-8 border border-white/[0.06] bg-white/[0.02]"
            >
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 w-fit mb-5 group-hover:scale-110 transition-transform duration-500">
                <feature.icon className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed font-medium">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
