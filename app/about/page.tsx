"use client";

import { useEffect } from "react";
import {
  Star,
  Users,
  Target,
  TrendingUp,
  Heart,
  Lightbulb,
  ArrowRight,
  Sparkles,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/language-context";

// Translations
const translations = {
  en: {
    // Hero
    eyebrow: "About Us",
    title: "Empowering students to find their path.",
    subtitle: "We help students discover their purpose through real-world experiences, guided reflection, and meaningful connections.",
    getStarted: "Start exploring",
    exploreMaps: "Explore Learning Maps",
    
    // Vision & Mission
    visionEyebrow: "Our Vision",
    visionTitle: "A generation that lives with purpose.",
    visionDesc: "We see a future where every student wakes up excited about their path—where daily routines become meaningful steps toward a fulfilling life, not just obligations to fulfill.",
    missionEyebrow: "Our Mission",
    missionTitle: "Design your own life journey.",
    missionDesc: "We empower students to explore careers through hands-on challenges, reflect on what truly energizes them, and build a personal roadmap that reflects their unique strengths and values.",
    
    // Features
    featuresEyebrow: "How We Help",
    featuresTitle: "Tools for meaningful discovery.",
    featuresSubtitle: "Our platform provides everything students need to explore, reflect, and grow.",
    feature1Title: "Self-Discovery",
    feature1Desc: "Guided reflection tools help students uncover their passions and strengths through structured activities.",
    feature2Title: "Goal Setting",
    feature2Desc: "Transform discoveries into actionable goals with our milestone-based journey mapping system.",
    feature3Title: "Community Learning",
    feature3Desc: "Connect with peers, mentors, and educators in collaborative learning environments.",
    feature4Title: "Real-World Application",
    feature4Desc: "Bridge the gap between classroom learning and career readiness through practical projects.",
    
    // Stats
    statsEyebrow: "Our Impact",
    statsTitle: "Making a real difference.",
    statsSubtitle: "Numbers that show our growing community of purposeful learners.",
    stat1Value: "2,000+",
    stat1Label: "Students Reached",
    stat2Value: "50+",
    stat2Label: "Organizations",
    stat3Value: "89%",
    stat3Label: "Discovery Rate",
    stat4Value: "95%",
    stat4Label: "Satisfaction",
    
    // CTA
    ctaTitle: "Ready to start your journey?",
    ctaSubtitle: "Join thousands of students who have discovered their purpose and are building meaningful futures.",
    ctaButton: "Get Started Today",
    contactUs: "Contact Us",
  },
  th: {
    // Hero
    eyebrow: "เกี่ยวกับเรา",
    title: "เสริมพลังนักเรียนให้ค้นพบเส้นทางของตนเอง",
    subtitle: "เราช่วยนักเรียนค้นพบจุดประสงค์ผ่านประสบการณ์จริง การไตร่ตรอง และการเชื่อมต่อที่มีความหมาย",
    getStarted: "เริ่มสำรวจ",
    exploreMaps: "สำรวจแผนที่การเรียนรู้",
    
    // Vision & Mission
    visionEyebrow: "วิสัยทัศน์",
    visionTitle: "สร้าง generation ที่มีชีวิตอย่างมีจุดประสงค์",
    visionDesc: "เรามองเห็นอนาคตที่นักเรียนทุกคนตื่นขึ้นมาด้วยความตื่นเต้นกับเส้นทางของตน—ที่กิจวัตรประจำวันกลายเป็นก้าวที่มีความหมายสู่ชีวิตที่เติมเต็ม",
    missionEyebrow: "พันธกิจ",
    missionTitle: "ออกแบบเส้นทางชีวิตของคุณเอง",
    missionDesc: "เราเสริมพลังให้นักเรียนสำรวจอาชีพผ่านภารกิจลงมือทำ ไตร่ตรองสิ่งที่ทำให้มีพลัง และสร้างแผนที่ส่วนตัวที่สะท้อนจุดแข็งและค่านิยมของตน",
    
    // Features
    featuresEyebrow: "วิธีช่วยเหลือ",
    featuresTitle: "เครื่องมือสำหรับการค้นพบที่มีความหมาย",
    featuresSubtitle: "แพลตฟอร์มของเรามีทุกสิ่งที่นักเรียนต้องการเพื่อสำรวจ ไตร่ตรอง และเติบโต",
    feature1Title: "การค้นพบตนเอง",
    feature1Desc: "เครื่องมือไตร่ตรองที่ช่วยให้นักเรียนค้นพบความหลงใหลและจุดแข็งผ่านกิจกรรมที่มีโครงสร้าง",
    feature2Title: "การตั้งเป้าหมาย",
    feature2Desc: "เปลี่ยนการค้นพบให้เป็นเป้าหมายที่ลงมือได้ด้วยระบบแผนที่การเดินทางแบบ milestone",
    feature3Title: "การเรียนรู้แบบชุมชน",
    feature3Desc: "เชื่อมต่อกับเพื่อน พี่เลี้ยง และครูในสภาพแวดล้อมการเรียนรู้แบบร่วมมือ",
    feature4Title: "การประยุกต์ใช้จริง",
    feature4Desc: "เชื่อมช่องว่างระหว่างการเรียนในห้องเรียนและความพร้อมทางอาชีพผ่านโครงการปฏิบัติ",
    
    // Stats
    statsEyebrow: "ผลกระทบ",
    statsTitle: "สร้างความเปลี่ยนแปลงที่แท้จริง",
    statsSubtitle: "ตัวเลขที่แสดงชุมชนผู้เรียนรู้ที่มีจุดประสงค์ของเราที่เติบโตขึ้น",
    stat1Value: "2,000+",
    stat1Label: "นักเรียนที่เข้าถึง",
    stat2Value: "50+",
    stat2Label: "องค์กรพันธมิตร",
    stat3Value: "89%",
    stat3Label: "อัตราค้นพบ",
    stat4Value: "95%",
    stat4Label: "ความพึงพอใจ",
    
    // CTA
    ctaTitle: "พร้อมเริ่มต้นการเดินทางของคุณหรือยัง?",
    ctaSubtitle: "เข้าร่วมกับนักเรียนหลายพันคนที่ค้นพบจุดประสงค์และกำลังสร้างอนาคตที่มีความหมาย",
    ctaButton: "เริ่มต้นวันนี้",
    contactUs: "ติดต่อเรา",
  },
};

export default function AboutPage() {
  const { language, setLanguage } = useLanguage();
  const t = translations[language];

  // IntersectionObserver for mobile touch devices
  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        });
      },
      { threshold: 0.5 }
    );

    const elements = document.querySelectorAll(".ei-card, .ei-button-dawn");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const stats = [
    { icon: Users, value: t.stat1Value, label: t.stat1Label },
    { icon: Star, value: t.stat2Value, label: t.stat2Label },
    { icon: Target, value: t.stat3Value, label: t.stat3Label },
    { icon: TrendingUp, value: t.stat4Value, label: t.stat4Label },
  ];

  const features = [
    { icon: Lightbulb, title: t.feature1Title, description: t.feature1Desc, color: "from-orange-500/20 to-orange-500/5", iconColor: "text-orange-400", borderColor: "border-orange-500/10" },
    { icon: Target, title: t.feature2Title, description: t.feature2Desc, color: "from-purple-500/20 to-purple-500/5", iconColor: "text-purple-400", borderColor: "border-purple-500/10" },
    { icon: Users, title: t.feature3Title, description: t.feature3Desc, color: "from-blue-500/20 to-blue-500/5", iconColor: "text-blue-400", borderColor: "border-blue-500/10" },
    { icon: Sparkles, title: t.feature4Title, description: t.feature4Desc, color: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-400", borderColor: "border-amber-500/10" },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0d] font-sans antialiased">
      {/* Hero Section with Atmospheric Background */}
      <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
        {/* Base gradient - sunrise effect */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(
              180deg,
              #020617 0%,
              #0f172a 20%,
              #1e1b4b 40%,
              #312e81 60%,
              #4c1d95 75%,
              #6b21a8 85%,
              #7c3aed 95%,
              #a78bfa 100%
            )`,
          }}
        />

        {/* Animated glow orbs */}
        <motion.div
          className="absolute left-[-12%] top-[10%] h-[26rem] w-[26rem] bg-blue-400/18 rounded-full blur-3xl"
          animate={{ x: [0, 20, 0], y: [0, -10, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-[-10%] top-[18%] h-[24rem] w-[24rem] bg-purple-500/14 rounded-full blur-3xl"
          animate={{ x: [0, -18, 0], y: [0, 16, 0], scale: [1, 1.04, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-1/2 top-[58%] h-[30rem] w-[30rem] -translate-x-1/2 bg-amber-300/12 rounded-full blur-3xl"
          animate={{ y: [0, -18, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Left cloud - blue-violet mass */}
        <motion.div
          className="absolute left-0 top-[5%] w-[50%] h-[70%]"
          style={{
            background: `radial-gradient(ellipse 90% 80% at 0% 45%,
              rgba(59, 130, 246, 0.45) 0%,
              rgba(99, 102, 241, 0.25) 45%,
              transparent 80%)`,
            filter: "blur(36px)",
          }}
          animate={{ x: [0, 24, 0], y: [0, -14, 0], opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Right cloud - purple-violet mass */}
        <motion.div
          className="absolute right-0 top-[8%] w-[50%] h-[70%]"
          style={{
            background: `radial-gradient(ellipse 90% 80% at 100% 45%,
              rgba(139, 92, 246, 0.40) 0%,
              rgba(124, 58, 237, 0.22) 45%,
              transparent 80%)`,
            filter: "blur(36px)",
          }}
          animate={{ x: [0, -24, 0], y: [0, 16, 0], opacity: [0.70, 0.95, 0.70] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Radial glow from bottom center */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(
              ellipse 80% 50% at 50% 100%,
              rgba(254, 217, 92, 0.20) 0%,
              rgba(168, 85, 247, 0.12) 30%,
              transparent 70%
            )`,
          }}
        />

        {/* Top fade to deep space */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(2, 6, 23, 0.8) 0%, transparent 40%)`,
          }}
        />

        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 px-6 w-full max-w-5xl mx-auto">
          {/* Language Toggle */}
          <div className="flex justify-end mb-8">
            <button
              onClick={() => setLanguage(language === "en" ? "th" : "en")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 text-gray-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12]"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="w-5">{language === "en" ? "TH" : "EN"}</span>
            </button>
          </div>

          <div className="flex flex-col items-center text-center">
            {/* Eyebrow */}
            <motion.span
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-sm font-medium text-blue-300 tracking-wide uppercase mb-6"
              style={{ fontFamily: "var(--font-bai-jamjuree)" }}
            >
              {t.eyebrow}
            </motion.span>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight max-w-3xl drop-shadow-[0_2px_30px_rgba(99,102,241,0.3)]"
              style={{ fontFamily: "var(--font-bai-jamjuree)" }}
            >
              {t.title}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="mt-6 text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl font-medium leading-relaxed"
              style={{ fontFamily: "var(--font-bai-jamjuree)" }}
            >
              {t.subtitle}
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mt-8 flex flex-wrap justify-center gap-4"
            >
              <Link href="/login" className="ei-button-dawn">
                {t.getStarted}
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <Link
                href="/map"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white border border-white/20 hover:bg-white/10 transition-colors font-medium"
                style={{ fontFamily: "var(--font-bai-jamjuree)" }}
              >
                {t.exploreMaps}
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-5 h-8 rounded-full border-2 border-blue-400/40 flex items-start justify-center p-1.5"
          >
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-1 h-2 bg-blue-400/60 rounded-full"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Vision & Mission Section */}
      <section className="py-32 bg-[#0d0d0d] relative overflow-hidden border-t border-white/[0.03]">
        {/* Subtle ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-purple-950/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-950/10 rounded-full blur-[100px]" />
        </div>

        <div className="container px-4 md:px-6 relative z-10 max-w-5xl mx-auto">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Vision Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="ei-card group relative p-6 md:p-8 border border-blue-500/10 bg-gradient-to-br from-blue-500/20 to-blue-500/5"
            >
              <div className="flex items-start gap-4">
                <Target className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <span className="text-xs font-medium text-blue-400 tracking-widest uppercase mb-2 inline-block" style={{ fontFamily: "var(--font-bai-jamjuree)" }}>
                    {t.visionEyebrow}
                  </span>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-bai-jamjuree)" }}>
                    {t.visionTitle}
                  </h3>
                  <p className="text-gray-400 leading-relaxed text-sm md:text-base" style={{ fontFamily: "var(--font-bai-jamjuree)" }}>
                    {t.visionDesc}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Mission Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="ei-card group relative p-6 md:p-8 border border-purple-500/10 bg-gradient-to-br from-purple-500/20 to-purple-500/5"
            >
              <div className="flex items-start gap-4">
                <Heart className="h-6 w-6 text-purple-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <span className="text-xs font-medium text-purple-400 tracking-widest uppercase mb-2 inline-block" style={{ fontFamily: "var(--font-bai-jamjuree)" }}>
                    {t.missionEyebrow}
                  </span>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-bai-jamjuree)" }}>
                    {t.missionTitle}
                  </h3>
                  <p className="text-gray-400 leading-relaxed text-sm md:text-base" style={{ fontFamily: "var(--font-bai-jamjuree)" }}>
                    {t.missionDesc}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-[#0d0d0d] relative overflow-hidden border-t border-white/[0.03]">
        {/* Subtle ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-amber-950/10 rounded-full blur-[100px]" />
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
              style={{ fontFamily: "var(--font-bai-jamjuree)" }}
            >
              {t.featuresEyebrow}
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.05]"
              style={{ fontFamily: "var(--font-bai-jamjuree)" }}
            >
              {t.featuresTitle}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              viewport={{ once: true }}
              className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed"
              style={{ fontFamily: "var(--font-bai-jamjuree)" }}
            >
              {t.featuresSubtitle}
            </motion.p>
          </div>

          {/* Feature Cards */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`ei-card group relative p-6 md:p-8 border ${feature.borderColor} bg-gradient-to-br ${feature.color}`}
              >
                <div className="flex items-start gap-4">
                  <feature.icon className={`h-6 w-6 ${feature.iconColor} flex-shrink-0 mt-1`} />
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-bai-jamjuree)" }}>
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed text-sm md:text-base" style={{ fontFamily: "var(--font-bai-jamjuree)" }}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 bg-[#0d0d0d] relative overflow-hidden border-t border-white/[0.03]">
        {/* Subtle ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-950/10 rounded-full blur-[100px]" />
        </div>

        <div className="container px-4 md:px-6 relative z-10 max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <motion.span
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-xs font-medium text-emerald-400 tracking-widest uppercase mb-4 inline-block"
              style={{ fontFamily: "var(--font-bai-jamjuree)" }}
            >
              {t.statsEyebrow}
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-bold text-white mb-4 leading-[1.05]"
              style={{ fontFamily: "var(--font-bai-jamjuree)" }}
            >
              {t.statsTitle}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              viewport={{ once: true }}
              className="text-lg text-gray-400 max-w-xl mx-auto"
              style={{ fontFamily: "var(--font-bai-jamjuree)" }}
            >
              {t.statsSubtitle}
            </motion.p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="ei-card p-6 text-center border border-emerald-500/10 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5"
              >
                <stat.icon className="h-6 w-6 text-emerald-400 mx-auto mb-3" />
                <div className="text-3xl md:text-4xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-bai-jamjuree)" }}>
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400" style={{ fontFamily: "var(--font-bai-jamjuree)" }}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, #3b82f6 0%, #6366f1 25%, #8b5cf6 50%, #a855f7 75%, #7c3aed 100%)`,
          }}
        />
        
        {/* Ambient glow */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 30% 50%, rgba(254, 217, 92, 0.15) 0%, transparent 50%)`,
          }}
        />

        <div className="container px-4 md:px-6 relative z-10 max-w-4xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-bai-jamjuree)" }}
          >
            {t.ctaTitle}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8"
            style={{ fontFamily: "var(--font-bai-jamjuree)" }}
          >
            {t.ctaSubtitle}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link href="/login" className="ei-button-dawn">
              {t.ctaButton}
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white border border-white/30 hover:bg-white/10 transition-colors font-medium"
              style={{ fontFamily: "var(--font-bai-jamjuree)" }}
            >
              {t.contactUs}
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}