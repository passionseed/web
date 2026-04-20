"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const HACKATHON_ITEMS = [
  { href: "/admin/hackathon", label: "Overview" },
  { href: "/admin/hackathon/activities", label: "Activities" },
  { href: "/admin/hackathon/participants", label: "Participants" },
  { href: "/admin/hackathon/teams", label: "Teams" },
  { href: "/admin/hackathon/team-submissions", label: "Team Submissions" },
  { href: "/admin/hackathon/questionnaire", label: "Questionnaire" },
  { href: "/admin/hackathon/analytics", label: "Analytics" },
  { href: "/admin/hackathon/mentors", label: "Mentors" },
  { href: "/admin/hackathon/email-sender", label: "Email Sender" },
  { href: "/admin/hackathon/team-finder", label: "Team Finder" },
];

export function HackathonNav() {
  const pathname = usePathname();

  return (
    <nav className="w-full overflow-x-auto pb-2">
      <ul className="flex w-max min-w-full gap-2">
        {HACKATHON_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin/hackathon"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "inline-flex h-8 items-center rounded-md border px-3 text-xs transition-colors",
                  "hover:bg-muted",
                  isActive
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground"
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
