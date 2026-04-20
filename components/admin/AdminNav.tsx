"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/maps", label: "Maps" },
  { href: "/admin/direction-finder", label: "Direction Finder" },
  { href: "/admin/hackathon", label: "Hackathon" },
  { href: "/admin/beta", label: "Beta" },
  { href: "/admin/event-tracker", label: "Event Tracker" },
  { href: "/admin/experts", label: "Experts" },
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
