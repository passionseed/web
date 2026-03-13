"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/language-context";
import { HeroBackground } from "@/components/hero-background";
import { HeroVisualization } from "@/components/hero-visualization";

const content = {
  en: {
    eyebrow: "Career exploration, reimagined",
    headline: "Try a career before you choose one.",
    subheadline: "5-day real-world challenges designed by working professionals. Free for students.",
    cta: "Start exploring",
  },
  th: {
    eyebrow: "การสำรวจอาชีพในรูปแบบใหม่",
    headline: "ลองทำงานจริง ก่อนเลือกอนาคต",
    subheadline: "ภารกิจ 5 วัน ออกแบบโดยผู้เชี่ยวชาญจากสายงานจริง ฟรีสำหรับนักเรียน",
    cta: "เริ่มสำรวจ",
  },
};

export function LandingHero() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const { language } = useLanguage();

  const handleGuestAccess = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      router.push("/me/journey?action=direction-finder");
    } catch (error: any) {
      console.error("Guest auth error:", error);
      if (error.message?.includes("Anonymous sign-ins are disabled")) {
        toast.error(
          language === "th"
            ? "ระบบยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง"
            : "System is not ready. Please try again later."
        );
      } else {
        toast.error(
          language === "th"
            ? "ไม่สามารถเริ่มได้ กรุณาสมัครสมาชิกแทน"
            : "Failed to start. Please try signing up instead."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const t = content[language];

  return (
    <section className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Animated background with sunrise gradient */}
      <HeroBackground />

      {/* Living Education Galaxy - data-driven visualization */}
      <div className="absolute inset-0 w-full h-full">
        <HeroVisualization />
      </div>

      <div className="relative z-10 px-6 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
        {/* Eyebrow */}
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-sm font-medium text-orange-300 tracking-wide uppercase mb-6"
        >
          {t.eyebrow}
        </motion.span>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.05] tracking-tight max-w-4xl drop-shadow-[0_2px_30px_rgba(255,107,74,0.3)]"
        >
          {t.headline.split('\n')[0]}
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 text-lg sm:text-xl md:text-2xl text-amber-100/80 max-w-2xl font-medium leading-relaxed"
        >
          {t.subheadline}
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 w-full sm:w-auto"
        >
          <Button
            size="lg"
            onClick={handleGuestAccess}
            disabled={isLoading}
            className="group relative bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-400 hover:to-amber-400 text-base sm:text-lg h-12 sm:h-14 px-8 sm:px-10 rounded-full font-semibold transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_60px_rgba(251,191,36,0.4)] w-full sm:w-auto overflow-hidden"
          >
            {/* Subtle shine effect */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent group-hover:translate-x-full transition-transform duration-1000 ease-out" />

            <span className="relative flex items-center justify-center gap-2">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {t.cta}
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </span>
          </Button>
        </motion.div>

        {/* Social proof / trust indicator - Thai universities */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 flex flex-col items-center gap-3"
        >
          <p className="text-xs sm:text-sm text-amber-200/50 font-medium">
            {language === "th" ? "นักเรียนจากมหาวิทยาลัยชั้นนำ" : "Students from top universities"}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 opacity-60">
            <span className="text-xs sm:text-sm font-semibold text-amber-100/80">จุฬาฯ</span>
            <span className="text-xs sm:text-sm font-semibold text-amber-100/80">มหิดล</span>
            <span className="text-xs sm:text-sm font-semibold text-amber-100/80">ธรรมศาสตร์</span>
            <span className="text-xs sm:text-sm font-semibold text-amber-100/80">เกษตรศาสตร์</span>
            <span className="hidden sm:inline text-xs sm:text-sm font-semibold text-amber-100/80">เชียงใหม่</span>
            <span className="hidden sm:inline text-xs sm:text-sm font-semibold text-amber-100/80">ขอนแก่น</span>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-5 h-8 rounded-full border-2 border-amber-400/40 flex items-start justify-center p-1.5"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-1 h-2 bg-amber-400/60 rounded-full"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
