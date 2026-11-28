"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type HackathonNavItem = { href: string; label: string };

/** The current hackathon: Elemental. /admin/hackathon redirects to its progress page. */
export const HACKATHON_ITEMS: readonly HackathonNavItem[] = [
  { href: "/admin/hackathon/elemental", label: "Progress" },
  { href: "/admin/hackathon/registrations", label: "Sign-ups and slips" },
  { href: "/admin/hackathon/leaderboard", label: "Team board" },
];

/** The 1st edition (the health hackathon, Feb to Jun 2026), kept in the admin archive. */
export const FIRST_EDITION_ITEMS: readonly HackathonNavItem[] = [
  { href: "/admin/archive/hackathon-healthcare/activities", label: "Activities" },
  { href: "/admin/archive/hackathon-healthcare/participants", label: "Participants" },
  { href: "/admin/archive/hackathon-healthcare/teams", label: "Teams" },
  { href: "/admin/archive/hackathon-healthcare/team-submissions", label: "Team submissions" },
  { href: "/admin/archive/hackathon-healthcare/team-directions", label: "Team directions" },
  { href: "/admin/archive/hackathon-healthcare/learning", label: "Learning" },
  { href: "/admin/archive/hackathon-healthcare/questionnaire", label: "Questionnaire" },
  { href: "/admin/archive/hackathon-healthcare/analytics", label: "Analytics" },
  { href: "/admin/archive/hackathon-healthcare/mentors", label: "Mentors" },
  { href: "/admin/archive/hackathon-healthcare/email-sender", label: "Email sender" },
  { href: "/admin/archive/hackathon-healthcare/push-sender", label: "Push sender" },
  { href: "/admin/archive/hackathon-healthcare/team-finder", label: "Team finder" },
  { href: "/admin/archive/hackathon-healthcare/gallery", label: "Gallery" },
];

/** The tab for the current page: its own path or any page under it. */
export function activeHackathonHref(
  pathname: string,
  items: readonly HackathonNavItem[] = HACKATHON_ITEMS,
): string | undefined {
  return items.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href;
}

export function HackathonNav({
  items = HACKATHON_ITEMS,
  label = "Hackathon sections",
}: {
  items?: readonly HackathonNavItem[];
  label?: string;
}) {
  const pathname = usePathname();
  const current = activeHackathonHref(pathname, items);

  return (
    <nav aria-label={label} className="w-full overflow-x-auto pb-2">
      <ul className="flex w-max min-w-full gap-2">
        {items.map((item) => {
          const isActive = item.href === current;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-md border px-3 text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary bg-primary/10 font-medium text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted active:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
