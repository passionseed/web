"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { checkClientAuth } from "@/lib/supabase/auth-client";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  VisuallyHidden,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

export function MainNav({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasBuildAccess, setHasBuildAccess] = useState(false);
  const router = useRouter();
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    const checkAccess = async () => {
      const { hasRole } = await checkClientAuth("passion-seed-team");
      setHasBuildAccess(!!hasRole);
    };
    checkAccess();
  }, []);

  const handleSeedsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      const activeRoom = localStorage.getItem("activeSeedRoom");
      if (activeRoom) {
        router.push(`/seeds/room/${activeRoom}`);
      } else {
        router.push("/seeds");
      }
    }
    setMenuOpen(false);
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "th" : "en");
  };

  return (
    <div className="relative flex items-center justify-between w-full sm:px-4 lg:px-8 min-h-16">
      {/* Logo and Hamburger */}
      <div className="flex space-x-2 min-w-0">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="md:hidden p-2 rounded focus:outline-none text-gray-400 hover:text-white"
              aria-label="Toggle menu"
              suppressHydrationWarning
            >
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full sm:w-3/4 bg-[#0d0d0d] border-white/[0.06]">
            <VisuallyHidden.Root>
              <SheetTitle>Menu</SheetTitle>
            </VisuallyHidden.Root>
            <nav className="flex flex-col space-y-4 pt-10">
              {isAuthenticated && (
                <>
                  <Link
                    href="/about"
                    className="text-lg font-medium transition-colors hover:text-white py-2 px-4 rounded-md text-gray-300"
                    onClick={() => setMenuOpen(false)}
                  >
                    About
                  </Link>
                  <Link
                    href="/map"
                    className="text-lg font-medium transition-colors hover:text-white py-2 px-4 rounded-md text-gray-300"
                    onClick={() => setMenuOpen(false)}
                  >
                    Maps
                  </Link>
                  <Link
                    href="/classrooms"
                    className="text-lg font-medium transition-colors hover:text-white py-2 px-4 rounded-md text-gray-300"
                    onClick={() => setMenuOpen(false)}
                  >
                    Classroom
                  </Link>
                  <Link
                    href="/teams"
                    className="text-lg font-medium transition-colors hover:text-white py-2 px-4 rounded-md text-gray-300"
                    onClick={() => setMenuOpen(false)}
                  >
                    Teams
                  </Link>
                  <a
                    href="/seeds"
                    className="text-lg font-medium transition-colors hover:text-white py-2 px-4 rounded-md cursor-pointer text-gray-300"
                    onClick={handleSeedsClick}
                  >
                    Seeds
                  </a>
                  <Link
                    href="/me"
                    className="text-lg font-medium transition-colors hover:text-white py-2 px-4 rounded-md text-gray-300"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Journey
                  </Link>
                  {hasBuildAccess && (
                    <Link
                      href="/build"
                      className="text-lg font-medium transition-colors hover:text-white py-2 px-4 rounded-md text-gray-300"
                      onClick={() => setMenuOpen(false)}
                    >
                      Build
                    </Link>
                  )}
                  <div className="h-px bg-white/10 my-4" />
                </>
              )}
              {/* Language toggle in mobile menu */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-2 text-lg font-medium transition-colors hover:text-white py-2 px-4 rounded-md text-gray-300"
              >
                <Globe className="w-5 h-5" />
                {language === "en" ? "ภาษาไทย" : "English"}
              </button>
            </nav>
          </SheetContent>
        </Sheet>
        <Link href="/" className="flex items-center space-x-2 min-w-0">
          <Image
            src="/passionseed-logo.svg"
            alt="Passion Seed Logo"
            width={28}
            height={28}
            className="w-7 h-7 object-contain"
          />
          <span className="font-bold text-base text-white">
            Passion Seed
          </span>
        </Link>
      </div>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-1 ml-auto">
        {isAuthenticated && (
          <>
            <Link
              href="/about"
              className="text-sm font-medium transition-colors hover:text-white whitespace-nowrap px-3 py-2 text-gray-400"
            >
              About
            </Link>
            <Link
              href="/map"
              className="text-sm font-medium transition-colors hover:text-white whitespace-nowrap px-3 py-2 text-gray-400"
            >
              Maps
            </Link>
            <Link
              href="/classrooms"
              className="text-sm font-medium transition-colors hover:text-white whitespace-nowrap px-3 py-2 text-gray-400"
            >
              Classrooms
            </Link>
            <Link
              href="/teams"
              className="text-sm font-medium transition-colors hover:text-white whitespace-nowrap px-3 py-2 text-gray-400"
            >
              Teams
            </Link>
            <a
              href="/seeds"
              className="text-sm font-medium transition-colors hover:text-white whitespace-nowrap px-3 py-2 text-gray-400 cursor-pointer"
              onClick={handleSeedsClick}
            >
              Seeds
            </a>
            <Link
              href="/me"
              className="text-sm font-medium transition-colors hover:text-white whitespace-nowrap px-3 py-2 text-gray-400"
            >
              My Journey
            </Link>
            {hasBuildAccess && (
              <Link
                href="/build"
                className="text-sm font-medium transition-colors hover:text-white whitespace-nowrap px-3 py-2 text-gray-400"
              >
                Build
              </Link>
            )}
            <div className="w-px h-5 bg-white/10 mx-2" />
          </>
        )}
      </nav>
    </div>
  );
}
