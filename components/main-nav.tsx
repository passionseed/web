"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function MainNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative flex items-center justify-between w-full sm:px-4 lg:px-8 min-h-16">
      {/* Logo and Hamburger */}
      <div className="flex items-center space-x-2 min-w-0">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="md:hidden p-2 rounded focus:outline-none"
              aria-label="Toggle menu"
            >
              <svg
                className="w-7 h-7 sm:w-8 sm:h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {menuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full sm:w-3/4">
            <nav className="flex flex-col space-y-4 pt-10">
              <Link
                href="/about"
                className="text-lg font-medium transition-colors hover:text-primary py-2 px-4 rounded-md"
                onClick={() => setMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/workshops"
                className="text-lg font-medium transition-colors hover:text-primary py-2 px-4 rounded-md"
                onClick={() => setMenuOpen(false)}
              >
                Workshops
              </Link>
              <Link
                href="/communities"
                className="text-lg font-medium transition-colors hover:text-primary py-2 px-4 rounded-md"
                onClick={() => setMenuOpen(false)}
              >
                Communities
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
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/passionseed%20copy-U720vuvkoGUvBE10yQZS4CR9iQqzTX.png"
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
          href="/workshops"
          className="text-xs sm:text-sm font-medium transition-colors hover:text-primary whitespace-nowrap"
        >
          Workshops
        </Link>
        <Link
          href="/communities"
          className="text-xs sm:text-sm font-medium transition-colors hover:text-primary whitespace-nowrap"
        >
          Communities
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
