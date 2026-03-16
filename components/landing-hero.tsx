"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/language-context";
import { HeroBackground } from "@/components/hero-background";
import { LandingDemoPaths } from "@/components/landing-demo-paths";

const content = {
  en: {
    eyebrow: "Career exploration, reimagined",
    headline: "Try a career before you choose one.",
    subheadline:
      "5-day real-world challenges designed by working professionals. Free for students.",
    cta: "Start exploring",
  },
  th: {
    eyebrow: "โอกาสที่คุณต้องลองค้นหา",
    headline: "ลองทำงานจริง ก่อนเลือกอนาคต",
    subheadline:
      "ภารกิจ 5 วัน ออกแบบโดยผู้เชี่ยวชาญจากสายงานจริง ฟรีสำหรับนักเรียน",
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
            : "System is not ready. Please try again later.",
        );
      } else {
        toast.error(
          language === "th"
            ? "ไม่สามารถเริ่มได้ กรุณาสมัครสมาชิกแทน"
            : "Failed to start. Please try signing up instead.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const t = content[language];

  return (
    <section className="relative w-full min-h-[calc(100vh-var(--landing-header-offset,6.5rem))] flex flex-col items-center justify-center overflow-hidden">
      {/* Animated background with sunrise gradient */}
      <HeroBackground />

      {/* Main content container */}
      <div className="relative z-10 px-6 w-full max-w-7xl mx-auto">
        {/* Mobile: Text first, then demo paths */}
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
          {/* Text content */}
          <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
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
              transition={{
                duration: 0.7,
                delay: 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight max-w-xl drop-shadow-[0_2px_30px_rgba(255,107,74,0.3)]"
            >
              {t.headline.split("\n")[0]}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.15,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-6 text-base sm:text-lg md:text-xl text-amber-100/80 max-w-md font-medium leading-relaxed"
            >
              {t.subheadline}
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.25,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-8 w-full sm:w-auto"
            >
              <button
                onClick={handleGuestAccess}
                disabled={isLoading}
                className="ei-button-dusk w-full sm:w-auto justify-center"
                style={{
                  fontSize: "1.125rem",
                  padding: "1rem 2.5rem",
                  borderRadius: "14px",
                }}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {t.cta}
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </>
                )}
              </button>
            </motion.div>

            {/* Mobile demo paths - shown below text on mobile */}
            <div className="lg:hidden w-full max-w-sm mt-8">
              <LandingDemoPaths />
            </div>
          </div>

          {/* Desktop demo paths - shown on right side */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <LandingDemoPaths />
          </div>
        </div>

        {/* Social proof / trust indicator - Thai universities */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 lg:mt-16 flex flex-col items-center gap-4"
        >
          <p className="text-xs sm:text-sm text-amber-200/50 font-medium">
            {language === "th"
              ? "นักเรียนจากมหาวิทยาลัยชั้นนำ"
              : "Students from top universities"}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 opacity-70">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 grayscale hover:grayscale-0 transition-all duration-300">
              <Image
                src="/universities/chula-logo.png"
                alt="Chulalongkorn University"
                fill
                className="object-contain"
              />
            </div>
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 grayscale hover:grayscale-0 transition-all duration-300">
              <Image
                src="/universities/tu-logo.png"
                alt="Thammasat University"
                fill
                className="object-contain"
              />
            </div>
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 grayscale hover:grayscale-0 transition-all duration-300">
              <Image
                src="/universities/KU-logo.jpg"
                alt="Kasetsart University"
                fill
                className="object-contain"
              />
            </div>
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 grayscale hover:grayscale-0 transition-all duration-300">
              <Image
                src="/universities/kmutt-logo.png"
                alt="KMUTT"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator - desktop only */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:block"
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
