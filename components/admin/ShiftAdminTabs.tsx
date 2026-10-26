"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

const SHIFT_ADMIN_LINKS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/admin/shift/rounds", label: "Rounds" },
  { href: "/admin/shift/applications", label: "Applications" },
  { href: "/admin/shift/interest", label: "Pre-orders" },
  // Exact: every SHIFT admin path starts with /admin/shift/.
  { href: "/admin/shift", label: "Tracker", exact: true },
  // The default 7-day plan with Day 1 rules and refund steps, for mentors.
  { href: "/admin/shift/curriculum", label: "Mentor curriculum" },
  { href: "/admin/shift/camp", label: "Interactive camp (legacy)" },
  { href: "/admin/shift/seedstack", label: "SeedStack" },
  { href: "/admin/shift/feedback", label: "Feedback" },
  { href: "/admin/shift/alumni", label: "Alumni" },
  { href: "/admin/shift/alumni/board", label: "Alumni board" },
  { href: "/admin/shift/views", label: "Views" },
];

/**
 * Tools that live outside the admin shell. One link per destination:
 * /admin/shift/companion only redirects to the staff companion. The live
 * per-round plan sits beside the default "Mentor curriculum" tab above.
 */
const EXTERNAL_LINKS = [
  {
    href: "/shift/curriculum",
    label: "Live curriculum",
    title: "Mentor curriculum per round: days, missions, interview guide",
  },
  {
    href: "/shift/companion/staff",
    label: "Companion",
    title: "Staff companion app",
  },
];

/** 44px tall at every width, like HackathonNav. */
const TAB_CLASS =
  "inline-flex min-h-11 items-center rounded-md px-3 text-sm transition-colors";

/** Longest link whose path is the current page or a parent of it. */
function activeHref(pathname: string): string | undefined {
  return SHIFT_ADMIN_LINKS.filter(
    ({ href, exact }) => pathname === href || (!exact && pathname.startsWith(`${href}/`)),
  )
    .map((l) => l.href)
    .sort((a, b) => b.length - a.length)[0];
}

/** Switches between the SHIFT admin surfaces. */
export function ShiftAdminTabs() {
  const pathname = usePathname();
  const current = activeHref(pathname);

  return (
    <nav
      aria-label="SHIFT admin sections"
      className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-1"
    >
      {SHIFT_ADMIN_LINKS.map((link) => {
        const active = link.href === current;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              TAB_CLASS,
              active
                ? "bg-background font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground active:bg-background/60 active:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
      {EXTERNAL_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          title={`${link.title}. Opens outside the admin workspace.`}
          className={cn(
            TAB_CLASS,
            "gap-1 text-muted-foreground hover:text-foreground active:bg-background/60 active:text-foreground",
          )}
        >
          {link.label}
          <span className="sr-only"> (leaves the admin workspace)</span>
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ))}
    </nav>
  );
}
