"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ChevronRight,
  FlaskConical,
  Compass,
  Home,
  Megaphone,
  Users,
} from "lucide-react";

import styles from "./work.module.css";

const primaryNav = [
  { href: "/work", label: "Overview", icon: Home, exact: true },
  { href: "/work/mkt/funnel", label: "Demand", icon: Megaphone, exact: false },
  { href: "/work/mkt/segments", label: "Segments", icon: Users, exact: false },
  { href: "/work/model", label: "Model", icon: Compass, exact: false },
  { href: "/work/product", label: "Validate / PMF", icon: FlaskConical, exact: false },
] as const;

function isActivePath(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function WorkShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={`${styles.shell} dusk-theme font-bai-jamjuree`}>
      <a href="#work-main" className={styles.skipLink}>
        Skip to workspace
      </a>

      <aside className={styles.sidebar} aria-label="Work navigation">
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true">
            <Boxes className="h-4 w-4" />
          </div>
          <div>
            <p className="font-space-mono text-[10px] uppercase tracking-[0.2em] text-orange-300/70">
              PassionSeed
            </p>
            <p className="mt-1 text-sm font-semibold text-white">Work OS</p>
          </div>
        </div>

        <nav className="mt-9 space-y-1">
          {primaryNav.map((item) => {
            const active = isActivePath(pathname, item.href, item.exact);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
                {active && <ChevronRight className="ml-auto h-3.5 w-3.5" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarNote}>
          <p className="font-space-mono text-[10px] uppercase tracking-[0.16em] text-orange-200/60">
            Operating rule
          </p>
          <p className="mt-3 text-sm leading-6 text-stone-300">
            Behavior over opinions. Pass bar before test. Three cohorts before PMF.
          </p>
        </div>
      </aside>

      <div className={styles.mobileNav}>
        <div className="flex min-w-max items-center gap-1 px-4">
          {primaryNav.map((item) => {
            const active = isActivePath(pathname, item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${styles.mobileNavItem} ${active ? styles.mobileNavItemActive : ""}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <main id="work-main" className={styles.main}>
        {children}
      </main>
    </div>
  );
}
