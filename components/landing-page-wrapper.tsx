"use client";

import { Button } from "@/components/ui/button";
import { LandingHero } from "@/components/landing-hero";
import { LandingFeatures } from "@/components/landing-features";
import { LandingExpertCta } from "@/components/landing-expert-cta";
import { LandingParents } from "@/components/landing-parents";
import { useLanguage } from "@/lib/i18n/language-context";

interface LandingPageWrapperProps {
  children?: React.ReactNode;
}

export function LandingPageWrapper({ children }: LandingPageWrapperProps) {
  const { language, setLanguage } = useLanguage();

  const toggleLang = () => {
    setLanguage(language === "en" ? "th" : "en");
  };

  return (
    <div className="min-h-screen bg-background font-sans antialiased relative overflow-hidden">
      {/* Language Toggle */}
      <div className="fixed top-20 right-4 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLang}
          className="bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-primary/10 transition-all duration-300"
        >
          {language === "en" ? "🇹🇭 TH" : "🇬🇧 EN"}
        </Button>
      </div>

      <main className="flex flex-col">
        <LandingHero />
        <LandingFeatures />
        <LandingExpertCta />
        {children}
        <LandingParents />
      </main>
    </div>
  );
}