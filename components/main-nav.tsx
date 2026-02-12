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
import { Menu } from "lucide-react";

export function MainNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasBuildAccess, setHasBuildAccess] = useState(false);
  const router = useRouter();

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

  return (
    <div className="relative flex items-center justify-between w-full sm:px-4 lg:px-8 min-h-16">
      {/* Logo and Hamburger */}
      <div className="flex space-x-2 min-w-0">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="md:hidden p-2 rounded focus:outline-none"
              aria-label="Toggle menu"
              suppressHydrationWarning
            >
              <Menu className="w-7 h-7 sm:w-8 sm:h-8" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full sm:w-3/4">
            <VisuallyHidden.Root>
              <SheetTitle>Menu</SheetTitle>
            </VisuallyHidden.Root>
            <nav className="flex flex-col space-y-4 pt-10">
              <Link
                href="/about"
                className="text-lg font-medium transition-colors hover:text-primary py-2 px-4 rounded-md"
                onClick={() => setMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/map"
                className="text-lg font-medium transition-colors hover:text-primary py-2 px-4 rounded-md"
                onClick={() => setMenuOpen(false)}
              >
                maps
              </Link>
              <Link
                href="/classrooms"
                className="text-lg font-medium transition-colors hover:text-primary py-2 px-4 rounded-md"
                onClick={() => setMenuOpen(false)}
              >
                Classroom
              </Link>
              <Link
                href="/teams"
                className="text-lg font-medium transition-colors hover:text-primary py-2 px-4 rounded-md"
                onClick={() => setMenuOpen(false)}
              >
                Teams
              </Link>
              <a
                href="/seeds"
                className="text-lg font-medium transition-colors hover:text-primary py-2 px-4 rounded-md cursor-pointer"
                onClick={handleSeedsClick}
              >
                Seeds
              </a>
              <Link
                href="/me"
                className="text-lg font-medium transition-colors hover:text-primary py-2 px-4 rounded-md"
                onClick={() => setMenuOpen(false)}
              >
                My Journey
              </Link>
              {hasBuildAccess && (
                <Link
                  href="/build"
                  className="text-lg font-medium transition-colors hover:text-primary py-2 px-4 rounded-md"
                  onClick={() => setMenuOpen(false)}
                >
                  Build
                </Link>
              )}
            </nav>
          </SheetContent>
        </Sheet>
        <Link href="/" className="flex items-center space-x-2 min-w-0">
          <Image
            src="/passionseed-logo.svg"
            alt="Passion Seed Logo"
            width={36}
            height={36}
            className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
          />
          <span className="font-bold text-lg sm:text-xl truncate">
            Passion Seed
          </span>
        </Link>
      </div>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center space-x-2 sm:space-x-4 lg:space-x-6 ml-auto">
        <Link
          href="/about"
          className="text-xs sm:text-sm font-medium transition-colors hover:text-primary whitespace-nowrap"
        >
          About
        </Link>
        <Link
          href="/map"
          className="text-xs sm:text-sm font-medium transition-colors hover:text-primary whitespace-nowrap"
        >
          Maps
        </Link>
        <Link
          href="/classrooms"
          className="text-xs sm:text-sm font-medium transition-colors hover:text-primary whitespace-nowrap"
        >
          Classrooms
        </Link>
        <Link
          href="/teams"
          className="text-xs sm:text-sm font-medium transition-colors hover:text-primary whitespace-nowrap"
        >
          Teams
        </Link>
        <a
          href="/seeds"
          className="text-xs sm:text-sm font-medium transition-colors hover:text-primary whitespace-nowrap cursor-pointer"
          onClick={handleSeedsClick}
        >
          Seeds
        </a>
        <Link
          href="/me"
          className="text-xs sm:text-sm font-medium transition-colors hover:text-primary whitespace-nowrap"
        >
          My Journey
        </Link>
        {hasBuildAccess && (
          <Link
            href="/build"
            className="text-xs sm:text-sm font-medium transition-colors hover:text-primary whitespace-nowrap"
          >
            Build
          </Link>
        )}
      </nav>
      {/* Mobile nav */}
      {/* The mobile nav is now handled by the Sheet component */}
    </div>
  );
}
