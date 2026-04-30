"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { Quote, GraduationCap, CheckCircle2, Users, Target, School } from "lucide-react";

// Stats counter animation hook
function useCountUp(end: number, duration: number = 2, start: number = 0) {
  const [count, setCount] = useState(start);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(start + (end - start) * easeOut));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isInView, end, duration, start]);

  return { count, ref };
}

const content = {
  en: {
    eyebrow: "Real Students, Real Results",
    title: "Join 20+ students who found their path.",
    subtitle: "Every direction report tells a story of self-discovery.",
    stats: {
      students: { value: 20, suffix: "+", label: "Students guided" },
      paths: { value: 15, suffix: "+", label: "Career paths explored" },
      schools: { value: 5, suffix: "+", label: "Partner universities" },
    },
    testimonials: [
      {
        quote: "I thought I wanted to be a doctor because my parents said so. After trying the Medical PathLab, I realized I love the research side more than patient care. Now I'm aiming for biomedical research.",
        name: "Pim",
        school: "Chulalongkorn University",
        avatar: "P",
        color: "from-purple-500/20 to-purple-500/5",
      },
      {
        quote: "The 5-day UX design challenge made me realize I actually enjoy problem-solving more than drawing. I switched from fine arts to Human-Computer Interaction and never looked back.",
        name: "Ton",
        school: "Thammasat University",
        avatar: "T",
        color: "from-blue-500/20 to-blue-500/5",
      },
      {
        quote: "I was torn between engineering and business. The PathLab helped me discover product management — where I get to use both. Got an internship because I could speak both languages.",
        name: "Mint",
        school: "KMUTT",
        avatar: "M",
        color: "from-orange-500/20 to-orange-500/5",
      },
    ],
    badge: "Verified PathLab Graduate",
  },
  th: {
    eyebrow: "เสียงจากนักเรียนตัวจริง",
    title: "ร่วมกับนักเรียนกว่า 20 คนที่เจอทางที่ใช่",
    subtitle: "ทุกรีพอร์ตคือก้าวสำคัญของการค้นหาตัวเอง",
    stats: {
      students: { value: 20, suffix: "+", label: "น้องๆ ที่เราได้ดูแล" },
      paths: { value: 15, suffix: "+", label: "สายอาชีพที่ได้สำรวจ" },
      schools: { value: 5, suffix: "+", label: "มหาวิทยาลัยชั้นนำ" },
    },
    testimonials: [
      {
        quote: "ตอนแรกคิดว่าต้องเป็นหมอเพราะที่บ้านอยากให้เป็น แต่พอได้ลองทำ PathLab สายการแพทย์จริงๆ ถึงรู้ว่าเราชอบงานวิจัยมากกว่าการตรวจคนไข้ ตอนนี้เลยมุ่งเป้าไปที่วิจัยชีวการแพทย์แทนค่ะ",
        name: "พิม",
        school: "จุฬาลงกรณ์มหาวิทยาลัย",
        avatar: "พ",
        color: "from-purple-500/20 to-purple-500/5",
      },
      {
        quote: "โปรเจกต์ UX Challenge 5 วันทำให้ผมรู้ใจตัวเองว่าชอบการแก้ปัญหามากกว่าการแค่วาดรูป เลยตัดสินใจเปลี่ยนจากสาย Fine Arts มาเป็น HCI และไม่เคยหันหลังกลับไปมองเลยครับ",
        name: "ต้น",
        school: "มหาวิทยาลัยธรรมศาสตร์",
        avatar: "ต",
        color: "from-blue-500/20 to-blue-500/5",
      },
      {
        quote: "Passionseed ช่วยให้หนูเลือกระหว่างสัตวแพทย์หรือรังสีเทคนิคและอื่นๆ ถ้าไม่ได้มารู้ว่าจริงๆ แล้วคณะอักษรเรียนอะไร หนูอาจจะต้องมานั่งเสียใจทีหลังแน่ๆ เลยค่ะ",
        name: "มิ้นท์",
        school: "KMUTT",
        avatar: "ม",
        color: "from-orange-500/20 to-orange-500/5",
      },
    ],
    badge: "ศิษย์เก่า PathLab (Verified)",
  },
};

function StatCard({
  value,
  suffix,
  label,
  icon: Icon,
  delay,
}: {
  value: number;
  suffix: string;
  label: string;
  icon: React.ElementType;
  delay: number;
}) {
  const { count, ref } = useCountUp(value, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true }}
      className="ei-card flex items-center gap-4 p-6 border border-white/[0.05] bg-white/[0.02]"
    >
      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
        <Icon className="h-6 w-6 text-amber-400" />
      </div>
      <div>
        <div className="text-3xl font-bold text-white">
          <span ref={ref}>{count}</span>
          {suffix}
        </div>
        <div className="text-sm text-gray-400 font-medium">{label}</div>
      </div>
    </motion.div>
  );
}

function TestimonialCard({
  testimonial,
  index,
  badge,
}: {
  testimonial: (typeof content.en.testimonials)[0];
  index: number;
  badge: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 + 0.3 }}
      viewport={{ once: true }}
      className={`ei-card group relative p-8 border border-white/[0.06] bg-gradient-to-br ${testimonial.color} hover:border-white/[0.12] transition-all duration-500`}
    >
      {/* Quote icon */}
      <Quote className="absolute top-6 right-6 h-8 w-8 text-white/10 group-hover:text-white/20 transition-colors duration-500" />

      {/* Badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
          <span className="text-xs font-medium text-green-400">{badge}</span>
        </div>
      </div>

      {/* Quote */}
      <p className="text-gray-300 leading-relaxed mb-6 text-sm md:text-base">
        &ldquo;{testimonial.quote}&rdquo;
      </p>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
          {testimonial.avatar}
        </div>
        <div>
          <div className="font-semibold text-white text-sm">{testimonial.name}</div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <GraduationCap className="h-3 w-3" />
            {testimonial.school}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function LandingTestimonials() {
  const { language } = useLanguage();
  const t = content[language];

  return (
    <section className="py-32 bg-[#0d0d0d] relative overflow-hidden border-t border-white/[0.03]">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-950/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-amber-950/10 rounded-full blur-[120px]" />
      </div>

      <div className="container px-4 md:px-6 relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-xs font-medium text-amber-400 tracking-widest uppercase mb-4 inline-block"
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          <StatCard
            value={t.stats.students.value}
            suffix={t.stats.students.suffix}
            label={t.stats.students.label}
            icon={Users}
            delay={0}
          />
          <StatCard
            value={t.stats.paths.value}
            suffix={t.stats.paths.suffix}
            label={t.stats.paths.label}
            icon={Target}
            delay={0.1}
          />
          <StatCard
            value={t.stats.schools.value}
            suffix={t.stats.schools.suffix}
            label={t.stats.schools.label}
            icon={School}
            delay={0.2}
          />
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {t.testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={index}
              testimonial={testimonial}
              index={index}
              badge={t.badge}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
