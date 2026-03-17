"use client";

import Link from "next/link";
import Image from "next/image";
import { LandingHero } from "@/components/landing-hero";
import { LandingHackathonBanner } from "@/components/landing-hackathon-banner";
import { LandingLogos } from "@/components/landing-logos";
import { LandingFeatures } from "@/components/landing-features";
import { LandingExpertCta } from "@/components/landing-expert-cta";
import { LandingParents } from "@/components/landing-parents";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";
import { MainNav } from "@/components/main-nav";
import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

interface LandingPageWrapperProps {
  children?: React.ReactNode;
}

export function LandingPageWrapper({ children }: LandingPageWrapperProps) {
  const { language, setLanguage } = useLanguage();
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(64);
  const headerRef = useRef<HTMLElement | null>(null);
  const bannerHeight = Math.max(0, headerHeight - 64);
  const [user, setUser] = useState<User | null>(null);

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "th" : "en");
  };

  // Check for authenticated user
  useEffect(() => {
    async function getUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch {
        // Supabase unreachable — stay as logged-out state
      }
    }
    getUser();
  }, []);

  // Mobile: trigger dawn animations when elements scroll into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("in-view");
      }),
      { threshold: 0.5 }
    );
    document.querySelectorAll(".ei-card, .ei-button-dusk").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateHeaderHeight = () => {
      setHeaderHeight(header.getBoundingClientRect().height);
    };

    updateHeaderHeight();

    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(header);

    window.addEventListener("resize", updateHeaderHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeaderHeight);
    };
  }, [isBannerVisible, language]);

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#2d1449] to-[#4a1d6b] font-sans antialiased relative overflow-hidden"
      style={{
        ["--landing-header-offset" as string]: `${bannerHeight}px`,
      }}
    >
      {/* Gradient overlay for smooth transition */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-[#0d0d0d]/50" />

      {/* Fixed header: nav + banner stuck under it */}
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 flex flex-col"
      >
        <nav className="border-b border-white/[0.04] bg-[#1a0a2e]/80 backdrop-blur-md">
          <div className="container px-4 h-16 flex items-center max-w-7xl mx-auto">
            {/* Main navigation with logo and menu */}
            <MainNav isAuthenticated={!!user} />

            {/* Right side: Language + Sign In / User Nav */}
            <div className="ml-auto flex items-center gap-3">
              {/* Language toggle */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 text-gray-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12]"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="w-5">{language === "en" ? "TH" : "EN"}</span>
              </button>

              {/* Show UserNav if logged in, otherwise Sign In button */}
              {user ? (
                <UserNav user={user} />
              ) : (
                <Button
                  asChild
                  className="bg-white text-black hover:bg-gray-100 font-semibold rounded-full px-5 h-9 text-sm"
                >
                  <Link href="/login">Sign In</Link>
                </Button>
              )}
            </div>
          </div>
        </nav>
        {isBannerVisible ? (
          <LandingHackathonBanner
            onClose={() => setIsBannerVisible(false)}
          />
        ) : null}
      </header>

      <main className="flex flex-col" style={{ paddingTop: bannerHeight }}>
        <LandingHero />
        <LandingLogos />
        <LandingFeatures />
        <LandingExpertCta />
        {children}
        <LandingParents />
      </main>
    </div>
  );
}
