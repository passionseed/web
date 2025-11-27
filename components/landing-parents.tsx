"use client";

import { Shield, LineChart, Heart } from "lucide-react";
import { motion } from "framer-motion";

interface LandingParentsProps {
  lang: "en" | "th";
}

export function LandingParents({ lang }: LandingParentsProps) {
  const content = {
    en: {
      title: "For Parents: Peace of Mind",
      description: "We help your child navigate their future with confidence and clarity.",
      features: [
        {
          icon: Shield,
          title: "Safe Environment",
          desc: "A curated, positive community focused on growth and learning.",
        },
        {
          icon: LineChart,
          title: "Track Progress",
          desc: "See their journey unfold as they set goals and achieve milestones.",
        },
        {
          icon: Heart,
          title: "Future Readiness",
          desc: "Equipping them with skills and self-knowledge for the real world.",
        },
      ],
    },
    th: {
      title: "สำหรับผู้ปกครอง: ความอุ่นใจ",
      description: "เราช่วยให้บุตรหลานของคุณก้าวสู่อนาคตด้วยความมั่นใจและความชัดเจน",
      features: [
        {
          icon: Shield,
          title: "สภาพแวดล้อมที่ปลอดภัย",
          desc: "ชุมชนเชิงบวกที่คัดสรรมาเพื่อการเติบโตและการเรียนรู้",
        },
        {
          icon: LineChart,
          title: "ติดตามพัฒนาการ",
          desc: "เห็นการเดินทางของพวกเขาขณะที่ตั้งเป้าหมายและทำสำเร็จ",
        },
        {
          icon: Heart,
          title: "ความพร้อมสำหรับอนาคต",
          desc: "เตรียมทักษะและการรู้จักตนเองให้พร้อมสำหรับโลกแห่งความเป็นจริง",
        },
      ],
    },
  };

  const t = content[lang];

  return (
    <section id="parents" className="py-24 bg-[#050505] relative overflow-hidden">
      <div className="container px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              {t.title}
            </h2>
            <p className="text-xl text-gray-400 mb-8 leading-relaxed">
              {t.description}
            </p>
            <div className="space-y-6">
              {t.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <feature.icon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-gray-400">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-2xl opacity-20" />
            <div className="relative bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
              <div className="aspect-video rounded-lg bg-black/50 flex items-center justify-center border border-white/5">
                <span className="text-gray-500">Parent Dashboard Preview</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
