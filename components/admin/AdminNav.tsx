"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/maps", label: "Pathlabs" },
  { href: "/admin/direction-finder", label: "Direction Finder" },
  { href: "/admin/hackathon", label: "Hackathon" },
  { href: "/admin/beta", label: "Beta" },
  { href: "/admin/shift", label: "SHIFT" },
  { href: "/admin/event-tracker", label: "Event Tracker" },
  { href: "/admin/experts", label: "Experts" },
  { href: "/admin/dm-leads", label: "DM Leads" },
  { href: "/admin/dm-leads/insights", label: "Lead Insights" },
  { href: "/admin/dm-leads/copilot", label: "DM Copilot" },
  { href: "/admin/meta-webhooks", label: "Meta Webhooks" },
  { href: "/admin/competitions", label: "Competitions" },
  { href: "/admin/ig-comments", label: "IG Comments" },
  { href: "/admin/talent", label: "Talent" },
  { href: "/admin/trials", label: "Trials" },
  { href: "/admin/radar", label: "Radar" },
  { href: "/admin/radar-interview", label: "Radar Interview" },
  { href: "/admin/archive", label: "Archive" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="w-full overflow-x-auto pb-2">
      <ul className="flex w-max min-w-full gap-2">
        {ADMIN_NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "inline-flex h-9 items-center rounded-md border px-3 text-sm transition-colors",
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
