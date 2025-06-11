"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export function MainNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative flex items-center justify-between w-full sm:px-4 lg:px-8 min-h-16">
      {/* Logo and Hamburger */}
      <div className="flex items-center space-x-2 min-w-0">
        <button
          className="md:hidden p-2 rounded focus:outline-none"
          onClick={() => setMenuOpen((open) => !open)}
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
        </button>
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
      {menuOpen && (
        <nav className="absolute top-16 left-0 w-full bg-black/95 shadow-md flex flex-col items-center p-2 space-y-1 sm:space-y-2 md:hidden z-50 animate-fade-in">
          <Link
            href="/about"
            className="text-sm font-medium transition-colors hover:text-primary w-full text-center py-2 rounded"
            onClick={() => setMenuOpen(false)}
          >
            About
          </Link>
          <Link
            href="/workshops"
            className="text-sm font-medium transition-colors hover:text-primary w-full text-center py-2 rounded"
            onClick={() => setMenuOpen(false)}
          >
            Workshops
          </Link>
          <Link
            href="/communities"
            className="text-sm font-medium transition-colors hover:text-primary w-full text-center py-2 rounded"
            onClick={() => setMenuOpen(false)}
          >
            Communities
          </Link>
          <Link
            href="/me"
            className="text-sm font-medium transition-colors hover:text-primary w-full text-center py-2 rounded"
            onClick={() => setMenuOpen(false)}
          >
            My Journey
          </Link>
        </nav>
      )}
    </div>
  );
}
