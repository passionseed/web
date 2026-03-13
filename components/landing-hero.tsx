"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Compass, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/language-context";

const content = {
  en: {
    problemBadge: "The problem no one talks about",
    headline: "Most students choose their career",
    headlineHighlight: "based on guesswork.",
    problemText:
      "What their parents do. What sounds impressive. What they stumbled across online. There's no structured way to actually explore — and the cost of getting it wrong is years of the wrong degree, the wrong job, and real money wasted.",
    solutionIntro: "PassionSeed helps students aged 14–18",
    solutionHighlight: "discover careers by doing — not browsing.",
    solutionText:
      "Complete real-world quests tied to different careers. Our system learns what you're passionate about, where you excel, and what the market actually needs.",
    ctaExplore: "Start Exploring",
    ctaExpert: "I'm a Professional — Help Build a Path",
    ctaLogin: "Sign in",
    stat1: "5-day",
    stat1Label: "career explorations",
    stat2: "Ikigai",
    stat2Label: "framework based",
    stat3: "Free",
    stat3Label: "for students",
  },
  th: {
    problemBadge: "ปัญหาที่ไม่มีใครพูดถึง",
    headline: "นักเรียนส่วนใหญ่เลือกอาชีพ",
    headlineHighlight: "ด้วยการเดาสุ่ม",
    problemText:
      "ทำตามอาชีพพ่อแม่ เลือกตามที่ฟังดูดี หรือเจอมาโดยบังเอิญบนอินเทอร์เน็ต ไม่มีทางสำรวจอย่างเป็นระบบ — แล้วต้นทุนของการเลือกผิดคืออะไร? หลายปีกับสาขาที่ไม่ใช่ งานที่ไม่ชอบ และเงินที่เสียไป",
    solutionIntro: "PassionSeed ช่วยนักเรียนอายุ 14–18 ปี",
    solutionHighlight: "ค้นพบอาชีพด้วยการลงมือทำ ไม่ใช่แค่อ่าน",
    solutionText:
      "ทำภารกิจจริงที่เชื่อมกับอาชีพต่างๆ ระบบจะเรียนรู้ว่าคุณหลงใหลอะไร เก่งด้านไหน และตลาดต้องการอะไร",
    ctaExplore: "เริ่มสำรวจเลย",
    ctaExpert: "เป็นผู้เชี่ยวชาญ — ช่วยสร้างเส้นทางอาชีพ",
    ctaLogin: "เข้าสู่ระบบ",
    stat1: "5 วัน",
    stat1Label: "สำรวจอาชีพ",
    stat2: "Ikigai",
    stat2Label: "กรอบแนวคิดชีวิต",
    stat3: "ฟรี",
    stat3Label: "สำหรับนักเรียน",
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
    <section className="relative w-full min-h-[95vh] flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
      {/* Background */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-[128px]" />
      </div>

      <div className="container relative z-10 px-4 md:px-6 py-16">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Problem Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-4 py-1.5 text-sm font-medium text-red-400 mb-8"
          >
            {t.problemBadge}
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-tight"
          >
            {t.headline}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500">
              {t.headlineHighlight}
            </span>
          </motion.h1>

          {/* Problem Text */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mt-6 leading-relaxed"
          >
            {t.problemText}
          </motion.p>

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-24 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent my-10"
          />

          {/* Solution */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="text-xl md:text-2xl text-white font-medium"
          >
            {t.solutionIntro}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              {t.solutionHighlight}
            </span>
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-gray-400 max-w-2xl mx-auto mt-4 leading-relaxed"
          >
            {t.solutionText}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 mt-10 w-full sm:w-auto items-center"
          >
            <Button
              size="lg"
              onClick={handleGuestAccess}
              disabled={isLoading}
              className="bg-white text-black hover:bg-gray-200 text-lg h-14 px-8 rounded-full transition-all duration-300 hover:scale-105 min-w-[220px]"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Compass className="h-5 w-5 mr-2" />
                  {t.ctaExplore}
                </>
              )}
            </Button>

            <Link
              href="/login"
              className="text-gray-400 hover:text-white underline underline-offset-4 text-sm transition-colors"
            >
              {t.ctaLogin}
            </Link>
          </motion.div>

          {/* Expert CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-6"
          >
            <Link
              href="/expert-interview"
              className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 transition-colors group"
            >
              {t.ctaExpert}
              <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="grid grid-cols-3 gap-8 mt-16 pt-10 border-t border-white/10 w-full max-w-lg"
          >
            {[
              { value: t.stat1, label: t.stat1Label },
              { value: t.stat2, label: t.stat2Label },
              { value: t.stat3, label: t.stat3Label },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
    </section>
  );
}
