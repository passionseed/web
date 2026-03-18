"use client";

import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
// import { LavaFooter } from "@/components/lava-footer";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();

  // Hide navbar for profile completion pages, hackathon page, beta page, and landing page
  // Landing page has its own header in LandingPageWrapper
  // Only compute after mount to avoid hydration mismatch (pathname is null on server)
  const hideNavbar = mounted && (
    pathname === "/" ||
    pathname?.includes("finish-profile") ||
    pathname?.includes("complete-profile") ||
    pathname?.includes("hackathon") ||
    pathname?.includes("/app/beta") ||
    pathname?.startsWith("/expert-interview")
  );

  useEffect(() => {
    setMounted(true);
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

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "th" : "en");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0d0d0d]">
      {!hideNavbar && (
        <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#0d0d0d]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0d0d0d]/60">
          <div className="container px-4 flex h-16 items-center">
            <MainNav isAuthenticated={!!user} />

            <div className="ml-auto flex items-center gap-3">
              {/* Language toggle - pill style */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 text-gray-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12]"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="w-6">{language === "en" ? "TH" : "EN"}</span>
              </button>

              {user ? (
                <UserNav user={user} />
              ) : (
                <Button asChild className="bg-white text-black hover:bg-gray-100 font-semibold rounded-full px-5">
                  <a href="/login">Sign In</a>
                </Button>
              )}
            </div>
          </div>
        </header>
      )}
      <main className="flex-1">{children}</main>
      {/* <LavaFooter /> */}
    </div>
  );
}
