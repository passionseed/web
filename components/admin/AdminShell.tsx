"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ChevronRight, Menu, Sprout } from "lucide-react";
import { AdminNav } from "./AdminNav";
import { getActiveAdminItem } from "./admin-navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/admin"
      className="admin-brand"
      aria-label="PassionSeed admin overview"
      onClick={onNavigate}
    >
      <span className="admin-brand-mark">
        <Sprout size={23} strokeWidth={1.5} />
      </span>
      <span>
        PassionSeed<span className="admin-brand-caption">ADMIN WORKSPACE</span>
      </span>
    </Link>
  );
}

export function AdminShell({
  children,
  accountMenu,
}: {
  children: ReactNode;
  accountMenu: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const active = getActiveAdminItem(pathname);

  return (
    <div className="admin-workspace dusk-theme dark">
      <a href="#admin-content" className="admin-skip-link">
        Skip to content
      </a>
      <aside className="admin-sidebar">
        <Brand />
        <AdminNav />
        <Link href="/" className="admin-back-link">
          Back to website <ArrowUpRight size={16} />
        </Link>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open admin navigation"
                  className="admin-menu-button lg:hidden"
                >
                  <Menu size={20} />
                </button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="admin-mobile-nav dark w-[min(320px,90vw)] p-0"
              >
                <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                <SheetDescription className="sr-only">
                  Find and open an admin tool.
                </SheetDescription>
                <Brand onNavigate={() => setMenuOpen(false)} />
                <AdminNav onNavigate={() => setMenuOpen(false)} />
                <Link
                  href="/"
                  className="admin-back-link"
                  onClick={() => setMenuOpen(false)}
                >
                  Back to website <ArrowUpRight size={16} />
                </Link>
              </SheetContent>
            </Sheet>
            <Link
              href="/admin"
              className="text-muted-foreground hover:text-foreground"
            >
              Admin
            </Link>
            <ChevronRight
              size={14}
              className="text-muted-foreground"
              aria-hidden="true"
            />
            <span className="truncate">{active?.label ?? "Workspace"}</span>
          </div>
          <div className="admin-account-menu">{accountMenu}</div>
        </header>
        <div id="admin-content" tabIndex={-1} className="admin-content">
          {children}
        </div>
      </div>
    </div>
  );
}
