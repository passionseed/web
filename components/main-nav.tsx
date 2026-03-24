"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { checkClientAuth } from "@/lib/supabase/auth-client";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  VisuallyHidden,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Globe, X, Compass, Map, Users, BookOpen, Sprout, User, Wrench } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

const navItems = [
  { href: "/about", label: { en: "About", th: "เกี่ยวกับ" }, icon: Compass },
  { href: "/map", label: { en: "Maps", th: "แผนที่" }, icon: Map },
  { href: "/classrooms", label: { en: "Classrooms", th: "ห้องเรียน" }, icon: BookOpen },
  { href: "/teams", label: { en: "Teams", th: "ทีม" }, icon: Users },
  { href: "/seeds", label: { en: "Seeds", th: "Seeds" }, icon: Sprout },
  { href: "/me", label: { en: "My Journey", th: "เส้นทางของฉัน" }, icon: User },
];

// Easing curves from design system
const EASE_TENSION: [number, number, number, number] = [0.05, 0.7, 0.35, 0.99];
const EASE_SPRING: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

export function MainNav({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasBuildAccess, setHasBuildAccess] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();

  // Hackathon mode enabled globally for the duration of the event
  const isHackathon = true;

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

  const handleNavClick = () => {
    setMenuOpen(false);
  };

  return (
    <div className="relative flex items-center justify-between w-full sm:px-4 lg:px-8 min-h-16">
      {/* Logo and Hamburger */}
      <div className="flex space-x-2 min-w-0">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="md:hidden p-2 rounded-lg focus:outline-none text-white/60 hover:text-white hover:bg-white/[0.08] transition-all duration-200"
              aria-label="Toggle menu"
              suppressHydrationWarning
            >
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent 
            side="left" 
            className="w-[280px] sm:w-[320px] border-r border-white/[0.06] bg-gradient-to-b from-[#1a0a2e] via-[#2d1449] to-[#0d0d0d] p-0 [&>button]:hidden"
          >
            <VisuallyHidden.Root>
              <SheetTitle>Menu</SheetTitle>
            </VisuallyHidden.Root>
            
            {/* Menu Header with Close */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Image
                  src="/passionseed-logo.svg"
                  alt="Passion Seed Logo"
                  width={24}
                  height={24}
                  className="w-6 h-6 object-contain"
                />
                <span className="font-bold text-sm text-white">
                  Passion Seed
                </span>
                {isHackathon && (
                  <>
                    <div className="w-px h-4 bg-white/20 mx-1" />
                    <Image
                      src="/hackathon/HackLogo.png"
                      alt="Hackathon Logo"
                      width={24}
                      height={24}
                      className="w-6 h-6 object-contain"
                    />
                  </>
                )}
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-all duration-200"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu Content */}
            <nav className="flex flex-col p-3 gap-1">
              {isAuthenticated && (
                <>
                  {/* Welcome text */}
                  <div className="px-3 py-2 mb-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
                      {language === 'th' ? 'การนำทาง' : 'Navigation'}
                    </p>
                  </div>
                  
                  {/* Nav items with icons */}
                  {navItems
                    .filter(item => isHackathon ? !['/classrooms', '/teams'].includes(item.href) : true)
                    .map((item, index) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ 
                        delay: index * 0.05, 
                        duration: 0.3, 
                        ease: EASE_TENSION 
                      }}
                    >
                      {item.href === "/seeds" ? (
                        <a
                          href="/seeds"
                          onClick={(e) => {
                            handleSeedsClick(e);
                            handleNavClick();
                          }}
                          className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center group-hover:border-white/[0.12] group-hover:bg-white/[0.08] transition-all duration-200">
                            <item.icon className="w-4 h-4 text-amber-400" />
                          </div>
                          <span className="text-sm font-medium">
                            {item.label[language]}
                          </span>
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={handleNavClick}
                          className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center group-hover:border-white/[0.12] group-hover:bg-white/[0.08] transition-all duration-200">
                            <item.icon className="w-4 h-4 text-amber-400" />
                          </div>
                          <span className="text-sm font-medium">
                            {item.label[language]}
                          </span>
                        </Link>
                      )}
                    </motion.div>
                  ))}

                  {/* Build link for team members */}
                  {hasBuildAccess && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ 
                        delay: navItems.length * 0.05, 
                        duration: 0.3, 
                        ease: EASE_TENSION 
                      }}
                    >
                      <Link
                        href="/build"
                        onClick={handleNavClick}
                        className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center group-hover:border-white/[0.12] group-hover:bg-white/[0.08] transition-all duration-200">
                          <Wrench className="w-4 h-4 text-violet-400" />
                        </div>
                        <span className="text-sm font-medium">
                          {language === 'th' ? 'สร้าง' : 'Build'}
                        </span>
                      </Link>
                    </motion.div>
                  )}

                  <div className="h-px bg-white/[0.06] my-3" />
                </>
              )}

              {/* Language toggle */}
              <div className="px-3 py-2 mb-2">
                <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
                  {language === 'th' ? 'ภาษา' : 'Language'}
                </p>
              </div>
              <button
                onClick={toggleLanguage}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center group-hover:border-white/[0.12] group-hover:bg-white/[0.08] transition-all duration-200">
                  <Globe className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-sm font-medium">
                  {language === "en" ? "ภาษาไทย" : "English"}
                </span>
                <span className="ml-auto text-[10px] text-white/30 px-2 py-0.5 rounded-full bg-white/[0.05]">
                  {language.toUpperCase()}
                </span>
              </button>
            </nav>

            {/* Bottom glow effect - atmospheric */}
            <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-t from-amber-500/5 via-transparent to-transparent" />
            </div>
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
          <span className="font-bold text-base text-white hidden sm:block">
            Passion Seed
          </span>
          {isHackathon && (
            <>
              <div className="w-px h-5 bg-white/20 mx-1 hidden sm:block" />
              <Image
                src="/hackathon/HackLogo.png"
                alt="Hackathon Logo"
                width={28}
                height={28}
                className="w-7 h-7 object-contain"
              />
            </>
          )}
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
            {!isHackathon && (
              <>
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
              </>
            )}
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
