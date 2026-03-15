"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

const content = {
  en: {
    label: "Hackathon",
    line1: "Skills to stay ahead of AI in the next decade —",
    line2: "tackle healthcare with predictive & preventive impact.",
    cta: "Join",
    aria: "The Next Decade Hackathon: Build skills to stay ahead of AI and tackle predictive and preventive healthcare",
  },
  th: {
    // Wordplay: ทัน = keep up / in time, แทนที่ = replace; เก่งก่อนถูกแทน = get good before you're replaced, รุกก่อนป่วย = be proactive before you're sick (รุก = proactive/offensive)
    label: "The Next Decade Hackathon",
    line1: "เรียนรู้ทักษะที่ AI แทนที่ไม่ได้ —",
    line2: "ลงมือแก้ปัญหาการแพทย์ในไทย",
    cta: "ร่วมงาน",
    aria: "แฮกกาธอน: ทักษะที่ AI แทนที่ไม่ได้ สุขภาพเชิงรุกและป้องกัน",
  },
} as const;

interface LandingHackathonBannerProps {
  onClose: () => void;
}

export function LandingHackathonBanner({
  onClose,
}: LandingHackathonBannerProps) {
  const { language } = useLanguage();
  const t = content[language];

  return (
    <div className="relative border-b border-white/[0.06] bg-gradient-to-r from-amber-950/50 via-orange-950/40 to-amber-950/50 backdrop-blur-sm">
      <Link
        href="/hackathon"
        className={`group flex min-h-10 w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-1.5 pr-12 text-center transition-colors hover:border-amber-500/25 hover:from-amber-900/60 hover:via-orange-900/50 hover:to-amber-900/60 ${language === "th" ? "font-bai-jamjuree" : ""}`}
        aria-label={t.aria}
      >
        <span className={`text-[11px] font-semibold uppercase tracking-widest text-amber-400/95 ${language === "th" ? "font-bai-jamjuree" : ""}`}>
          {t.label}
        </span>
        <span className={`text-sm text-white/95 sm:inline ${language === "th" ? "font-bai-jamjuree" : ""}`}>{t.line1}</span>
        <span className={`text-sm text-white/95 ${language === "th" ? "font-bai-jamjuree" : ""}`}>{t.line2}</span>
        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold text-amber-300 transition-transform group-hover:translate-x-0.5 sm:text-sm ${language === "th" ? "font-bai-jamjuree" : ""}`}>
          {t.cta}
          <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </span>
      </Link>

      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
        aria-label={language === "th" ? "ปิดแบนเนอร์" : "Close banner"}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
