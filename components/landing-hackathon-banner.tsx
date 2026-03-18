"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

const content = {
  en: {
    label: "Hackathon",
    // Mobile: single line
    mobileText: "Build skills to stay ahead of AI in healthcare.",
    // Desktop: two lines
    line1: "Skills to stay ahead of AI in the next decade —",
    line2: "tackle healthcare with predictive & preventive impact.",
    cta: "Join",
    aria: "The Next Decade Hackathon: Build skills to stay ahead of AI and tackle predictive and preventive healthcare",
  },
  th: {
    label: "Hackathon",
    // Mobile: single line
    mobileText: "แก้ปัญหาสังคม ฝึกใช้ AI แบบมือโปร",
    // Desktop: two lines
    line1: "แก้ปัญหาสังคม ฝึกใช้ AI แบบมือโปร —",
    line2: "ลงมือสร้างผลกระทบจริง",
    cta: "ร่วมงาน",
    aria: "แฮกกาธอน: แก้ปัญหาสังคม ฝึกใช้ AI แบบมือโปร",
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
        className={`group flex w-full items-center gap-3 px-4 py-2.5 pr-12 transition-colors hover:from-amber-900/60 hover:via-orange-900/50 hover:to-amber-900/60 ${language === "th" ? "font-bai-jamjuree" : ""}`}
        aria-label={t.aria}
      >
        {/* Logo - left side */}
        <Image
          src="/hackathon/HackLogo.png"
          alt=""
          width={0}
          height={0}
          sizes="32px"
          className="h-8 w-auto flex-shrink-0"
        />
        
        {/* Content area */}
        <div className="flex-1 min-w-0">
          {/* Mobile: single line with label inline */}
          <div className="sm:hidden flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-semibold uppercase tracking-widest text-amber-400/95 ${language === "th" ? "font-bai-jamjuree" : ""}`}>
              {t.label}
            </span>
            <span className={`text-sm text-white/95 ${language === "th" ? "font-bai-jamjuree" : ""}`}>
              {t.mobileText}
            </span>
          </div>
          
          {/* Desktop: two lines */}
          <div className="hidden sm:block">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className={`text-[11px] font-semibold uppercase tracking-widest text-amber-400/95 ${language === "th" ? "font-bai-jamjuree" : ""}`}>
                {t.label}
              </span>
              <span className={`text-sm text-white/95 ${language === "th" ? "font-bai-jamjuree" : ""}`}>{t.line1}</span>
              <span className={`text-sm text-white/95 ${language === "th" ? "font-bai-jamjuree" : ""}`}>{t.line2}</span>
            </div>
          </div>
        </div>
        
        {/* CTA */}
        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold text-amber-300 transition-transform group-hover:translate-x-0.5 sm:text-sm flex-shrink-0 ${language === "th" ? "font-bai-jamjuree" : ""}`}>
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
