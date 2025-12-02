"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Sparkles, Play, Compass, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface LandingHeroProps {
  lang: "en" | "th";
}

export function LandingHero({ lang }: LandingHeroProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleGuestAccess = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      
      router.push("/me?action=direction-finder");
    } catch (error: any) {
      console.error("Guest auth error:", error);
      if (error.message?.includes("Anonymous sign-ins are disabled")) {
        toast.error("Admin: Please enable Anonymous Sign-ins in Supabase Dashboard -> Authentication -> Providers");
      } else {
        toast.error("Failed to start guest session. Please try signing up instead.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const content = {
    en: {
      headline: "Turn Daily Routine into Meaningful Activities.",
      subhead:
        "Gain direction and confidence to build a fulfilling future. Start your journey of self-discovery today.",
      ctaStart: "Direction Finder",
      ctaGuest: "Try as Guest",
      ctaParents: "For Parents",
    },
    th: {
      headline: "เปลี่ยนกิจวัตรประจำวัน ให้เป็นกิจกรรมที่มีความหมาย",
      subhead:
        "ค้นหาทิศทางและสร้างความมั่นใจเพื่ออนาคตที่เติมเต็ม เริ่มต้นการเดินทางค้นหาตัวเองได้วันนี้",
      ctaStart: "ค้นหาทิศทาง",
      ctaGuest: "ทดลองใช้งาน",
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
              {lang === "en" ? "New: Direction Finder" : "ใหม่: เครื่องมือค้นหาทิศทาง"}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-5xl"
          >
            {lang === "en" ? (
              <>
                Turn Daily Routine into <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Meaningful Activities</span>
              </>
            ) : (
              <>
                เปลี่ยนกิจวัตรประจำวัน <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">ให้เป็นกิจกรรมที่มีความหมาย</span>
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
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center"
          >
            <Button
              size="lg"
              onClick={handleGuestAccess}
              disabled={isLoading}
              className="bg-white text-black hover:bg-gray-200 text-lg h-14 px-8 rounded-full transition-all duration-300 hover:scale-105 min-w-[200px]"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Compass className="h-5 w-5 mr-2" />
                  {t.ctaStart}
                </>
              )}
            </Button>
            
            <div className="flex items-center gap-4">
               <span className="text-gray-500 text-sm">or</span>
               <Link href="/login" className="text-gray-400 hover:text-white underline underline-offset-4 text-sm transition-colors">
                 Sign in with account
               </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
    </section>
  );
}
