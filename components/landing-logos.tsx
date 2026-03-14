"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import Image from "next/image";

// Company logos - TBD
const companiesLogos: { name: string; logo?: string }[] = [
  { name: "Google" },
  { name: "Microsoft" },
  { name: "Meta" },
  { name: "Stripe" },
  { name: "Netflix" },
  { name: "Airbnb" },
  { name: "Spotify" },
  { name: "Amazon" },
];

const universityLogos = [
  { name: "Chula", src: "/universities/chula-logo.png" },
  { name: "TU", src: "/universities/tu-logo.png" },
  { name: "KU", src: "/universities/KU-logo.jpg" },
  { name: "KMUTT", src: "/universities/kmutt-logo.png" },
  { name: "CSII", src: "/universities/csii-logo.png" },
];

// Double the array to ensure smooth infinite scrolling for 50% translation
const extendedCompanies = [...companiesLogos, ...companiesLogos, ...companiesLogos, ...companiesLogos];
const extendedUniversities = [...universityLogos, ...universityLogos, ...universityLogos, ...universityLogos];

export function LandingLogos() {
  const { language } = useLanguage();

  return (
    <div className="w-full py-24 bg-[#0d0d0d] overflow-hidden flex flex-col items-center justify-center relative z-20 border-t border-white/[0.03]">

      {/* Subtle background glow */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
         <div className="w-[600px] h-[200px] bg-purple-950/30 blur-[80px] rounded-[100%]" />
      </div>

      <div className="max-w-6xl mx-auto w-full flex flex-col gap-20 relative z-10">

        {/* Experts Section */}
        <div className="flex flex-col items-center w-full">
          <p className="text-xs font-medium text-gray-500 tracking-widest uppercase mb-10">
            {language === "th" ? "ผู้เชี่ยวชาญจากบริษัทชั้นนำ" : "Experts shaping paths from"}
          </p>

          <div className="relative flex overflow-hidden w-full group [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
            <div className="flex w-max animate-marquee space-x-16 sm:space-x-24 items-center">
              {extendedCompanies.map((company, i) => (
                <span key={`company-${i}`} className="text-lg sm:text-xl font-semibold text-gray-600 hover:text-gray-400 transition-colors duration-300">
                  {company.name}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-4">TBD</p>
        </div>

        {/* Universities Section */}
        <div className="flex flex-col items-center w-full">
          <p className="text-xs font-medium text-gray-500 tracking-widest uppercase mb-10">
            {language === "th" ? "ได้รับความไว้วางใจจากนักเรียนใน" : "Trusted by students at"}
          </p>

          <div className="relative flex overflow-hidden w-full group [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
            <div className="flex w-max animate-marquee space-x-12 sm:space-x-16 items-center [animation-direction:reverse]">
              {extendedUniversities.map((uni, i) => (
                <div key={`uni-${i}`} className="relative w-10 h-10 sm:w-12 sm:h-12 grayscale hover:grayscale-0 transition-all duration-300 flex-shrink-0">
                  <Image
                    src={uni.src}
                    alt={uni.name}
                    fill
                    className="object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}