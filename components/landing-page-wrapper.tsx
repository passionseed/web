"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LandingHero } from "@/components/landing-hero";
import { LandingFeatures } from "@/components/landing-features";
import { LandingParents } from "@/components/landing-parents";
import { WorkshopCategories } from "@/components/workshop-categories";
import { CommunitySection } from "@/components/community-section";

interface LandingPageWrapperProps {
  children?: React.ReactNode;
}

export function LandingPageWrapper({ children }: LandingPageWrapperProps) {
  const [lang, setLang] = useState<"en" | "th">("th");

  const toggleLang = () => {
    setLang((prev) => (prev === "en" ? "th" : "en"));
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
          {lang === "en" ? "🇹🇭 TH" : "🇬🇧 EN"}
        </Button>
      </div>

      <main className="flex flex-col">
        <LandingHero lang={lang} />
        <LandingFeatures lang={lang} />
        {children}
        <LandingParents lang={lang} />
        <WorkshopCategories />
        <CommunitySection />
      </main>
    </div>
  );
}
