"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Sparkles, Play } from "lucide-react";
import { motion } from "framer-motion";

interface LandingHeroProps {
  lang: "en" | "th";
}

export function LandingHero({ lang }: LandingHeroProps) {
  const content = {
    en: {
      headline: "Discover Your True Self. Design Your Future.",
      subhead:
        "Join the multiplayer self-learning revolution. Explore your passions, connect with peers, and find your path.",
      ctaStart: "Start Your Journey",
      ctaParents: "For Parents",
    },
    th: {
      headline: "เข้าใจตัวเอง แล้วสร้างอนาคตให้ดีที่สุด",
      subhead:
        "เข้าร่วมการปฏิวัติการเรียนรู้ด้วยตนเองแบบผู้เล่นหลายคน ค้นหาความชอบ เชื่อมต่อกับเพื่อน และค้นพบเส้นทางของคุณ",
      ctaStart: "เริ่มต้นการเดินทาง",
      ctaParents: "สำหรับผู้ปกครอง",
    },
  };

  const t = content[lang];

  return (
    <section className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
      {/* Background Effects */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] animate-pulse-slow delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/10 rounded-full blur-[128px]" />
      </div>

      <div className="container relative z-10 px-4 md:px-6">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-white backdrop-blur-xl"
          >
            <Sparkles className="mr-2 h-4 w-4 text-yellow-400" />
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              {lang === "en" ? "New: Seed Camp is Live!" : "ใหม่: Seed Camp เปิดแล้ว!"}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-4xl"
          >
            {lang === "en" ? (
              <>
                Discover Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">True Self</span>.
                <br />
                Design Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-600">Future</span>.
              </>
            ) : (
              <>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">เข้าใจตัวเอง</span>
                <br />
                แล้วสร้าง
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-600">อนาคตให้ดีที่สุด</span>
              </>
            )}
          </motion.h1>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
          >
            {t.subhead}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <Button
              asChild
              size="lg"
              className="bg-white text-black hover:bg-gray-200 text-lg h-12 px-8 rounded-full transition-all duration-300 hover:scale-105"
            >
              <Link href="/login" className="flex items-center gap-2">
                <Play className="h-4 w-4 fill-current" />
                {t.ctaStart}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 text-lg h-12 px-8 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105"
            >
              <Link href="#parents">
                {t.ctaParents}
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
    </section>
  );
}
