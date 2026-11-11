"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Menu, X } from "lucide-react";

import { ShiftApplyButton } from "@/components/shift/ShiftApplyButton";
import { T, tint } from "@/components/home/homeTheme";
import { UserNav } from "@/components/user-nav";
import { SITE_NAV_LINKS } from "@/lib/content/home";
import { createClient } from "@/utils/supabase/client";

/** Past this scroll depth the bar gets its ink backing so links stay legible. */
const SOLID_AFTER_PX = 24;

function useSignedInUser() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUser(data.user))
      .catch(() => {});
  }, []);
  return user;
}

function useScrolledPast(px: number) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > px);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [px]);
  return scrolled;
}

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <Image src="/passion-seed-logo.png" alt="" width={32} height={32} unoptimized />
      <span className="font-kodchasan text-lg font-bold tracking-tight" style={{ color: T.text }}>
        PassionSeed
      </span>
    </Link>
  );
}

function AccountLink({ user }: { user: User | null }) {
  if (user) return <UserNav user={user} />;
  return (
    <Link
      href="/login"
      className="text-sm font-semibold transition-opacity hover:opacity-100"
      style={{ color: T.text, opacity: 0.75 }}
    >
      เข้าสู่ระบบ
    </Link>
  );
}

function MobileMenu({ user, onClose }: { user: User | null; onClose: () => void }) {
  return (
    <div
      className="border-t px-5 pb-8 pt-4 md:hidden"
      style={{ backgroundColor: T.bg, borderColor: tint("1f") }}
    >
      <ul className="flex flex-col">
        {SITE_NAV_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={onClose}
              className="block border-b py-4 font-kodchasan text-lg font-semibold"
              style={{ borderColor: tint("1f"), color: T.text }}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center justify-between gap-4">
        <AccountLink user={user} />
        <ShiftApplyButton href="/shift" location="site_nav_mobile" className="!min-h-11 !px-5 !text-sm">
          สมัคร SHIFT
        </ShiftApplyButton>
      </div>
    </div>
  );
}

/**
 * Public-site navbar in the space palette. Transparent over the hero, backed
 * with the page colour once the page scrolls.
 */
export function SiteNav() {
  const user = useSignedInUser();
  const scrolled = useScrolledPast(SOLID_AFTER_PX);
  const [open, setOpen] = useState(false);
  const solid = scrolled || open;

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md transition-colors duration-300"
      style={{
        backgroundColor: solid ? T.bar : "transparent",
        borderColor: solid ? tint("1f") : "transparent",
      }}
    >
      <nav className="mx-auto flex h-16 max-w-[74rem] items-center justify-between gap-6 px-5 sm:px-8">
        <Wordmark />

        <ul className="hidden items-center gap-7 md:flex">
          {SITE_NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm font-semibold transition-colors hover:text-[#7fe3ff]"
                style={{ color: tint("d9") }}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-5 md:flex">
          <AccountLink user={user} />
          <ShiftApplyButton href="/shift" location="site_nav" className="!min-h-10 !px-5 !text-sm">
            สมัคร SHIFT
          </ShiftApplyButton>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="-mr-2 p-2 md:hidden"
          style={{ color: T.text }}
          aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && <MobileMenu user={user} onClose={() => setOpen(false)} />}
    </header>
  );
}
