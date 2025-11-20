"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useId } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export function MainNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const sheetId = useId();

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
              aria-controls={sheetId}
            >
              <Menu className="w-7 h-7 sm:w-8 sm:h-8" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full sm:w-3/4" id={sheetId}>
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
              <Link
                href="/me"
                className="text-lg font-medium transition-colors hover:text-primary py-2 px-4 rounded-md"
                onClick={() => setMenuOpen(false)}
              >
                My Journey
              </Link>
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
        <Link
          href="/me"
          className="text-xs sm:text-sm font-medium transition-colors hover:text-primary whitespace-nowrap"
        >
          My Journey
        </Link>
      </nav>
      {/* Mobile nav */}
      {/* The mobile nav is now handled by the Sheet component */}
    </div>
  );
}
