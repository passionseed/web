"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** /admin/hackathon itself only redirects to Activities, so it has no tab. */
export const HACKATHON_ITEMS = [
  { href: "/admin/hackathon/activities", label: "Activities" },
  { href: "/admin/hackathon/participants", label: "Participants" },
  { href: "/admin/hackathon/teams", label: "Teams" },
  { href: "/admin/hackathon/team-submissions", label: "Team submissions" },
  { href: "/admin/hackathon/team-directions", label: "Team directions" },
  { href: "/admin/hackathon/learning", label: "Learning" },
  { href: "/admin/hackathon/questionnaire", label: "Questionnaire" },
  { href: "/admin/hackathon/analytics", label: "Analytics" },
  { href: "/admin/hackathon/mentors", label: "Mentors" },
  { href: "/admin/hackathon/email-sender", label: "Email sender" },
  { href: "/admin/hackathon/push-sender", label: "Push sender" },
  { href: "/admin/hackathon/team-finder", label: "Team finder" },
  { href: "/admin/hackathon/gallery", label: "Gallery" },
] as const;

/** The tab for the current page: its own path or any page under it. */
export function activeHackathonHref(pathname: string): string | undefined {
  return HACKATHON_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  )?.href;
}

export function HackathonNav() {
  const pathname = usePathname();
  const current = activeHackathonHref(pathname);

  return (
    <nav aria-label="Hackathon sections" className="w-full overflow-x-auto pb-2">
      <ul className="flex w-max min-w-full gap-2">
        {HACKATHON_ITEMS.map((item) => {
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
