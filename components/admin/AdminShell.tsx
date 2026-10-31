"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Menu, Sprout } from "lucide-react";

import { AdminNav } from "./AdminNav";
import { AdminBreadcrumbs } from "./console/AdminBreadcrumbs";
import { AttentionIndicator } from "./console/AttentionIndicator";
import { CommandPalette } from "./console/CommandPalette";
import { CommandPaletteTrigger } from "./console/CommandPaletteTrigger";
import { ShortcutsDialog } from "./console/ShortcutsDialog";
import { AdminLiveCountsProvider } from "./console/live-counts";
import { recordRecentPath } from "./console/recent-pages";
import { useAdminHotkeys } from "./console/useAdminHotkeys";
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

function MobileNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
        <Brand onNavigate={close} />
        <AdminNav onNavigate={close} />
        <Link href="/" className="admin-back-link" onClick={close}>
          Back to website <ArrowUpRight size={16} />
        </Link>
      </SheetContent>
    </Sheet>
  );
}

/** Palette, shortcuts dialog, hotkeys, and recent pages for the whole shell. */
function useCommandCenter(pathname: string) {
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    recordRecentPath(pathname);
  }, [pathname]);

  const openPalette = useCallback(() => {
    setShortcutsOpen(false);
    setPaletteOpen(true);
  }, []);

  useAdminHotkeys({
    onTogglePalette: () => {
      setShortcutsOpen(false);
      setPaletteOpen((open) => !open);
    },
    onShowShortcuts: () => setShortcutsOpen(true),
    onNavigate: (href) => router.push(href),
  });

  return {
    paletteOpen,
    setPaletteOpen,
    shortcutsOpen,
    setShortcutsOpen,
    openPalette,
  };
}

function AdminShellFrame({
  children,
  accountMenu,
}: {
  children: ReactNode;
  accountMenu: ReactNode;
}) {
  const pathname = usePathname() ?? "/admin";
  const {
    paletteOpen,
    setPaletteOpen,
    shortcutsOpen,
    setShortcutsOpen,
    openPalette,
  } = useCommandCenter(pathname);

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
          <div className="admin-topbar-start">
            <MobileNav />
            <AdminBreadcrumbs pathname={pathname} />
          </div>
          <div className="admin-topbar-end">
            <CommandPaletteTrigger onOpen={openPalette} />
            <AttentionIndicator />
            <div className="admin-account-menu">{accountMenu}</div>
          </div>
        </header>
        <div id="admin-content" tabIndex={-1} className="admin-content">
          {children}
        </div>
      </div>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}

export function AdminShell({
  children,
  accountMenu,
}: {
  children: ReactNode;
  accountMenu: ReactNode;
}) {
  return (
    <AdminLiveCountsProvider>
      <AdminShellFrame accountMenu={accountMenu}>{children}</AdminShellFrame>
    </AdminLiveCountsProvider>
  );
}
