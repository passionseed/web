"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

const SHIFT_ADMIN_LINKS = [
  { href: "/admin/shift/rounds", label: "Rounds" },
  { href: "/admin/shift/applications", label: "Applications" },
  { href: "/admin/shift/interest", label: "Pre-orders" },
  { href: "/admin/shift", label: "Tracker" },
  { href: "/admin/shift/camp", label: "Interactive camp (legacy)" },
  { href: "/admin/shift/seedstack", label: "SeedStack" },
  { href: "/admin/shift/views", label: "Views" },
];

/** Staff companion lives outside the admin shell (its own SHIFT layout). */
const COMPANION_HREF = "/shift/companion/staff";

/** Mentor curriculum per round (days, missions, interview guide); also outside the admin shell. */
const CURRICULUM_HREF = "/shift/curriculum";

/** Longest link whose path is the current page or a parent of it. */
function activeHref(pathname: string): string | undefined {
  return SHIFT_ADMIN_LINKS.map((l) => l.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
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
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-background font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
      <Link
        href={CURRICULUM_HREF}
        title="Opens the mentor curriculum, outside the admin workspace"
        className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        หลักสูตร
        <span className="sr-only"> (leaves the admin workspace)</span>
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
      <Link
        href={COMPANION_HREF}
        title="Opens the staff companion app, outside the admin workspace"
        className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Companion (legacy)
        <span className="sr-only"> (leaves the admin workspace)</span>
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </nav>
  );
}
